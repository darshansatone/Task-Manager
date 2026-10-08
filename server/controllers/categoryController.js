const Category = require('../models/Category');
const Task = require('../models/Task');
const { logActivity } = require('../utils/helpers');

// @desc    Get all categories for the authenticated user
// @route   GET /api/categories
// @access  Private
exports.getCategories = async (req, res, next) => {
  try {
    const categories = await Category.findByUser(req.user.id);
    const countMap = await Task.getTaskCountsByCategory(req.user.id);

    const categoriesWithCount = categories.map((cat) => ({
      ...cat,
      taskCount: countMap[cat.id] || 0
    }));

    res.status(200).json({
      success: true,
      count: categoriesWithCount.length,
      data: categoriesWithCount
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Create a category
// @route   POST /api/categories
// @access  Private
exports.createCategory = async (req, res, next) => {
  try {
    const { name, color, icon } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Category name is required.'
      });
    }

    // Check duplicate
    const existing = await Category.findByName(req.user.id, name);
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists.'
      });
    }

    const category = await Category.create({
      name: name.trim(),
      color: color || '#6366f1',
      icon: icon || 'tag',
      userId: req.user.id
    });

    await logActivity(req.user.id, 'CATEGORY_CREATED', '', `Created category: ${category.name}`);

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: category
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update a category
// @route   PUT /api/categories/:id
// @access  Private
exports.updateCategory = async (req, res, next) => {
  try {
    const { name, color, icon } = req.body;
    const category = await Category.findById(req.params.id, req.user.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    const updated = await Category.update(req.params.id, req.user.id, {
      name,
      color,
      icon
    });

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      data: updated
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a category
// @route   DELETE /api/categories/:id
// @access  Private
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id, req.user.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Category not found.'
      });
    }

    await Category.delete(req.params.id, req.user.id);
    await logActivity(req.user.id, 'CATEGORY_DELETED', '', `Deleted category: ${category.name}`);

    res.status(200).json({
      success: true,
      message: 'Category deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
};
