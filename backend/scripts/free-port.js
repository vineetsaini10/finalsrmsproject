const { execSync } = require('child_process');

const port = Number(process.argv[2] || process.env.PORT || 5000);

function parsePidsFromNetstat(output, portNum) {
  const lines = String(output).split(/\r?\n/).filter(Boolean);
  const pids = new Set();
  for (const line of lines) {
    if (!line.includes(`:${portNum}`)) continue;
    if (!/LISTENING|LISTEN/i.test(line)) continue;
    const parts = line.trim().split(/\s+/);
    const pid = parts[parts.length - 1];
    if (/^\d+$/.test(pid)) pids.add(Number(pid));
  }
  return [...pids];
}

function isWindows() {
  return process.platform === 'win32';
}

function findPidsOnPort(portNum) {
  try {
    if (isWindows()) {
      const out = execSync(`netstat -ano | findstr :${portNum}`, { stdio: ['ignore', 'pipe', 'ignore'] });
      return parsePidsFromNetstat(out, portNum);
    }

    const out = execSync(`lsof -ti tcp:${portNum} -sTCP:LISTEN`, { stdio: ['ignore', 'pipe', 'ignore'] });
    return String(out)
      .split(/\r?\n/)
      .map(s => s.trim())
      .filter(Boolean)
      .filter(s => /^\d+$/.test(s))
      .map(Number);
  } catch {
    return [];
  }
}

function killPid(pid) {
  try {
    if (isWindows()) {
      execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
    } else {
      process.kill(pid, 'SIGKILL');
    }
    return true;
  } catch {
    return false;
  }
}

const selfPid = process.pid;
const pids = findPidsOnPort(port).filter(pid => pid !== selfPid);

if (pids.length === 0) {
  console.log(`[dev] Port ${port} is free.`);
  process.exit(0);
}

let killed = 0;
for (const pid of pids) {
  if (killPid(pid)) killed += 1;
}

const stillUsed = findPidsOnPort(port).filter(pid => pid !== selfPid);
if (stillUsed.length > 0) {
  console.error(`[dev] Failed to free port ${port}. Remaining PID(s): ${stillUsed.join(', ')}`);
  process.exit(1);
}

console.log(`[dev] Freed port ${port}. Terminated ${killed} process(es).`);
