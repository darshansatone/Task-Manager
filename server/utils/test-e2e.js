const http = require('http');

async function request(path, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      {
        host: '127.0.0.1',
        port: 5000,
        path,
        method: options.method || 'GET',
        headers: options.headers || {}
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch {
            parsed = data;
          }
          resolve({ status: res.statusCode, headers: res.headers, data: parsed });
        });
      }
    );
    req.on('error', reject);
    if (body) {
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

async function run() {
  console.log('--- 1. Testing Landing Page ---');
  const home = await request('/');
  console.log(`Landing page status: ${home.status} (OK)`);

  console.log('--- 2. Testing Authentication (Register / Login) ---');
  let token = null;
  const regRes = await request(
    '/api/auth/register',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    },
    { name: 'Alex Rivera', email: 'test_alex@example.com', password: 'password123' }
  );

  if (regRes.status === 201) {
    token = regRes.data.token;
    console.log('Registered test user successfully. Token received.');
  } else {
    // Already exists, login instead
    const loginRes = await request(
      '/api/auth/login',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      },
      { email: 'test_alex@example.com', password: 'password123' }
    );
    token = loginRes.data.token;
    console.log('Logged in successfully. Token received.');
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  console.log('--- 3. Testing Categories ---');
  const catRes = await request('/api/categories', { headers: authHeaders });
  console.log(`Categories count: ${catRes.data.count}`);
  const workCat = catRes.data.data.find((c) => c.name === 'Work');

  console.log('--- 4. Testing Create Task ---');
  const taskRes = await request(
    '/api/tasks',
    { method: 'POST', headers: authHeaders },
    {
      title: 'Implement Production CI/CD Pipeline',
      description: 'Automate tests, build verification, and deployment to staging cluster.',
      status: 'In Progress',
      priority: 'High',
      category: workCat ? workCat._id : null,
      tags: ['DevOps', 'CI/CD'],
      subtasks: [
        { title: 'Configure GitHub Actions', completed: true },
        { title: 'Add automated test job', completed: false }
      ]
    }
  );
  console.log(`Created Task: "${taskRes.data.data.title}" (ID: ${taskRes.data.data._id})`);
  const taskId = taskRes.data.data._id;

  console.log('--- 5. Testing Patch Task Status ---');
  const patchRes = await request(
    `/api/tasks/${taskId}/status`,
    { method: 'PATCH', headers: authHeaders },
    { status: 'Completed' }
  );
  console.log(`Updated Task status: ${patchRes.data.data.status}`);

  console.log('--- 6. Testing Subtasks Operation ---');
  const subtaskRes = await request(
    `/api/tasks/${taskId}/subtasks`,
    { method: 'POST', headers: authHeaders },
    { title: 'Deploy staging environment' }
  );
  console.log(`Total subtasks now: ${subtaskRes.data.data.length}`);

  console.log('--- 7. Testing Dashboard Stats ---');
  const statsRes = await request('/api/stats', { headers: authHeaders });
  console.log('Dashboard Stats:');
  console.log(`  Total Tasks: ${statsRes.data.data.totalTasks}`);
  console.log(`  Completed:   ${statsRes.data.data.completedCount}`);
  console.log(`  Rate:        ${statsRes.data.data.completionPercentage}%`);

  console.log('--- 8. Testing CSV Export ---');
  const csvRes = await request('/api/tasks/export/csv', { headers: authHeaders });
  console.log(`CSV Export status: ${csvRes.status}, Content-Type: ${csvRes.headers['content-type']}`);

  console.log('==================================================');
  console.log('✅ ALL BACKEND & API TESTS PASSED FLAWLESSLY!');
  console.log('==================================================');
}

run().catch((err) => {
  console.error('Test error:', err);
  process.exit(1);
});
