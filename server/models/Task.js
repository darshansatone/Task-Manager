const crypto = require('crypto');
const supabase = require('../config/supabase');

class TaskModel {
  static format(task) {
    if (!task) return null;

    let catObj = null;
    if (task.category && typeof task.category === 'object') {
      catObj = {
        id: task.category.id,
        _id: task.category.id,
        name: task.category.name,
        color: task.category.color,
        icon: task.category.icon
      };
    }

    const formattedSubtasks = (task.subtasks || []).map((s) => ({
      id: s.id || s._id || crypto.randomUUID(),
      _id: s.id || s._id || crypto.randomUUID(),
      title: s.title,
      completed: !!s.completed
    }));

    return {
      id: task.id,
      _id: task.id, // For frontend compatibility
      title: task.title,
      description: task.description || '',
      status: task.status || 'Pending',
      priority: task.priority || 'Medium',
      category: catObj,
      categoryId: task.category_id,
      tags: Array.isArray(task.tags) ? task.tags : [],
      dueDate: task.due_date,
      reminder: !!task.reminder,
      isPinned: !!task.is_pinned,
      isTrash: !!task.is_trash,
      subtasks: formattedSubtasks,
      user: task.user_id,
      userId: task.user_id,
      completedAt: task.completed_at,
      createdAt: task.created_at,
      updatedAt: task.updated_at
    };
  }

  // Find tasks with flexible filtering, search, sorting and pagination
  static async find({
    userId,
    status,
    priority,
    category,
    deadline,
    pinned,
    trash,
    search,
    sort,
    skip = 0,
    limit = 50
  }) {
    let builder = supabase
      .from('tasks')
      .select('*, category:categories(id, name, color, icon)', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_trash', trash === true || trash === 'true');

    if (status && status !== 'All') {
      builder = builder.eq('status', status);
    }

    if (priority && priority !== 'All') {
      builder = builder.eq('priority', priority);
    }

    if (category && category !== 'All') {
      if (category === 'uncategorized') {
        builder = builder.is('category_id', null);
      } else {
        builder = builder.eq('category_id', category);
      }
    }

    if (pinned === true || pinned === 'true') {
      builder = builder.eq('is_pinned', true);
    }

    // Search query across title and description
    if (search && search.trim()) {
      const term = search.trim();
      builder = builder.or(`title.ilike.%${term}%,description.ilike.%${term}%`);
    }

    // Deadline filters
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).toISOString();

    if (deadline === 'overdue') {
      builder = builder.lt('due_date', startOfToday).neq('status', 'Completed');
    } else if (deadline === 'today') {
      builder = builder.gte('due_date', startOfToday).lte('due_date', endOfToday);
    } else if (deadline === 'upcoming') {
      builder = builder.gt('due_date', endOfToday);
    }

    // Sorting
    builder = builder.order('is_pinned', { ascending: false });

    if (sort === 'oldest') {
      builder = builder.order('created_at', { ascending: true });
    } else if (sort === 'deadline') {
      builder = builder.order('due_date', { ascending: true }).order('created_at', { ascending: false });
    } else {
      builder = builder.order('created_at', { ascending: false });
    }

    // Pagination
    if (limit) {
      builder = builder.range(skip, skip + limit - 1);
    }

    const { data, count, error } = await builder;
    if (error) throw error;

    let tasks = (data || []).map(TaskModel.format);

    // In-memory priority sorting refinement if requested
    if (sort === 'priority') {
      const priorityOrder = { High: 1, Medium: 2, Low: 3 };
      tasks.sort((a, b) => {
        if (a.isPinned !== b.isPinned) return b.isPinned ? 1 : -1;
        return (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      });
    }

    return { tasks, total: count !== undefined ? count : tasks.length };
  }

  // Find single task by ID
  static async findById(id, userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('*, category:categories(id, name, color, icon)')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return TaskModel.format(data);
  }

  // Create task
  static async create(taskData) {
    const subtasks = (taskData.subtasks || []).map((s) => ({
      id: s.id || s._id || crypto.randomUUID(),
      title: s.title,
      completed: !!s.completed
    }));

    const payload = {
      title: taskData.title.trim(),
      description: taskData.description ? taskData.description.trim() : '',
      status: taskData.status || 'Pending',
      priority: taskData.priority || 'Medium',
      category_id: taskData.category || taskData.categoryId || null,
      tags: Array.isArray(taskData.tags) ? taskData.tags : [],
      due_date: taskData.dueDate || null,
      reminder: !!taskData.reminder,
      is_pinned: !!taskData.isPinned,
      is_trash: false,
      subtasks,
      user_id: taskData.user || taskData.userId,
      completed_at: taskData.status === 'Completed' ? new Date().toISOString() : null
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select('*, category:categories(id, name, color, icon)')
      .single();

    if (error) throw error;
    return TaskModel.format(data);
  }

  // Insert many (seed)
  static async insertMany(items) {
    const payload = items.map((t) => ({
      title: t.title.trim(),
      description: t.description || '',
      status: t.status || 'Pending',
      priority: t.priority || 'Medium',
      category_id: t.category || null,
      tags: t.tags || [],
      due_date: t.dueDate ? new Date(t.dueDate).toISOString() : null,
      reminder: !!t.reminder,
      is_pinned: !!t.isPinned,
      is_trash: !!t.isTrash,
      subtasks: (t.subtasks || []).map((s) => ({
        id: crypto.randomUUID(),
        title: s.title,
        completed: !!s.completed
      })),
      user_id: t.user,
      completed_at: t.completedAt ? new Date(t.completedAt).toISOString() : null
    }));

    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select('*, category:categories(id, name, color, icon)');

    if (error) throw error;
    return (data || []).map(TaskModel.format);
  }

  // Update task
  static async update(id, userId, updates) {
    const payload = {};
    if (updates.title !== undefined) payload.title = updates.title.trim();
    if (updates.description !== undefined) payload.description = updates.description.trim();
    if (updates.status !== undefined) {
      payload.status = updates.status;
      payload.completed_at = updates.status === 'Completed' ? new Date().toISOString() : null;
    }
    if (updates.priority !== undefined) payload.priority = updates.priority;
    if (updates.category !== undefined || updates.categoryId !== undefined) {
      payload.category_id = updates.category || updates.categoryId || null;
    }
    if (updates.tags !== undefined) payload.tags = updates.tags;
    if (updates.dueDate !== undefined) payload.due_date = updates.dueDate || null;
    if (updates.reminder !== undefined) payload.reminder = !!updates.reminder;
    if (updates.isPinned !== undefined) payload.is_pinned = !!updates.isPinned;
    if (updates.subtasks !== undefined) payload.subtasks = updates.subtasks;

    const { data, error } = await supabase
      .from('tasks')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, category:categories(id, name, color, icon)')
      .single();

    if (error) throw error;
    return TaskModel.format(data);
  }

  // Update status only
  static async updateStatus(id, userId, status) {
    const completedAt = status === 'Completed' ? new Date().toISOString() : null;
    const { data, error } = await supabase
      .from('tasks')
      .update({ status, completed_at: completedAt })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, category:categories(id, name, color, icon)')
      .single();

    if (error) throw error;
    return TaskModel.format(data);
  }

  // Toggle pin
  static async togglePin(id, userId) {
    const existing = await TaskModel.findById(id, userId);
    if (!existing) return null;

    const nextPin = !existing.isPinned;
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_pinned: nextPin })
      .eq('id', id)
      .eq('user_id', userId)
      .select('*, category:categories(id, name, color, icon)')
      .single();

    if (error) throw error;
    return TaskModel.format(data);
  }

  // Soft delete / Move to trash
  static async moveToTrash(id, userId) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_trash: true, is_pinned: false })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return TaskModel.format(data);
  }

  // Restore from trash
  static async restoreFromTrash(id, userId) {
    const { data, error } = await supabase
      .from('tasks')
      .update({ is_trash: false })
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return TaskModel.format(data);
  }

  // Delete permanently
  static async deletePermanently(id, userId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  // Delete many (for seed or cleanup)
  static async deleteMany(query = {}) {
    let builder = supabase.from('tasks').delete();
    if (query.user) builder = builder.eq('user_id', query.user);
    if (query.isTrash !== undefined) builder = builder.eq('is_trash', query.isTrash);
    const { error } = await builder;
    if (error) throw error;
    return true;
  }

  // Empty trash
  static async emptyTrash(userId) {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('user_id', userId)
      .eq('is_trash', true);

    if (error) throw error;
    return true;
  }

  // Bulk update status
  static async bulkUpdateStatus(userId, taskIds, status) {
    const completedAt = status === 'Completed' ? new Date().toISOString() : null;
    const { error } = await supabase
      .from('tasks')
      .update({ status, completed_at: completedAt })
      .in('id', taskIds)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  // Bulk delete / trash
  static async bulkDelete(userId, taskIds, permanent = false) {
    if (permanent) {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .in('id', taskIds)
        .eq('user_id', userId);

      if (error) throw error;
      return true;
    }

    const { error } = await supabase
      .from('tasks')
      .update({ is_trash: true, is_pinned: false })
      .in('id', taskIds)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  // Add subtask
  static async addSubtask(taskId, userId, title) {
    const task = await TaskModel.findById(taskId, userId);
    if (!task) return null;

    const subtasks = [...(task.subtasks || [])];
    const newSubtask = {
      id: crypto.randomUUID(),
      _id: crypto.randomUUID(),
      title: title.trim(),
      completed: false
    };
    subtasks.push(newSubtask);

    const { data, error } = await supabase
      .from('tasks')
      .update({ subtasks })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return (data.subtasks || []).map((s) => ({
      ...s,
      _id: s.id || s._id
    }));
  }

  // Toggle subtask
  static async toggleSubtask(taskId, userId, subtaskId) {
    const task = await TaskModel.findById(taskId, userId);
    if (!task) return null;

    const subtasks = (task.subtasks || []).map((s) => {
      if (s.id === subtaskId || s._id === subtaskId) {
        return { ...s, completed: !s.completed };
      }
      return s;
    });

    const { data, error } = await supabase
      .from('tasks')
      .update({ subtasks })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return (data.subtasks || []).map((s) => ({
      ...s,
      _id: s.id || s._id
    }));
  }

  // Delete subtask
  static async deleteSubtask(taskId, userId, subtaskId) {
    const task = await TaskModel.findById(taskId, userId);
    if (!task) return null;

    const subtasks = (task.subtasks || []).filter(
      (s) => s.id !== subtaskId && s._id !== subtaskId
    );

    const { data, error } = await supabase
      .from('tasks')
      .update({ subtasks })
      .eq('id', taskId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return (data.subtasks || []).map((s) => ({
      ...s,
      _id: s.id || s._id
    }));
  }

  // Task count per category helper
  static async getTaskCountsByCategory(userId) {
    const { data, error } = await supabase
      .from('tasks')
      .select('category_id')
      .eq('user_id', userId)
      .eq('is_trash', false);

    if (error) throw error;
    const countMap = {};
    (data || []).forEach((t) => {
      if (t.category_id) {
        countMap[t.category_id] = (countMap[t.category_id] || 0) + 1;
      }
    });
    return countMap;
  }
}

module.exports = TaskModel;
