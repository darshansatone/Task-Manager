const supabase = require('../config/supabase');

class ActivityLogModel {
  static format(log) {
    if (!log) return null;
    return {
      id: log.id,
      _id: log.id,
      user: log.user_id,
      action: log.action,
      taskTitle: log.task_title || '',
      details: log.details || '',
      createdAt: log.created_at
    };
  }

  // Create an activity entry
  static async create({ user, userId, action, taskTitle = '', details = '' }) {
    const uId = userId || user;
    const { data, error } = await supabase
      .from('activity_logs')
      .insert({
        user_id: uId,
        action,
        task_title: taskTitle,
        details
      })
      .select()
      .single();

    if (error) throw error;
    return ActivityLogModel.format(data);
  }

  // Find recent logs for a user
  static async findRecent(userId, limit = 10) {
    const { data, error } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return (data || []).map(ActivityLogModel.format);
  }

  // Delete logs (for cleanup/seed)
  static async deleteMany(query = {}) {
    let builder = supabase.from('activity_logs').delete();
    if (query.user) builder = builder.eq('user_id', query.user);
    const { error } = await builder;
    if (error) throw error;
    return true;
  }
}

module.exports = ActivityLogModel;
