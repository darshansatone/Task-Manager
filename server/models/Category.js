const supabase = require('../config/supabase');

class CategoryModel {
  static format(category) {
    if (!category) return null;
    return {
      id: category.id,
      _id: category.id, // Compatibility with existing frontend
      name: category.name,
      color: category.color || '#6366f1',
      icon: category.icon || 'tag',
      user: category.user_id,
      userId: category.user_id,
      createdAt: category.created_at,
      updatedAt: category.updated_at
    };
  }

  // Find all categories for a user
  static async findByUser(userId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId)
      .order('name', { ascending: true });

    if (error) throw error;
    return (data || []).map(CategoryModel.format);
  }

  // Find single category by ID and user
  static async findById(id, userId) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    if (!data) return null;
    return CategoryModel.format(data);
  }

  // Check duplicate category name for user
  static async findByName(userId, name) {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;
    const match = (data || []).find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
    return match ? CategoryModel.format(match) : null;
  }

  // Count categories for user
  static async countDocuments(query = {}) {
    let builder = supabase.from('categories').select('*', { count: 'exact', head: true });
    if (query.user) builder = builder.eq('user_id', query.user);
    const { count, error } = await builder;
    if (error) throw error;
    return count || 0;
  }

  // Create new category
  static async create({ name, color, icon, user, userId }) {
    const uId = userId || user;
    const { data, error } = await supabase
      .from('categories')
      .insert({
        name: name.trim(),
        color: color || '#6366f1',
        icon: icon || 'tag',
        user_id: uId
      })
      .select()
      .single();

    if (error) throw error;
    return CategoryModel.format(data);
  }

  // Insert multiple (for seed)
  static async insertMany(items) {
    const payload = items.map((c) => ({
      name: c.name.trim(),
      color: c.color || '#6366f1',
      icon: c.icon || 'tag',
      user_id: c.user || c.userId
    }));

    const { data, error } = await supabase.from('categories').insert(payload).select();
    if (error) throw error;
    return (data || []).map(CategoryModel.format);
  }

  // Update category
  static async update(id, userId, updates) {
    const payload = {};
    if (updates.name && updates.name.trim()) payload.name = updates.name.trim();
    if (updates.color) payload.color = updates.color;
    if (updates.icon) payload.icon = updates.icon;

    const { data, error } = await supabase
      .from('categories')
      .update(payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return CategoryModel.format(data);
  }

  // Delete category
  static async delete(id, userId) {
    // Unassign category from tasks first
    await supabase
      .from('tasks')
      .update({ category_id: null })
      .eq('category_id', id)
      .eq('user_id', userId);

    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  }

  // Delete many
  static async deleteMany(query = {}) {
    let builder = supabase.from('categories').delete();
    if (query.user) builder = builder.eq('user_id', query.user);
    const { error } = await builder;
    if (error) throw error;
    return true;
  }
}

module.exports = CategoryModel;
