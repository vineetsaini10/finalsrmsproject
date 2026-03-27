const fs = require('fs');
const path = require('path');

const nextDir = path.join(__dirname, '..', '.next');

try {
  if (fs.existsSync(nextDir)) {
    fs.rmSync(nextDir, { recursive: true, force: true });
    console.log('[dev] Cleared frontend/.next cache');
  } else {
    console.log('[dev] No frontend/.next cache to clear');
  }
} catch (err) {
  console.error('[dev] Failed to clear frontend/.next cache:', err.message);
  process.exit(1);
}
