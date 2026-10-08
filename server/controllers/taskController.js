const Task = require('../models/Task');
const { logActivity } = require('../utils/helpers');

// @desc    Get all tasks with filtering, search, sorting & pagination
// @route   GET /api/tasks
// @access  Private
exports.getTasks = async (req, res, next) => {
  try {
    const {
      status,
      priority,
      category,
      search,
      deadline,
      pinned,
      trash,
      sort,
      page = 1,
      limit = 50
    } = req.query;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 50;
    const skip = (pageNum - 1) * limitNum;

    const { tasks, total } = await Task.find({
      userId: req.user.id,
      status,
      priority,
      category,
      deadline,
      pinned,
      trash,
      search,
      sort,
      skip,
      limit: limitNum
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
      data: tasks
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single task by ID
// @route   GET /api/tasks/:id
// @access  Private
exports.getTaskById = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id, req.user.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or unauthorized'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      category,
      tags,
      dueDate,
      reminder,
      isPinned,
      subtasks
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a task title.'
      });
    }

    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    const task = await Task.create({
      title: title.trim(),
      description: description ? description.trim() : '',
      status: status || 'Pending',
      priority: priority || 'Medium',
      category: category || null,
      tags: parsedTags || [],
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      reminder: !!reminder,
      isPinned: !!isPinned,
      subtasks: Array.isArray(subtasks) ? subtasks : [],
      user: req.user.id
    });

    await logActivity(req.user.id, 'TASK_CREATED', task.title, `Created task in ${task.status} status`);

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    const {
      title,
      description,
      status,
      priority,
      category,
      tags,
      dueDate,
      reminder,
      isPinned,
      subtasks
    } = req.body;

    const existing = await Task.findById(req.params.id, req.user.id);
    if (!existing) {
      return res.status(404).json({
        success: false,
        message: 'Task not found or unauthorized'
      });
    }

    let parsedTags = tags;
    if (typeof tags === 'string') {
      parsedTags = tags
        .split(',')
        .map((t) => t.trim())
        .filter((t) => t.length > 0);
    }

    const updated = await Task.update(req.params.id, req.user.id, {
      title,
      description,
      status,
      priority,
      category,
      tags: parsedTags,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      reminder,
      isPinned,
      subtasks
    });

    await logActivity(req.user.id, 'TASK_UPDATED', updated.title, 'Updated task details');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update task status only
// @route   PATCH /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = async (req, res, next) => {
  try {
    const { status } = req.body;

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status value. Allowed: Pending, In Progress, Completed'
      });
    }

    const task = await Task.findById(req.params.id, req.user.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found.'
      });
    }

    const updated = await Task.updateStatus(req.params.id, req.user.id, status);

    const action = status === 'Completed' ? 'TASK_COMPLETED' : 'TASK_UPDATED';
    await logActivity(req.user.id, action, updated.title, `Status changed to ${status}`);

    res.status(200).json({
      success: true,
      message: `Task status updated to ${status}`,
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle task pin
// @route   PATCH /api/tasks/:id/pin
// @access  Private
exports.toggleTaskPin = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id, req.user.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    const updated = await Task.togglePin(req.params.id, req.user.id);

    await logActivity(
      req.user.id,
      updated.isPinned ? 'TASK_PINNED' : 'TASK_UNPINNED',
      updated.title,
      updated.isPinned ? 'Pinned task' : 'Unpinned task'
    );

    res.status(200).json({
      success: true,
      message: updated.isPinned ? 'Task pinned to top' : 'Task unpinned',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Move task to trash or delete permanently
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id, req.user.id);
    if (!task) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    if (task.isTrash) {
      await Task.deletePermanently(req.params.id, req.user.id);
      await logActivity(req.user.id, 'TASK_DELETED', task.title, 'Permanently deleted task');
      return res.status(200).json({
        success: true,
        message: 'Task permanently deleted.'
      });
    } else {
      await Task.moveToTrash(req.params.id, req.user.id);
      await logActivity(req.user.id, 'TASK_DELETED', task.title, 'Moved task to trash');
      return res.status(200).json({
        success: true,
        message: 'Task moved to trash. You can restore it anytime.'
      });
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Restore task from trash
// @route   PATCH /api/tasks/:id/restore
// @access  Private
exports.restoreTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id, req.user.id);
    if (!task || !task.isTrash) {
      return res.status(404).json({ success: false, message: 'Task not found in trash' });
    }

    const restored = await Task.restoreFromTrash(req.params.id, req.user.id);
    await logActivity(req.user.id, 'TASK_RESTORED', restored.title, 'Restored task from trash');

    res.status(200).json({
      success: true,
      message: 'Task restored successfully',
      data: restored
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Empty trash bin
// @route   DELETE /api/tasks/trash/empty
// @access  Private
exports.emptyTrash = async (req, res, next) => {
  try {
    await Task.emptyTrash(req.user.id);
    res.status(200).json({
      success: true,
      message: 'Emptied trash successfully.'
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk update task status
// @route   PATCH /api/tasks/bulk/status
// @access  Private
exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const { taskIds, status } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide task IDs' });
    }

    if (!['Pending', 'In Progress', 'Completed'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }

    await Task.bulkUpdateStatus(req.user.id, taskIds, status);

    res.status(200).json({
      success: true,
      message: `Updated status for ${taskIds.length} tasks.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Bulk move to trash / delete
// @route   POST /api/tasks/bulk/delete
// @access  Private
exports.bulkDelete = async (req, res, next) => {
  try {
    const { taskIds, permanent } = req.body;

    if (!Array.isArray(taskIds) || taskIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide task IDs' });
    }

    await Task.bulkDelete(req.user.id, taskIds, permanent);

    res.status(200).json({
      success: true,
      message: permanent
        ? `Permanently removed ${taskIds.length} tasks.`
        : `Moved ${taskIds.length} tasks to trash.`
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add subtask to task
// @route   POST /api/tasks/:id/subtasks
// @access  Private
exports.addSubtask = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Subtask title required' });
    }

    const subtasks = await Task.addSubtask(req.params.id, req.user.id, title);
    if (!subtasks) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(201).json({
      success: true,
      message: 'Subtask added',
      data: subtasks
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Toggle subtask completion
// @route   PATCH /api/tasks/:id/subtasks/:subtaskId
// @access  Private
exports.toggleSubtask = async (req, res, next) => {
  try {
    const subtasks = await Task.toggleSubtask(
      req.params.id,
      req.user.id,
      req.params.subtaskId
    );

    if (!subtasks) {
      return res.status(404).json({ success: false, message: 'Task or subtask not found' });
    }

    res.status(200).json({
      success: true,
      data: subtasks
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete subtask
// @route   DELETE /api/tasks/:id/subtasks/:subtaskId
// @access  Private
exports.deleteSubtask = async (req, res, next) => {
  try {
    const subtasks = await Task.deleteSubtask(
      req.params.id,
      req.user.id,
      req.params.subtaskId
    );

    if (!subtasks) {
      return res.status(404).json({ success: false, message: 'Task not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Subtask deleted',
      data: subtasks
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Export user tasks to CSV
// @route   GET /api/tasks/export/csv
// @access  Private
exports.exportCsv = async (req, res, next) => {
  try {
    const { tasks } = await Task.find({
      userId: req.user.id,
      trash: false,
      limit: 1000
    });

    const headers = [
      'ID',
      'Title',
      'Description',
      'Status',
      'Priority',
      'Category',
      'Tags',
      'Due Date',
      'Created Date'
    ];

    const rows = tasks.map((t) => [
      t.id,
      `"${(t.title || '').replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      t.status,
      t.priority,
      t.category ? t.category.name : 'Uncategorized',
      `"${(t.tags || []).join('; ')}"`,
      t.dueDate ? new Date(t.dueDate).toISOString().split('T')[0] : 'None',
      t.createdAt ? new Date(t.createdAt).toISOString().split('T')[0] : ''
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="tasks-export.csv"');
    res.status(200).send(csvContent);
  } catch (err) {
    next(err);
  }
};
