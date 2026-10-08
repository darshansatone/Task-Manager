const dotenv = require('dotenv');
dotenv.config();

const User = require('../models/User');
const Category = require('../models/Category');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');

const seedData = async () => {
  try {
    console.log('[Seed] Connecting to Supabase database...');

    console.log('[Seed] Clearing existing demo data...');
    const demoEmail = 'alex@example.com';
    const existingUser = await User.findByEmail(demoEmail);
    if (existingUser) {
      await Task.deleteMany({ user: existingUser.id });
      await Category.deleteMany({ user: existingUser.id });
      await ActivityLog.deleteMany({ user: existingUser.id });
    }

    let user;
    if (existingUser) {
      user = existingUser;
    } else {
      console.log('[Seed] Creating demo user...');
      user = await User.create({
        name: 'Alex Rivera',
        email: demoEmail,
        password: 'password123',
        preferences: { theme: 'dark', emailNotifications: true }
      });
    }

    console.log('[Seed] Creating categories...');
    const categories = await Category.insertMany([
      { name: 'Work', color: '#3b82f6', icon: 'briefcase', user: user.id },
      { name: 'Study', color: '#8b5cf6', icon: 'book-open', user: user.id },
      { name: 'Personal', color: '#ec4899', icon: 'user', user: user.id },
      { name: 'Projects', color: '#10b981', icon: 'folder', user: user.id },
      { name: 'Important', color: '#ef4444', icon: 'alert-circle', user: user.id }
    ]);

    const workCat = categories.find((c) => c.name === 'Work');
    const studyCat = categories.find((c) => c.name === 'Study');
    const personalCat = categories.find((c) => c.name === 'Personal');
    const projectCat = categories.find((c) => c.name === 'Projects');
    const importantCat = categories.find((c) => c.name === 'Important');

    const now = new Date();
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const twoDaysAgo = new Date(Date.now() - 48 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    console.log('[Seed] Creating sample tasks...');
    await Task.insertMany([
      {
        title: 'Finalize Q4 Architecture Proposal',
        description: 'Prepare microservices architecture diagram and security compliance checklist for leadership review.',
        status: 'In Progress',
        priority: 'High',
        category: workCat ? workCat.id : null,
        tags: ['Architecture', 'Q4', 'Cloud'],
        dueDate: tomorrow,
        reminder: true,
        isPinned: true,
        user: user.id,
        subtasks: [
          { title: 'Draft system design diagram', completed: true },
          { title: 'Review AWS cost projections', completed: true },
          { title: 'Security review with DevSecOps', completed: false }
        ]
      },
      {
        title: 'Supabase PostgreSQL Schema Optimization & Indexing',
        description: 'Analyze query performance for high-traffic endpoints and ensure foreign key indexes are optimal.',
        status: 'Pending',
        priority: 'High',
        category: projectCat ? projectCat.id : null,
        tags: ['Database', 'Optimization', 'Backend', 'PostgreSQL'],
        dueDate: now, // Due today
        reminder: true,
        isPinned: true,
        user: user.id,
        subtasks: [
          { title: 'Profile slowest aggregation pipelines', completed: false },
          { title: 'Add compound indexes on user + status', completed: false }
        ]
      },
      {
        title: 'Review Machine Learning Chapter 4 & 5',
        description: 'Complete practice questions on Gradient Descent and neural network backpropagation.',
        status: 'In Progress',
        priority: 'Medium',
        category: studyCat ? studyCat.id : null,
        tags: ['AI', 'Coursework'],
        dueDate: nextWeek,
        reminder: false,
        user: user.id,
        subtasks: [
          { title: 'Read chapter summary', completed: true },
          { title: 'Implement gradient descent in Python', completed: false }
        ]
      },
      {
        title: 'Annual Health Checkup & Dental Cleaning',
        description: 'Confirm appointment with clinic and carry medical history records.',
        status: 'Pending',
        priority: 'Low',
        category: personalCat ? personalCat.id : null,
        tags: ['Health', 'Routine'],
        dueDate: twoDaysAgo, // Overdue
        reminder: true,
        user: user.id,
        subtasks: []
      },
      {
        title: 'Deploy TaskMaster Production Cluster on Supabase',
        description: 'Configured environment variables, automated health checks, and verified SSL certificates.',
        status: 'Completed',
        priority: 'High',
        category: projectCat ? projectCat.id : null,
        tags: ['DevOps', 'Deployment', 'Supabase'],
        dueDate: yesterday,
        completedAt: yesterday,
        user: user.id,
        subtasks: [
          { title: 'Setup Supabase tables', completed: true },
          { title: 'Verify SSL and RLS policies', completed: true }
        ]
      },
      {
        title: 'Renew Server Domain Names',
        description: 'Check expiring domains on registrar and renew auto-charge settings.',
        status: 'Completed',
        priority: 'Medium',
        category: importantCat ? importantCat.id : null,
        tags: ['Infra', 'Billing'],
        dueDate: twoDaysAgo,
        completedAt: twoDaysAgo,
        user: user.id,
        subtasks: []
      }
    ]);

    await ActivityLog.create({
      userId: user.id,
      action: 'TASK_CREATED',
      taskTitle: 'Finalize Q4 Architecture Proposal',
      details: 'High priority project kickoff'
    });

    await ActivityLog.create({
      userId: user.id,
      action: 'TASK_COMPLETED',
      taskTitle: 'Deploy TaskMaster Production Cluster on Supabase',
      details: 'Completed deployment'
    });

    console.log('--------------------------------------------------');
    console.log('[Seed] Supabase demo data created successfully!');
    console.log('Login credentials:');
    console.log(`  Email:    ${demoEmail}`);
    console.log('  Password: password123');
    console.log('--------------------------------------------------');

    process.exit(0);
  } catch (err) {
    console.error('[Seed] Error seeding database:', err);
    process.exit(1);
  }
};

seedData();
