const express = require('express');
const router = express.Router();
const {
  getTasks,
  getTaskById,
  createTask,
  updateTask,
  updateTaskStatus,
  toggleTaskPin,
  deleteTask,
  restoreTask,
  emptyTrash,
  bulkUpdateStatus,
  bulkDelete,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  exportCsv
} = require('../controllers/taskController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

// Specific named routes before parametric routes
router.get('/export/csv', exportCsv);
router.delete('/trash/empty', emptyTrash);
router.patch('/bulk/status', bulkUpdateStatus);
router.post('/bulk/delete', bulkDelete);

// Base Task routes
router.route('/')
  .get(getTasks)
  .post(createTask);

// Single Task operations
router.route('/:id')
  .get(getTaskById)
  .put(updateTask)
  .delete(deleteTask);

router.patch('/:id/status', updateTaskStatus);
router.patch('/:id/pin', toggleTaskPin);
router.patch('/:id/restore', restoreTask);

// Subtask endpoints
router.post('/:id/subtasks', addSubtask);
router.patch('/:id/subtasks/:subtaskId', toggleSubtask);
router.delete('/:id/subtasks/:subtaskId', deleteSubtask);

module.exports = router;
