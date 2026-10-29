const http = require('http');
const https = require('https');

async function checkHealth() {
  console.log(`[${new Date().toISOString()}] Starting health check...`);
  let healthy = true;
  
  const endpoints = [
    { name: 'Backend API', url: 'http://localhost:4000/health' },
    { name: 'Frontend App', url: 'http://localhost:3000/' }
  ];

  for (const ep of endpoints) {
    try {
      const isHealthy = await ping(ep.url);
      if (isHealthy) {
        console.log(`✅ ${ep.name} is UP.`);
      } else {
        console.error(`❌ ${ep.name} is DOWN (invalid response).`);
        healthy = false;
      }
    } catch (err) {
      console.error(`❌ ${ep.name} is DOWN (${err.message}).`);
      healthy = false;
    }
  }

  if (healthy) {
    console.log(`[${new Date().toISOString()}] Health check passed.`);
    process.exit(0);
  } else {
    console.error(`[${new Date().toISOString()}] Health check failed.`);
    process.exit(1);
  }
}

function ping(url) {
  return new Promise((resolve, reject) => {
    const lib = url.startsWith('https') ? https : http;
    const req = lib.get(url, (res) => {
      // Backend /health returns 200. Frontend / might return 200 or 30x.
      if (res.statusCode >= 200 && res.statusCode < 400) {
        resolve(true);
      } else {
        resolve(false);
      }
      res.resume();
    });
    req.on('error', reject);
    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Timeout after 5s'));
    });
  });
}

checkHealth();
