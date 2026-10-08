const supabase = require('../config/supabase');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get comprehensive dashboard metrics
// @route   GET /api/stats
// @access  Private
exports.getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // Fetch all user tasks once to perform ultra-fast in-memory aggregation
    const { data: allTasks, error } = await supabase
      .from('tasks')
      .select('id, status, priority, due_date, is_pinned, is_trash, completed_at')
      .eq('user_id', userId);

    if (error) throw error;

    const tasks = allTasks || [];
    const activeTasks = tasks.filter((t) => !t.is_trash);

    // Counters
    const totalTasks = activeTasks.length;
    let pendingCount = 0;
    let inProgressCount = 0;
    let completedCount = 0;
    let overdueCount = 0;
    let todayCount = 0;
    let upcomingCount = 0;
    let pinnedCount = 0;
    const priorityMap = { High: 0, Medium: 0, Low: 0 };

    activeTasks.forEach((t) => {
      if (t.status === 'Pending') pendingCount++;
      if (t.status === 'In Progress') inProgressCount++;
      if (t.status === 'Completed') completedCount++;
      if (t.is_pinned) pinnedCount++;

      if (t.priority && priorityMap[t.priority] !== undefined) {
        priorityMap[t.priority]++;
      }

      if (t.due_date) {
        const d = new Date(t.due_date);
        if (d < startOfToday && t.status !== 'Completed') {
          overdueCount++;
        } else if (d >= startOfToday && d <= endOfToday) {
          todayCount++;
        } else if (d > endOfToday) {
          upcomingCount++;
        }
      }
    });

    const trashCount = tasks.filter((t) => t.is_trash).length;

    // Completion percentage
    const completionPercentage =
      totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    // Weekly Productivity Trend (Last 7 days)
    const sevenDaysAgo = new Date(startOfToday);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);

    const completedWeeklyMap = {};
    activeTasks.forEach((t) => {
      if (t.status === 'Completed' && t.completed_at) {
        const cDate = new Date(t.completed_at);
        if (cDate >= sevenDaysAgo) {
          const dateStr = cDate.toISOString().split('T')[0];
          completedWeeklyMap[dateStr] = (completedWeeklyMap[dateStr] || 0) + 1;
        }
      }
    });

    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(startOfToday);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
      weeklyData.push({
        date: dateStr,
        day: dayName,
        completed: completedWeeklyMap[dateStr] || 0
      });
    }

    // Recent activity logs
    const recentActivity = await ActivityLog.findRecent(userId, 10);

    res.status(200).json({
      success: true,
      data: {
        totalTasks,
        pendingCount,
        inProgressCount,
        completedCount,
        overdueCount,
        todayCount,
        upcomingCount,
        trashCount,
        pinnedCount,
        completionPercentage,
        priorityMap,
        weeklyData,
        recentActivity
      }
    });
  } catch (err) {
    next(err);
  }
};
