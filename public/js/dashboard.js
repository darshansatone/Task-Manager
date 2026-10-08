// Dashboard Application Controller

document.addEventListener('DOMContentLoaded', () => {
  // Guard check
  if (!window.Auth.isAuthenticated()) return;

  // State Management
  const state = {
    tasks: [],
    categories: [],
    stats: null,
    selectedTaskIds: new Set(),
    activeView: 'all', // 'all', 'today', 'upcoming', 'overdue', 'completed', 'trash'
    filters: {
      status: 'All',
      priority: 'All',
      category: 'All',
      deadline: '',
      pinned: false,
      trash: false,
      search: '',
      sort: 'newest'
    },
    viewLayout: 'grid',
    editingTaskId: null,
    tempSubtasks: []
  };

  // DOM Elements
  const elements = {
    // Task View Container
    tasksContainer: document.getElementById('tasksContainer'),
    taskCountHeader: document.getElementById('taskCountHeader'),
    currentViewTitle: document.getElementById('currentViewTitle'),

    // Search & Filter
    searchInput: document.getElementById('globalSearchInput'),
    filterStatus: document.getElementById('filterStatus'),
    filterPriority: document.getElementById('filterPriority'),
    filterCategory: document.getElementById('filterCategory'),
    sortTasks: document.getElementById('sortTasks'),
    layoutGridBtn: document.getElementById('layoutGridBtn'),
    layoutListBtn: document.getElementById('layoutListBtn'),

    // Bulk bar
    bulkBar: document.getElementById('bulkActionBar'),
    bulkCountText: document.getElementById('bulkCountText'),
    bulkCompleteBtn: document.getElementById('bulkCompleteBtn'),
    bulkDeleteBtn: document.getElementById('bulkDeleteBtn'),
    bulkCancelBtn: document.getElementById('bulkCancelBtn'),

    // Modals
    taskModal: document.getElementById('taskModal'),
    taskForm: document.getElementById('taskForm'),
    taskModalTitle: document.getElementById('taskModalTitle'),
    taskSubmitBtn: document.getElementById('taskSubmitBtn'),
    openTaskModalBtn: document.getElementById('openTaskModalBtn'),
    closeTaskModalBtn: document.getElementById('closeTaskModalBtn'),
    cancelTaskModalBtn: document.getElementById('cancelTaskModalBtn'),

    // Task Form Inputs
    taskTitleInput: document.getElementById('taskTitleInput'),
    taskDescInput: document.getElementById('taskDescInput'),
    taskCategoryInput: document.getElementById('taskCategoryInput'),
    taskDueDateInput: document.getElementById('taskDueDateInput'),
    taskTagsInput: document.getElementById('taskTagsInput'),
    taskReminderCheck: document.getElementById('taskReminderCheck'),
    priorityOptions: document.querySelectorAll('.priority-option'),
    subtaskInputText: document.getElementById('subtaskInputText'),
    addSubtaskBtn: document.getElementById('addSubtaskBtn'),
    subtasksBuilderList: document.getElementById('subtasksBuilderList'),

    // Task Details Modal
    detailsModal: document.getElementById('detailsModal'),
    closeDetailsModalBtn: document.getElementById('closeDetailsModalBtn'),
    detailsModalBody: document.getElementById('detailsModalBody'),

    // Category Modal
    categoryModal: document.getElementById('categoryModal'),
    openCategoryModalBtn: document.getElementById('openCategoryModalBtn'),
    closeCategoryModalBtn: document.getElementById('closeCategoryModalBtn'),
    categoryForm: document.getElementById('categoryForm'),
    catNameInput: document.getElementById('catNameInput'),
    catColorInput: document.getElementById('catColorInput'),
    existingCategoriesList: document.getElementById('existingCategoriesList'),

    // Sidebar & Navigation
    navBtns: document.querySelectorAll('.nav-item-btn'),
    sidebarCategoriesList: document.getElementById('sidebarCategoriesList'),
    sidebarToggleBtn: document.getElementById('sidebarToggleBtn'),
    appSidebar: document.getElementById('appSidebar'),
    sidebarBackdrop: document.getElementById('sidebarBackdrop'),

    // Stats Elements
    statTotal: document.getElementById('statTotal'),
    statPending: document.getElementById('statPending'),
    statProgress: document.getElementById('statProgress'),
    statCompleted: document.getElementById('statCompleted'),
    statOverdue: document.getElementById('statOverdue'),
    radialFill: document.getElementById('radialProgressFill'),
    radialText: document.getElementById('radialProgressText'),
    chartBarsContainer: document.getElementById('chartBarsContainer'),

    // Header actions
    exportCsvBtn: document.getElementById('exportCsvBtn'),
    notificationBellBtn: document.getElementById('notificationBellBtn'),
    notificationBadge: document.getElementById('notificationBadge'),
    notificationDropdown: document.getElementById('notificationDropdown'),
    notificationList: document.getElementById('notificationList'),
    notificationSummaryText: document.getElementById('notificationSummaryText'),
    openNotificationSettingsBtn: document.getElementById('openNotificationSettingsBtn'),
    configureNotificationLink: document.getElementById('configureNotificationLink'),
    markAllNotificationsReadBtn: document.getElementById('markAllNotificationsReadBtn'),

    // Notification Options Modal
    notificationOptionsModal: document.getElementById('notificationOptionsModal'),
    closeNotificationOptionsModalBtn: document.getElementById('closeNotificationOptionsModalBtn'),
    cancelNotificationOptionsBtn: document.getElementById('cancelNotificationOptionsBtn'),
    saveNotificationOptionsBtn: document.getElementById('saveNotificationOptionsBtn'),
    notifOptBrowser: document.getElementById('notifOptBrowser'),
    notifOptDue: document.getElementById('notifOptDue'),
    notifOptSound: document.getElementById('notifOptSound'),
    notifOptEmail: document.getElementById('notifOptEmail'),
    notifOptLeadTime: document.getElementById('notifOptLeadTime'),
    testSoundBtn: document.getElementById('testSoundBtn'),

    emptyTrashBtn: document.getElementById('emptyTrashBtn')
  };

  let selectedPriorityValue = 'Medium';

  // -------------------------------------------------------------
  // Data Loading & API Calls
  // -------------------------------------------------------------
  async function loadDashboard() {
    try {
      await Promise.all([fetchCategories(), fetchStats(), fetchTasks()]);
    } catch (err) {
      window.showToast('Failed to load dashboard data: ' + err.message, 'error');
    }
  }

  async function fetchCategories() {
    try {
      const res = await window.api.get('/api/categories');
      state.categories = res.data || [];
      renderCategories();
    } catch (err) {
      console.error('Categories error:', err);
    }
  }

  async function fetchStats() {
    try {
      const res = await window.api.get('/api/stats');
      state.stats = res.data;
      renderStats();
    } catch (err) {
      console.error('Stats error:', err);
    }
  }

  async function fetchTasks() {
    try {
      renderLoadingSkeleton();
      const params = {
        status: state.filters.status,
        priority: state.filters.priority,
        category: state.filters.category,
        deadline: state.filters.deadline,
        pinned: state.filters.pinned ? 'true' : undefined,
        trash: state.filters.trash ? 'true' : 'false',
        search: state.filters.search,
        sort: state.filters.sort
      };

      const res = await window.api.get('/api/tasks', params);
      state.tasks = res.data || [];
      renderTasks();

      // Check reminders & update notification center
      if (window.checkTaskReminders) {
        window.checkTaskReminders(state.tasks);
      }
      updateNotificationBadgeAndList(state.tasks);
    } catch (err) {
      renderEmptyState('Failed to load tasks: ' + err.message);
    }
  }

  // -------------------------------------------------------------
  // Rendering Methods
  // -------------------------------------------------------------
  function renderStats() {
    if (!state.stats) return;
    const s = state.stats;

    if (elements.statTotal) elements.statTotal.textContent = s.totalTasks;
    if (elements.statPending) elements.statPending.textContent = s.pendingCount;
    if (elements.statProgress) elements.statProgress.textContent = s.inProgressCount;
    if (elements.statCompleted) elements.statCompleted.textContent = s.completedCount;
    if (elements.statOverdue) elements.statOverdue.textContent = s.overdueCount;

    // Sidebar badge counts
    const countTotal = document.getElementById('countNavAll');
    if (countTotal) countTotal.textContent = s.totalTasks;

    const countToday = document.getElementById('countNavToday');
    if (countToday) countToday.textContent = s.todayCount;

    const countUpcoming = document.getElementById('countNavUpcoming');
    if (countUpcoming) countUpcoming.textContent = s.upcomingCount;

    const countOverdue = document.getElementById('countNavOverdue');
    if (countOverdue) countOverdue.textContent = s.overdueCount;

    const countCompleted = document.getElementById('countNavCompleted');
    if (countCompleted) countCompleted.textContent = s.completedCount;

    const countTrash = document.getElementById('countNavTrash');
    if (countTrash) countTrash.textContent = s.trashCount;

    // Radial Progress
    const pct = s.completionPercentage || 0;
    if (elements.radialText) elements.radialText.textContent = `${pct}%`;
    if (elements.radialFill) {
      const maxOffset = 251.2;
      const offset = maxOffset - (pct / 100) * maxOffset;
      elements.radialFill.style.strokeDashoffset = offset;
    }

    // Weekly Productivity Chart
    if (elements.chartBarsContainer && s.weeklyData) {
      elements.chartBarsContainer.innerHTML = '';
      const maxVal = Math.max(...s.weeklyData.map((d) => d.completed), 1);

      s.weeklyData.forEach((dayData) => {
        const heightPct = Math.max((dayData.completed / maxVal) * 100, 8);
        const col = document.createElement('div');
        col.className = 'chart-bar-group';
        col.innerHTML = `
          <div class="chart-count">${dayData.completed > 0 ? dayData.completed : ''}</div>
          <div class="chart-bar-wrapper">
            <div class="chart-bar-fill" style="height: ${heightPct}%" title="${dayData.date}: ${dayData.completed} completed"></div>
          </div>
          <div class="chart-label">${dayData.day}</div>
        `;
        elements.chartBarsContainer.appendChild(col);
      });
    }
  }

  function renderCategories() {
    // 1. Sidebar Category list
    if (elements.sidebarCategoriesList) {
      elements.sidebarCategoriesList.innerHTML = '';
      state.categories.forEach((cat) => {
        const item = document.createElement('li');
        item.innerHTML = `
          <button class="nav-item-btn ${state.filters.category === cat._id ? 'active' : ''}" data-cat-id="${cat._id}">
            <span class="nav-label-group">
              <span style="width:10px; height:10px; border-radius:50%; background-color:${cat.color}; display:inline-block;"></span>
              <span>${escapeHtml(cat.name)}</span>
            </span>
            <span class="nav-count-badge">${cat.taskCount || 0}</span>
          </button>
        `;
        item.querySelector('button').addEventListener('click', () => {
          setActiveCategoryFilter(cat._id, cat.name);
        });
        elements.sidebarCategoriesList.appendChild(item);
      });
    }

    // 2. Toolbar Category Filter Dropdown
    if (elements.filterCategory) {
      const currentSelected = elements.filterCategory.value;
      elements.filterCategory.innerHTML = `<option value="All">All Categories</option><option value="uncategorized">Uncategorized</option>`;
      state.categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat._id;
        opt.textContent = cat.name;
        if (opt.value === currentSelected) opt.selected = true;
        elements.filterCategory.appendChild(opt);
      });
    }

    // 3. Task Modal Category Select Dropdown
    if (elements.taskCategoryInput) {
      elements.taskCategoryInput.innerHTML = `<option value="">No Category</option>`;
      state.categories.forEach((cat) => {
        const opt = document.createElement('option');
        opt.value = cat._id;
        opt.textContent = cat.name;
        elements.taskCategoryInput.appendChild(opt);
      });
    }

    // 4. Modal Category Manager list
    if (elements.existingCategoriesList) {
      elements.existingCategoriesList.innerHTML = '';
      state.categories.forEach((cat) => {
        const div = document.createElement('div');
        div.className = 'subtask-builder-item';
        div.innerHTML = `
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="width:12px; height:12px; border-radius:50%; background-color:${cat.color};"></span>
            <strong>${escapeHtml(cat.name)}</strong>
            <span style="font-size:0.75rem; color:var(--text-muted);">(${cat.taskCount || 0} tasks)</span>
          </div>
          <button type="button" class="action-btn-sm" title="Delete category" data-del-cat="${cat._id}">
            <svg width="15" height="15" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        `;
        div.querySelector('[data-del-cat]').addEventListener('click', () => deleteCategory(cat._id));
        elements.existingCategoriesList.appendChild(div);
      });
    }
  }

  function renderTasks() {
    const container = elements.tasksContainer;
    container.innerHTML = '';

    if (elements.taskCountHeader) {
      elements.taskCountHeader.textContent = `${state.tasks.length} task${state.tasks.length === 1 ? '' : 's'}`;
    }

    // Toggle Empty Trash button visibility if on trash view
    if (elements.emptyTrashBtn) {
      elements.emptyTrashBtn.style.display = state.filters.trash && state.tasks.length > 0 ? 'inline-flex' : 'none';
    }

    if (state.tasks.length === 0) {
      let emptyMsg = 'No tasks found matching your filters.';
      if (state.filters.trash) {
        emptyMsg = 'Trash is empty. Clean and clear!';
      } else if (state.activeView === 'today') {
        emptyMsg = 'No tasks scheduled for today. Great job!';
      } else if (state.activeView === 'overdue') {
        emptyMsg = 'Hooray! No overdue tasks pending!';
      }
      renderEmptyState(emptyMsg);
      return;
    }

    state.tasks.forEach((task) => {
      const card = createTaskCardElement(task);
      container.appendChild(card);
    });

    updateBulkBarState();
  }

  function createTaskCardElement(task) {
    const card = document.createElement('div');
    const isCompleted = task.status === 'Completed';
    const isOverdue = isTaskOverdue(task);
    const isToday = isTaskDueToday(task);

    card.className = `task-card ${task.isPinned ? 'pinned' : ''} ${isCompleted ? 'completed-task' : ''}`;
    card.setAttribute('data-id', task._id);

    // Subtasks calculation
    const totalSubtasks = (task.subtasks || []).length;
    const completedSubtasks = (task.subtasks || []).filter((s) => s.completed).length;
    const subtaskPct = totalSubtasks > 0 ? Math.round((completedSubtasks / totalSubtasks) * 100) : 0;

    // Category styling
    const categoryName = task.category ? task.category.name : 'Uncategorized';
    const categoryColor = task.category ? task.category.color : '#94a3b8';

    // Due date display
    let dateBadge = '';
    if (task.dueDate) {
      const d = new Date(task.dueDate);
      const dateText = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
      const timeText = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isCompleted) {
        dateBadge = `<span class="badge badge-completed">✓ ${dateText}</span>`;
      } else if (isOverdue) {
        dateBadge = `<span class="badge badge-overdue">⚠️ Overdue: ${dateText}</span>`;
      } else if (isToday) {
        dateBadge = `<span class="badge badge-today">⏰ Today: ${timeText}</span>`;
      } else {
        dateBadge = `<span class="badge badge-upcoming">📅 ${dateText}</span>`;
      }
    }

    // Priority badge
    const priorityClass = `badge-${(task.priority || 'Medium').toLowerCase()}`;

    // Tags HTML
    const tagsHtml = (task.tags || [])
      .map((t) => `<span class="tag-pill">#${escapeHtml(t)}</span>`)
      .join('');

    card.innerHTML = `
      <div class="task-header">
        <div class="task-header-left">
          <input type="checkbox" class="task-select-check" data-select-id="${task._id}" ${state.selectedTaskIds.has(task._id) ? 'checked' : ''} title="Select for bulk action">
          ${task.isPinned ? `<span class="pin-indicator" title="Pinned to top">📌</span>` : ''}
          <span class="task-category-chip">
            <span style="width:8px; height:8px; border-radius:50%; background:${categoryColor};"></span>
            ${escapeHtml(categoryName)}
          </span>
          <span class="badge ${priorityClass}">${task.priority}</span>
        </div>
        <div class="task-header-actions">
          ${!state.filters.trash ? `
            <button class="action-btn-sm btn-pin-toggle" title="${task.isPinned ? 'Unpin' : 'Pin to top'}">
              <svg width="15" height="15" fill="${task.isPinned ? '#6366f1' : 'none'}" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"/></svg>
            </button>
            <button class="action-btn-sm btn-edit-task" title="Edit Task">
              <svg width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
            </button>
          ` : `
            <button class="action-btn-sm btn-restore-task" title="Restore task">
              <svg width="15" height="15" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
            </button>
          `}
          <button class="action-btn-sm btn-delete-task" title="${state.filters.trash ? 'Delete Permanently' : 'Move to Trash'}">
            <svg width="15" height="15" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      <div class="task-main">
        ${!state.filters.trash ? `
          <label class="custom-checkbox-label">
            <input type="checkbox" class="custom-checkbox-input task-toggle-complete" ${isCompleted ? 'checked' : ''}>
            <div class="checkbox-visual">
              <svg viewBox="0 0 24 24" fill="none"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </div>
          </label>
        ` : ''}
        <div class="task-content">
          <div class="task-title" title="Click to view details">${escapeHtml(task.title)}</div>
          ${task.description ? `<div class="task-desc">${escapeHtml(task.description)}</div>` : ''}
        </div>
      </div>

      ${totalSubtasks > 0 ? `
        <div class="task-subtasks-bar">
          <div class="subtasks-meta">
            <span>Subtasks</span>
            <span>${completedSubtasks}/${totalSubtasks}</span>
          </div>
          <div class="subtasks-progress-track">
            <div class="subtasks-progress-fill" style="width: ${subtaskPct}%"></div>
          </div>
        </div>
      ` : ''}

      ${task.tags && task.tags.length > 0 ? `<div class="task-tags-row">${tagsHtml}</div>` : ''}

      <div class="task-footer">
        <div class="task-date-info">
          ${dateBadge || `<span style="color:var(--text-muted); font-size:0.75rem;">No deadline</span>`}
          ${task.reminder ? `<span title="Reminder enabled" style="color:var(--accent-primary);">🔔</span>` : ''}
        </div>
        <button class="action-btn-sm btn-details-task" title="View details & subtasks">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </button>
      </div>
    `;

    // Event Bindings
    // 1. Task Selection Checkbox
    const selectCheck = card.querySelector('.task-select-check');
    selectCheck.addEventListener('change', (e) => {
      if (e.target.checked) {
        state.selectedTaskIds.add(task._id);
      } else {
        state.selectedTaskIds.delete(task._id);
      }
      updateBulkBarState();
    });

    // 2. Complete status toggle
    const toggleComplete = card.querySelector('.task-toggle-complete');
    if (toggleComplete) {
      toggleComplete.addEventListener('change', async (e) => {
        const nextStatus = e.target.checked ? 'Completed' : 'Pending';
        try {
          await window.api.patch(`/api/tasks/${task._id}/status`, { status: nextStatus });
          window.showToast(nextStatus === 'Completed' ? 'Task completed! 🎉' : 'Task marked as pending.', 'info');
          fetchStats();
          fetchTasks();
        } catch (err) {
          e.target.checked = !e.target.checked;
          window.showToast(err.message, 'error');
        }
      });
    }

    // 3. Pin Toggle
    const pinBtn = card.querySelector('.btn-pin-toggle');
    if (pinBtn) {
      pinBtn.addEventListener('click', async () => {
        try {
          await window.api.patch(`/api/tasks/${task._id}/pin`);
          fetchTasks();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      });
    }

    // 4. Edit Task
    const editBtn = card.querySelector('.btn-edit-task');
    if (editBtn) {
      editBtn.addEventListener('click', () => openEditTaskModal(task));
    }

    // 5. Restore Task
    const restoreBtn = card.querySelector('.btn-restore-task');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', async () => {
        try {
          await window.api.patch(`/api/tasks/${task._id}/restore`);
          window.showToast('Task restored!', 'success');
          fetchStats();
          fetchTasks();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      });
    }

    // 6. Delete Task
    const delBtn = card.querySelector('.btn-delete-task');
    if (delBtn) {
      delBtn.addEventListener('click', async () => {
        const confirmMsg = state.filters.trash
          ? 'Permanently delete this task? This cannot be undone.'
          : 'Move this task to trash?';
        if (confirm(confirmMsg)) {
          try {
            await window.api.delete(`/api/tasks/${task._id}`);
            window.showToast(state.filters.trash ? 'Task permanently deleted.' : 'Task moved to trash.', 'info');
            fetchStats();
            fetchTasks();
          } catch (err) {
            window.showToast(err.message, 'error');
          }
        }
      });
    }

    // 7. View Details
    const titleEl = card.querySelector('.task-title');
    const detailsBtn = card.querySelector('.btn-details-task');
    if (titleEl) titleEl.addEventListener('click', () => openTaskDetailsModal(task));
    if (detailsBtn) detailsBtn.addEventListener('click', () => openTaskDetailsModal(task));

    return card;
  }

  function renderLoadingSkeleton() {
    elements.tasksContainer.innerHTML = Array(6)
      .fill(0)
      .map(
        () => `
        <div class="task-card" style="opacity: 0.6; min-height: 180px;">
          <div style="height: 18px; width: 40%; background: var(--bg-tertiary); border-radius: 4px;"></div>
          <div style="height: 24px; width: 85%; background: var(--bg-tertiary); border-radius: 4px; margin: 12px 0;"></div>
          <div style="height: 14px; width: 60%; background: var(--bg-tertiary); border-radius: 4px;"></div>
        </div>
      `
      )
      .join('');
  }

  function renderEmptyState(message) {
    elements.tasksContainer.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">📋</div>
        <h3>No Tasks to Show</h3>
        <p>${escapeHtml(message)}</p>
        ${!state.filters.trash ? `
          <button class="btn btn-primary" onclick="document.getElementById('openTaskModalBtn').click()">
            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4"/></svg>
            Create Your First Task
          </button>
        ` : ''}
      </div>
    `;
  }

  // -------------------------------------------------------------
  // Bulk Actions
  // -------------------------------------------------------------
  function updateBulkBarState() {
    const count = state.selectedTaskIds.size;
    if (count > 0) {
      elements.bulkBar.classList.add('active');
      elements.bulkCountText.textContent = `${count} task${count > 1 ? 's' : ''} selected`;
    } else {
      elements.bulkBar.classList.remove('active');
    }
  }

  if (elements.bulkCancelBtn) {
    elements.bulkCancelBtn.addEventListener('click', () => {
      state.selectedTaskIds.clear();
      document.querySelectorAll('.task-select-check').forEach((chk) => (chk.checked = false));
      updateBulkBarState();
    });
  }

  if (elements.bulkCompleteBtn) {
    elements.bulkCompleteBtn.addEventListener('click', async () => {
      const ids = Array.from(state.selectedTaskIds);
      if (ids.length === 0) return;
      try {
        await window.api.patch('/api/tasks/bulk/status', { taskIds: ids, status: 'Completed' });
        window.showToast(`Marked ${ids.length} tasks as completed!`, 'success');
        state.selectedTaskIds.clear();
        fetchStats();
        fetchTasks();
      } catch (err) {
        window.showToast(err.message, 'error');
      }
    });
  }

  if (elements.bulkDeleteBtn) {
    elements.bulkDeleteBtn.addEventListener('click', async () => {
      const ids = Array.from(state.selectedTaskIds);
      if (ids.length === 0) return;
      const isTrashView = state.filters.trash;
      const confirmMsg = isTrashView
        ? `Permanently delete ${ids.length} tasks?`
        : `Move ${ids.length} tasks to trash?`;

      if (confirm(confirmMsg)) {
        try {
          await window.api.post('/api/tasks/bulk/delete', {
            taskIds: ids,
            permanent: isTrashView
          });
          window.showToast(`Deleted ${ids.length} tasks.`, 'info');
          state.selectedTaskIds.clear();
          fetchStats();
          fetchTasks();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  }

  // -------------------------------------------------------------
  // Filter & Search Handlers
  // -------------------------------------------------------------
  let searchTimeout = null;
  if (elements.searchInput) {
    elements.searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.filters.search = e.target.value.trim();
        fetchTasks();
      }, 300);
    });
  }

  if (elements.filterStatus) {
    elements.filterStatus.addEventListener('change', (e) => {
      state.filters.status = e.target.value;
      fetchTasks();
    });
  }

  if (elements.filterPriority) {
    elements.filterPriority.addEventListener('change', (e) => {
      state.filters.priority = e.target.value;
      fetchTasks();
    });
  }

  if (elements.filterCategory) {
    elements.filterCategory.addEventListener('change', (e) => {
      state.filters.category = e.target.value;
      fetchTasks();
    });
  }

  if (elements.sortTasks) {
    elements.sortTasks.addEventListener('change', (e) => {
      state.filters.sort = e.target.value;
      fetchTasks();
    });
  }

  // Layout View Switch (Grid / List)
  if (elements.layoutGridBtn && elements.layoutListBtn) {
    elements.layoutGridBtn.addEventListener('click', () => {
      state.viewLayout = 'grid';
      elements.tasksContainer.classList.remove('list-view');
      elements.layoutGridBtn.classList.add('btn-primary');
      elements.layoutGridBtn.classList.remove('btn-secondary');
      elements.layoutListBtn.classList.add('btn-secondary');
      elements.layoutListBtn.classList.remove('btn-primary');
    });

    elements.layoutListBtn.addEventListener('click', () => {
      state.viewLayout = 'list';
      elements.tasksContainer.classList.add('list-view');
      elements.layoutListBtn.classList.add('btn-primary');
      elements.layoutListBtn.classList.remove('btn-secondary');
      elements.layoutGridBtn.classList.add('btn-secondary');
      elements.layoutGridBtn.classList.remove('btn-primary');
    });
  }

  // Navigation Links
  elements.navBtns.forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view');
      if (!view) return;

      elements.navBtns.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      state.activeView = view;
      state.filters.category = 'All';
      state.filters.deadline = '';
      state.filters.status = 'All';
      state.filters.trash = false;

      if (view === 'all') {
        elements.currentViewTitle.textContent = 'All Tasks';
      } else if (view === 'today') {
        elements.currentViewTitle.textContent = "Today's Tasks";
        state.filters.deadline = 'today';
      } else if (view === 'upcoming') {
        elements.currentViewTitle.textContent = 'Upcoming Tasks';
        state.filters.deadline = 'upcoming';
      } else if (view === 'overdue') {
        elements.currentViewTitle.textContent = 'Overdue Tasks';
        state.filters.deadline = 'overdue';
      } else if (view === 'completed') {
        elements.currentViewTitle.textContent = 'Completed Tasks';
        state.filters.status = 'Completed';
      } else if (view === 'trash') {
        elements.currentViewTitle.textContent = 'Trash Bin';
        state.filters.trash = true;
      }

      // Close mobile sidebar if open
      if (elements.appSidebar) elements.appSidebar.classList.remove('open');
      if (elements.sidebarBackdrop) elements.sidebarBackdrop.classList.remove('active');

      fetchTasks();
    });
  });

  function setActiveCategoryFilter(categoryId, categoryName) {
    elements.navBtns.forEach((b) => b.classList.remove('active'));
    state.activeView = 'category';
    state.filters.category = categoryId;
    state.filters.deadline = '';
    state.filters.status = 'All';
    state.filters.trash = false;

    if (elements.currentViewTitle) {
      elements.currentViewTitle.textContent = `Category: ${categoryName}`;
    }

    if (elements.filterCategory) {
      elements.filterCategory.value = categoryId;
    }

    if (elements.appSidebar) elements.appSidebar.classList.remove('open');
    if (elements.sidebarBackdrop) elements.sidebarBackdrop.classList.remove('active');

    fetchTasks();
  }

  // -------------------------------------------------------------
  // Task Modal (Create & Edit)
  // -------------------------------------------------------------
  function openCreateTaskModal() {
    state.editingTaskId = null;
    state.tempSubtasks = [];
    elements.taskForm.reset();
    elements.taskModalTitle.textContent = 'Create New Task';
    elements.taskSubmitBtn.textContent = 'Create Task';
    setPrioritySelection('Medium');
    renderSubtasksBuilder();
    elements.taskModal.classList.add('open');
    elements.taskTitleInput.focus();
  }

  function openEditTaskModal(task) {
    state.editingTaskId = task._id;
    state.tempSubtasks = (task.subtasks || []).map((s) => ({ title: s.title, completed: s.completed }));
    elements.taskModalTitle.textContent = 'Edit Task';
    elements.taskSubmitBtn.textContent = 'Save Changes';

    elements.taskTitleInput.value = task.title || '';
    elements.taskDescInput.value = task.description || '';
    elements.taskCategoryInput.value = task.category ? task.category._id : '';
    setPrioritySelection(task.priority || 'Medium');

    if (task.dueDate) {
      const d = new Date(task.dueDate);
      // Format as YYYY-MM-DDTHH:MM for datetime-local input
      const pad = (n) => String(n).padStart(2, '0');
      elements.taskDueDateInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    } else {
      elements.taskDueDateInput.value = '';
    }

    elements.taskTagsInput.value = (task.tags || []).join(', ');
    elements.taskReminderCheck.checked = !!task.reminder;

    renderSubtasksBuilder();
    elements.taskModal.classList.add('open');
  }

  function closeTaskModal() {
    elements.taskModal.classList.remove('open');
    state.editingTaskId = null;
    state.tempSubtasks = [];
  }

  // Priority option selectors
  function setPrioritySelection(val) {
    selectedPriorityValue = val;
    elements.priorityOptions.forEach((opt) => {
      if (opt.getAttribute('data-val') === val) {
        opt.classList.add('selected');
      } else {
        opt.classList.remove('selected');
      }
    });
  }

  elements.priorityOptions.forEach((opt) => {
    opt.addEventListener('click', () => {
      setPrioritySelection(opt.getAttribute('data-val'));
    });
  });

  // Subtask Builder inside Modal
  function renderSubtasksBuilder() {
    elements.subtasksBuilderList.innerHTML = '';
    state.tempSubtasks.forEach((st, idx) => {
      const item = document.createElement('div');
      item.className = 'subtask-builder-item';
      item.innerHTML = `
        <span>${escapeHtml(st.title)}</span>
        <button type="button" class="action-btn-sm" data-idx="${idx}" title="Remove subtask">
          <svg width="14" height="14" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      `;
      item.querySelector('button').addEventListener('click', () => {
        state.tempSubtasks.splice(idx, 1);
        renderSubtasksBuilder();
      });
      elements.subtasksBuilderList.appendChild(item);
    });
  }

  if (elements.addSubtaskBtn && elements.subtaskInputText) {
    elements.addSubtaskBtn.addEventListener('click', () => {
      const title = elements.subtaskInputText.value.trim();
      if (!title) return;
      state.tempSubtasks.push({ title, completed: false });
      elements.subtaskInputText.value = '';
      renderSubtasksBuilder();
    });

    elements.subtaskInputText.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        elements.addSubtaskBtn.click();
      }
    });
  }

  // Task Form Submit
  if (elements.taskForm) {
    elements.taskForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const title = elements.taskTitleInput.value.trim();
      if (!title) {
        window.showToast('Please enter a task title.', 'warning');
        return;
      }

      const body = {
        title,
        description: elements.taskDescInput.value.trim(),
        priority: selectedPriorityValue,
        category: elements.taskCategoryInput.value || null,
        dueDate: elements.taskDueDateInput.value ? new Date(elements.taskDueDateInput.value).toISOString() : null,
        tags: elements.taskTagsInput.value,
        reminder: elements.taskReminderCheck.checked,
        subtasks: state.tempSubtasks
      };

      try {
        elements.taskSubmitBtn.disabled = true;
        elements.taskSubmitBtn.textContent = 'Saving...';

        if (state.editingTaskId) {
          await window.api.put(`/api/tasks/${state.editingTaskId}`, body);
          window.showToast('Task updated successfully!', 'success');
        } else {
          await window.api.post('/api/tasks', body);
          window.showToast('Task created successfully!', 'success');
        }

        closeTaskModal();
        fetchStats();
        fetchTasks();
        fetchCategories();
      } catch (err) {
        window.showToast(err.message, 'error');
      } finally {
        elements.taskSubmitBtn.disabled = false;
        elements.taskSubmitBtn.textContent = state.editingTaskId ? 'Save Changes' : 'Create Task';
      }
    });
  }

  if (elements.openTaskModalBtn) elements.openTaskModalBtn.addEventListener('click', openCreateTaskModal);
  if (elements.closeTaskModalBtn) elements.closeTaskModalBtn.addEventListener('click', closeTaskModal);
  if (elements.cancelTaskModalBtn) elements.cancelTaskModalBtn.addEventListener('click', closeTaskModal);

  // -------------------------------------------------------------
  // Task Details Modal
  // -------------------------------------------------------------
  function openTaskDetailsModal(task) {
    const isCompleted = task.status === 'Completed';
    const catName = task.category ? task.category.name : 'Uncategorized';
    const catColor = task.category ? task.category.color : '#94a3b8';

    elements.detailsModalBody.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <div style="display:flex; gap:8px;">
          <span class="task-category-chip">
            <span style="width:8px; height:8px; border-radius:50%; background:${catColor};"></span>
            ${escapeHtml(catName)}
          </span>
          <span class="badge badge-${task.priority.toLowerCase()}">${task.priority}</span>
          <span class="badge badge-${task.status.toLowerCase().replace(' ', '')}">${task.status}</span>
        </div>
      </div>

      <h2 style="font-size:1.35rem; margin-top:8px;">${escapeHtml(task.title)}</h2>
      
      ${task.description ? `
        <div style="background:var(--bg-tertiary); padding:14px; border-radius:var(--radius-md); font-size:0.9rem; line-height:1.6; color:var(--text-secondary); white-space:pre-wrap;">
          ${escapeHtml(task.description)}
        </div>
      ` : '<p style="color:var(--text-muted); font-style:italic;">No description provided.</p>'}

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; font-size:0.85rem; padding:12px 0; border-top:1px solid var(--border-subtle); border-bottom:1px solid var(--border-subtle);">
        <div>
          <span style="color:var(--text-muted);">Due Date:</span><br>
          <strong>${task.dueDate ? new Date(task.dueDate).toLocaleString() : 'No deadline'}</strong>
        </div>
        <div>
          <span style="color:var(--text-muted);">Created:</span><br>
          <strong>${new Date(task.createdAt).toLocaleDateString()}</strong>
        </div>
      </div>

      <!-- Live Subtasks Checklist -->
      <div style="display:flex; flex-direction:column; gap:10px;">
        <h4 style="font-size:0.95rem;">Subtasks (${(task.subtasks || []).length})</h4>
        <div id="detailsSubtasksList" style="display:flex; flex-direction:column; gap:8px;"></div>
        
        <div style="display:flex; gap:8px; margin-top:6px;">
          <input type="text" id="inlineSubtaskInput" class="form-control" placeholder="Add a new subtask..." style="font-size:0.85rem; padding:8px 12px;">
          <button type="button" id="inlineAddSubtaskBtn" class="btn btn-secondary btn-sm">Add</button>
        </div>
      </div>
    `;

    renderDetailsSubtasks(task);

    // Bind inline subtask adder
    const inlineInput = document.getElementById('inlineSubtaskInput');
    const inlineBtn = document.getElementById('inlineAddSubtaskBtn');
    inlineBtn.addEventListener('click', async () => {
      const txt = inlineInput.value.trim();
      if (!txt) return;
      try {
        const res = await window.api.post(`/api/tasks/${task._id}/subtasks`, { title: txt });
        task.subtasks = res.data;
        renderDetailsSubtasks(task);
        inlineInput.value = '';
        fetchTasks();
      } catch (err) {
        window.showToast(err.message, 'error');
      }
    });

    elements.detailsModal.classList.add('open');
  }

  function renderDetailsSubtasks(task) {
    const listEl = document.getElementById('detailsSubtasksList');
    if (!listEl) return;
    listEl.innerHTML = '';

    if (!task.subtasks || task.subtasks.length === 0) {
      listEl.innerHTML = '<p style="color:var(--text-muted); font-size:0.85rem;">No subtasks yet.</p>';
      return;
    }

    task.subtasks.forEach((st) => {
      const row = document.createElement('div');
      row.className = 'subtask-builder-item';
      row.innerHTML = `
        <label style="display:flex; align-items:center; gap:10px; cursor:pointer; flex:1;">
          <input type="checkbox" ${st.completed ? 'checked' : ''} style="cursor:pointer;">
          <span style="${st.completed ? 'text-decoration:line-through; color:var(--text-muted);' : ''}">${escapeHtml(st.title)}</span>
        </label>
        <button type="button" class="action-btn-sm" title="Delete subtask">
          <svg width="14" height="14" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      `;

      // Toggle subtask
      row.querySelector('input').addEventListener('change', async (e) => {
        try {
          const res = await window.api.patch(`/api/tasks/${task._id}/subtasks/${st._id}`);
          task.subtasks = res.data;
          renderDetailsSubtasks(task);
          fetchTasks();
        } catch (err) {
          e.target.checked = !e.target.checked;
          window.showToast(err.message, 'error');
        }
      });

      // Delete subtask
      row.querySelector('button').addEventListener('click', async () => {
        try {
          const res = await window.api.delete(`/api/tasks/${task._id}/subtasks/${st._id}`);
          task.subtasks = res.data;
          renderDetailsSubtasks(task);
          fetchTasks();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      });

      listEl.appendChild(row);
    });
  }

  if (elements.closeDetailsModalBtn) {
    elements.closeDetailsModalBtn.addEventListener('click', () => {
      elements.detailsModal.classList.remove('open');
    });
  }

  // -------------------------------------------------------------
  // Category Modal
  // -------------------------------------------------------------
  if (elements.openCategoryModalBtn) {
    elements.openCategoryModalBtn.addEventListener('click', () => {
      elements.categoryModal.classList.add('open');
    });
  }

  if (elements.closeCategoryModalBtn) {
    elements.closeCategoryModalBtn.addEventListener('click', () => {
      elements.categoryModal.classList.remove('open');
    });
  }

  if (elements.categoryForm) {
    elements.categoryForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = elements.catNameInput.value.trim();
      const color = elements.catColorInput.value;
      if (!name) return;

      try {
        await window.api.post('/api/categories', { name, color });
        window.showToast(`Category "${name}" created!`, 'success');
        elements.catNameInput.value = '';
        fetchCategories();
      } catch (err) {
        window.showToast(err.message, 'error');
      }
    });
  }

  async function deleteCategory(id) {
    if (confirm('Delete this category? Tasks in this category will become Uncategorized.')) {
      try {
        await window.api.delete(`/api/categories/${id}`);
        window.showToast('Category deleted', 'info');
        fetchCategories();
        fetchTasks();
      } catch (err) {
        window.showToast(err.message, 'error');
      }
    }
  }

  // -------------------------------------------------------------
  // CSV Export & Notifications Bell
  // -------------------------------------------------------------
  if (elements.exportCsvBtn) {
    elements.exportCsvBtn.addEventListener('click', async () => {
      try {
        await window.api.downloadCsv('/api/tasks/export/csv');
        window.showToast('Tasks exported to CSV successfully!', 'success');
      } catch (err) {
        window.showToast('Export failed: ' + err.message, 'error');
      }
    });
  }

  if (elements.notificationBellBtn) {
    elements.notificationBellBtn.addEventListener('click', async () => {
      await window.requestNotificationPermission();
    });
  }

  // Empty Trash action
  if (elements.emptyTrashBtn) {
    elements.emptyTrashBtn.addEventListener('click', async () => {
      if (confirm('Are you sure you want to permanently delete all items in the trash?')) {
        try {
          await window.api.delete('/api/tasks/trash/empty');
          window.showToast('Trash emptied!', 'info');
          fetchStats();
          fetchTasks();
        } catch (err) {
          window.showToast(err.message, 'error');
        }
      }
    });
  }

  // Mobile Sidebar Toggle
  if (elements.sidebarToggleBtn) {
    elements.sidebarToggleBtn.addEventListener('click', () => {
      elements.appSidebar.classList.toggle('open');
      elements.sidebarBackdrop.classList.toggle('active');
    });
  }

  if (elements.sidebarBackdrop) {
    elements.sidebarBackdrop.addEventListener('click', () => {
      elements.appSidebar.classList.remove('open');
      elements.sidebarBackdrop.classList.remove('active');
    });
  }

  // =============================================================
  // Notification Center & Notification Options Manager
  // =============================================================
  let dismissedNotificationIds = new Set(
    JSON.parse(localStorage.getItem('taskmaster_dismissed_notifications') || '[]')
  );

  function updateNotificationBadgeAndList(tasks) {
    if (!window.NotificationManager) return;
    const allNotifs = window.NotificationManager.generateNotificationsList(tasks);

    // Active unread notifications
    const activeNotifs = allNotifs.filter((n) => !dismissedNotificationIds.has(n.id));
    const unreadCount = activeNotifs.filter((n) => n.unread).length;

    // Update Header Bell Badge
    if (elements.notificationBadge) {
      if (unreadCount > 0) {
        elements.notificationBadge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        elements.notificationBadge.style.display = 'flex';
      } else {
        elements.notificationBadge.style.display = 'none';
      }
    }

    // Update Summary Footer
    if (elements.notificationSummaryText) {
      elements.notificationSummaryText.textContent = `${activeNotifs.length} active alert${activeNotifs.length === 1 ? '' : 's'}`;
    }

    // Render Dropdown List Items
    if (elements.notificationList) {
      if (activeNotifs.length === 0) {
        elements.notificationList.innerHTML = `
          <div style="padding: 34px 20px; text-align: center; color: var(--text-muted);">
            <div style="font-size: 2rem; margin-bottom: 8px;">🎉</div>
            <div style="font-weight: 600; color: var(--text-primary); font-size: 0.88rem; margin-bottom: 4px;">All caught up!</div>
            <div style="font-size: 0.78rem;">No overdue tasks or pending deadline alerts.</div>
          </div>
        `;
        return;
      }

      elements.notificationList.innerHTML = activeNotifs
        .map((n) => {
          let iconClass = 'notification-icon-due';
          if (n.type === 'overdue') iconClass = 'notification-icon-overdue';
          else if (n.type === 'reminder') iconClass = 'notification-icon-reminder';

          return `
            <div class="notification-item ${n.unread ? 'unread' : ''}" data-task-id="${n.taskId}">
              <div class="notification-item-icon ${iconClass}">
                ${n.icon}
              </div>
              <div class="notification-item-content">
                <div class="notification-item-title">${escapeHtml(n.title)}</div>
                <div class="notification-item-desc">${escapeHtml(n.desc)}</div>
                <div class="notification-item-time">${escapeHtml(n.time)}</div>
              </div>
            </div>
          `;
        })
        .join('');

      // Click to view task details
      elements.notificationList.querySelectorAll('.notification-item').forEach((item) => {
        item.addEventListener('click', () => {
          const taskId = item.getAttribute('data-task-id');
          if (elements.notificationDropdown) elements.notificationDropdown.style.display = 'none';
          if (taskId) {
            openTaskDetailsModal(taskId);
          }
        });
      });
    }
  }

  // Toggle Notification Center Dropdown
  if (elements.notificationBellBtn) {
    elements.notificationBellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!elements.notificationDropdown) return;
      const isOpen = elements.notificationDropdown.style.display === 'flex';
      elements.notificationDropdown.style.display = isOpen ? 'none' : 'flex';
    });
  }

  // Close dropdown on outside click
  document.addEventListener('click', (e) => {
    if (elements.notificationDropdown && elements.notificationDropdown.style.display === 'flex') {
      if (
        !elements.notificationDropdown.contains(e.target) &&
        e.target !== elements.notificationBellBtn &&
        !elements.notificationBellBtn.contains(e.target)
      ) {
        elements.notificationDropdown.style.display = 'none';
      }
    }
  });

  // Mark all notifications read
  if (elements.markAllNotificationsReadBtn) {
    elements.markAllNotificationsReadBtn.addEventListener('click', () => {
      const allNotifs = window.NotificationManager.generateNotificationsList(state.tasks);
      allNotifs.forEach((n) => dismissedNotificationIds.add(n.id));
      localStorage.setItem('taskmaster_dismissed_notifications', JSON.stringify([...dismissedNotificationIds]));
      updateNotificationBadgeAndList(state.tasks);
      window.showToast('All notifications marked as read', 'info');
    });
  }

  // Notification Options Modal Logic
  function openNotificationOptionsModal() {
    if (!elements.notificationOptionsModal) return;
    if (elements.notificationDropdown) elements.notificationDropdown.style.display = 'none';

    const settings = window.NotificationManager.getNotificationSettings();
    const user = window.Auth.getUser() || {};
    const prefs = user.preferences || {};

    if (elements.notifOptBrowser) {
      elements.notifOptBrowser.checked = ('Notification' in window) && Notification.permission === 'granted';
    }
    if (elements.notifOptDue) elements.notifOptDue.checked = settings.dueAlerts !== false;
    if (elements.notifOptSound) elements.notifOptSound.checked = settings.sound !== false;
    if (elements.notifOptEmail) elements.notifOptEmail.checked = prefs.emailNotifications !== false;
    if (elements.notifOptLeadTime) elements.notifOptLeadTime.value = settings.leadMinutes || 60;

    elements.notificationOptionsModal.classList.add('active');
  }

  function closeNotificationOptionsModal() {
    if (elements.notificationOptionsModal) {
      elements.notificationOptionsModal.classList.remove('active');
    }
  }

  if (elements.openNotificationSettingsBtn) {
    elements.openNotificationSettingsBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openNotificationOptionsModal();
    });
  }

  if (elements.configureNotificationLink) {
    elements.configureNotificationLink.addEventListener('click', openNotificationOptionsModal);
  }

  if (elements.closeNotificationOptionsModalBtn) {
    elements.closeNotificationOptionsModalBtn.addEventListener('click', closeNotificationOptionsModal);
  }

  if (elements.cancelNotificationOptionsBtn) {
    elements.cancelNotificationOptionsBtn.addEventListener('click', closeNotificationOptionsModal);
  }

  // Sound Test Button
  if (elements.testSoundBtn) {
    elements.testSoundBtn.addEventListener('click', () => {
      window.NotificationManager.playNotificationSound();
      window.showToast('Audio chime preview played! 🔔', 'info');
    });
  }

  // Save Notification Options
  if (elements.saveNotificationOptionsBtn) {
    elements.saveNotificationOptionsBtn.addEventListener('click', async () => {
      const browserAlerts = elements.notifOptBrowser ? elements.notifOptBrowser.checked : false;
      const dueAlerts = elements.notifOptDue ? elements.notifOptDue.checked : true;
      const sound = elements.notifOptSound ? elements.notifOptSound.checked : true;
      const email = elements.notifOptEmail ? elements.notifOptEmail.checked : true;
      const leadMinutes = elements.notifOptLeadTime ? parseInt(elements.notifOptLeadTime.value, 10) : 60;

      // Request desktop permission if user turned on browser notifications
      if (browserAlerts && ('Notification' in window) && Notification.permission !== 'granted') {
        await window.NotificationManager.requestNotificationPermission();
      }

      // Save locally
      window.NotificationManager.saveNotificationSettings({
        browserAlerts,
        dueAlerts,
        sound,
        email,
        leadMinutes
      });

      // Persist to user profile backend
      try {
        await window.api.put('/api/auth/preferences', {
          emailNotifications: email,
          browserNotifications: browserAlerts,
          soundAlerts: sound,
          reminderLeadMinutes: leadMinutes
        });

        const currentUser = window.Auth.getUser();
        if (currentUser) {
          currentUser.preferences = {
            ...(currentUser.preferences || {}),
            emailNotifications: email,
            browserNotifications: browserAlerts,
            soundAlerts: sound,
            reminderLeadMinutes: leadMinutes
          };
          localStorage.setItem('taskmaster_user', JSON.stringify(currentUser));
        }
      } catch (err) {
        console.warn('Could not sync preferences to backend:', err.message);
      }

      if (sound) {
        window.NotificationManager.playNotificationSound();
      }

      window.showToast('Notification options updated successfully! ✨', 'success');
      closeNotificationOptionsModal();
    });
  }

  // Helper functions
  function isTaskOverdue(task) {
    if (task.status === 'Completed' || !task.dueDate) return false;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return new Date(task.dueDate) < startOfToday;
  }

  function isTaskDueToday(task) {
    if (task.status === 'Completed' || !task.dueDate) return false;
    const now = new Date();
    const d = new Date(task.dueDate);
    return (
      d.getDate() === now.getDate() &&
      d.getMonth() === now.getMonth() &&
      d.getFullYear() === now.getFullYear()
    );
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Kickstart
  loadDashboard();
});
