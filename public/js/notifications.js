// Toast Notifications & Browser Deadline Reminders

const NotificationManager = (() => {
  let toastContainer = null;
  let notifiedTaskIds = new Set();

  function getToastContainer() {
    if (!toastContainer) {
      toastContainer = document.querySelector('.toast-container');
      if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
      }
    }
    return toastContainer;
  }

  // Display rich toast
  function showToast(message, type = 'info', duration = 3500) {
    const container = getToastContainer();
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg width="20" height="20" fill="none" stroke="#10b981" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg width="20" height="20" fill="none" stroke="#ef4444" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/></svg>`;
    } else if (type === 'warning') {
      iconSvg = `<svg width="20" height="20" fill="none" stroke="#f59e0b" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>`;
    } else {
      iconSvg = `<svg width="20" height="20" fill="none" stroke="#6366f1" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;
    }

    toast.innerHTML = `
      <div style="flex-shrink:0;">${iconSvg}</div>
      <div style="flex:1;">${message}</div>
      <button style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-size:1.1rem; line-height:1;" onclick="this.parentElement.remove()">×</button>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // Audio notification chime using Web Audio API (zero external assets)
  function playNotificationSound() {
    const settings = getNotificationSettings();
    if (!settings.sound) return;

    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();

      // Dual-tone harmonic chime
      const now = ctx.currentTime;
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(784, now); // G5
      osc1.frequency.exponentialRampToValueAtTime(1046.5, now + 0.12); // C6

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(1046.5, now + 0.08);
      osc2.frequency.exponentialRampToValueAtTime(1318.5, now + 0.22); // E6

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);

      osc1.start(now);
      osc2.start(now + 0.08);
      osc1.stop(now + 0.45);
      osc2.stop(now + 0.45);
    } catch (e) {
      console.warn('Audio chime error:', e);
    }
  }

  // Notification Options & Settings Store
  const SETTINGS_KEY = 'taskmaster_notification_options';

  function getNotificationSettings() {
    const defaults = {
      browserAlerts: ('Notification' in window) && Notification.permission === 'granted',
      dueAlerts: true,
      sound: true,
      email: true,
      leadMinutes: 60
    };

    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? { ...defaults, ...JSON.parse(raw) } : defaults;
    } catch {
      return defaults;
    }
  }

  function saveNotificationSettings(newSettings) {
    const current = getNotificationSettings();
    const merged = { ...current, ...newSettings };
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
    return merged;
  }

  // Request browser notification permissions
  async function requestNotificationPermission() {
    if (!('Notification' in window)) {
      showToast('Browser notifications are not supported in this browser.', 'warning');
      return false;
    }

    if (Notification.permission === 'granted') {
      showToast('Notifications are already active!', 'success');
      saveNotificationSettings({ browserAlerts: true });
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        showToast('Notification reminders enabled!', 'success');
        saveNotificationSettings({ browserAlerts: true });
        return true;
      }
    }

    showToast('Notification permission was declined.', 'warning');
    saveNotificationSettings({ browserAlerts: false });
    return false;
  }

  // Process tasks into categorized notifications list
  function generateNotificationsList(tasks = []) {
    const now = new Date();
    const nowMs = now.getTime();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();

    const notifications = [];

    (tasks || []).forEach((task) => {
      if (task.status === 'Completed' || task.isTrash) return;

      if (task.dueDate) {
        const dueMs = new Date(task.dueDate).getTime();

        if (dueMs < startOfToday) {
          // Overdue
          notifications.push({
            id: `overdue-${task.id}`,
            taskId: task.id,
            title: `Overdue: ${task.title}`,
            desc: `Was due on ${new Date(task.dueDate).toLocaleDateString()}`,
            type: 'overdue',
            icon: '⚠️',
            time: 'Overdue',
            unread: true
          });
        } else if (dueMs >= startOfToday && dueMs <= endOfToday) {
          // Due Today
          notifications.push({
            id: `today-${task.id}`,
            taskId: task.id,
            title: `Due Today: ${task.title}`,
            desc: `Deadline at ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            type: 'due',
            icon: '⏰',
            time: 'Today',
            unread: true
          });
        } else if (dueMs > endOfToday && dueMs <= nowMs + 48 * 60 * 60 * 1000) {
          // Upcoming within 48h
          notifications.push({
            id: `upcoming-${task.id}`,
            taskId: task.id,
            title: `Upcoming: ${task.title}`,
            desc: `Due ${new Date(task.dueDate).toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}`,
            type: 'reminder',
            icon: '📅',
            time: 'Upcoming',
            unread: false
          });
        }
      }

      // Explicit reminder flag
      if (task.reminder && !task.dueDate) {
        notifications.push({
          id: `reminder-${task.id}`,
          taskId: task.id,
          title: `Reminder: ${task.title}`,
          desc: task.description || 'Action required',
          type: 'reminder',
          icon: '🔔',
          time: 'Active',
          unread: true
        });
      }
    });

    return notifications;
  }

  // Check tasks for impending deadlines & trigger browser/sound alerts
  function checkTaskReminders(tasks = []) {
    const settings = getNotificationSettings();
    if (!settings.dueAlerts) return;

    const now = new Date().getTime();
    const leadTimeMs = (settings.leadMinutes || 60) * 60 * 1000;

    let triggeredAlert = false;

    tasks.forEach((task) => {
      if (task.status === 'Completed' || task.isTrash || !task.dueDate) return;

      const dueTime = new Date(task.dueDate).getTime();
      const diff = dueTime - now;

      // Alert if due within lead time or overdue within last 15 min
      if (diff > -15 * 60 * 1000 && diff < leadTimeMs && !notifiedTaskIds.has(task._id || task.id)) {
        notifiedTaskIds.add(task._id || task.id);
        triggeredAlert = true;

        const title = diff < 0 ? `⚠️ Overdue Task: ${task.title}` : `⏰ Upcoming Deadline: ${task.title}`;
        const body = diff < 0
          ? 'This task has passed its deadline. Take action now!'
          : `Due soon at ${new Date(task.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // Browser desktop push alert
        if (settings.browserAlerts && ('Notification' in window) && Notification.permission === 'granted') {
          try {
            new Notification(title, {
              body,
              icon: '/favicon.ico'
            });
          } catch (e) {
            console.warn('Desktop notification error:', e);
          }
        }

        // In-app visual toast
        showToast(title, diff < 0 ? 'error' : 'warning');
      }
    });

    if (triggeredAlert && settings.sound) {
      playNotificationSound();
    }
  }

  return {
    showToast,
    requestNotificationPermission,
    checkTaskReminders,
    playNotificationSound,
    getNotificationSettings,
    saveNotificationSettings,
    generateNotificationsList
  };
})();

window.showToast = NotificationManager.showToast;
window.requestNotificationPermission = NotificationManager.requestNotificationPermission;
window.checkTaskReminders = NotificationManager.checkTaskReminders;
window.NotificationManager = NotificationManager;
