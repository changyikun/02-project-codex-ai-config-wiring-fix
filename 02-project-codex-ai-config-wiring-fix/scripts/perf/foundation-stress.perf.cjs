const { performance } = require('node:perf_hooks');

const roleCount = Number(process.env.ROLES || 10000);
const months = Number(process.env.MONTHS || 100000);
const stressCap = 100;

const stress = new Uint16Array(roleCount);
const speed = new Uint8Array(roleCount);
for (let i = 0; i < roleCount; i += 1) speed[i] = 3 + (i % 4);

const cpuStart = process.cpuUsage();
const memStart = process.memoryUsage().rss;
const t0 = performance.now();

for (let m = 0; m < months; m += 1) {
  const relief = m % 7 === 0 ? 2 : 0;
  for (let i = 0; i < roleCount; i += 1) {
    const next = stress[i] + speed[i] - relief;
    stress[i] = next >= stressCap ? stressCap : next;
  }
}

const t1 = performance.now();
const cpu = process.cpuUsage(cpuStart);
const rss = process.memoryUsage().rss;

let outOfRange = 0;
for (let i = 0; i < roleCount; i += 1) {
  if (stress[i] < 0 || stress[i] > 100) outOfRange += 1;
}

const result = {
  roles: roleCount,
  months,
  durationMs: Number((t1 - t0).toFixed(2)),
  cpuUserSec: Number((cpu.user / 1e6).toFixed(2)),
  cpuSystemSec: Number((cpu.system / 1e6).toFixed(2)),
  memoryRssMb: Number((rss / 1024 / 1024).toFixed(2)),
  memoryDeltaMb: Number(((rss - memStart) / 1024 / 1024).toFixed(2)),
  outOfRange,
  pass: outOfRange === 0,
};

console.log(JSON.stringify(result, null, 2));
