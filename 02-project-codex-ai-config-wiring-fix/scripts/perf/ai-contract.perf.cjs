const autocannon = require('autocannon');

const instance = autocannon({
  url: process.env.PERF_TARGET_URL || 'http://localhost:8787/api/v1/ai/calc',
  connections: 50,
  amount: 500,
  method: 'POST',
  headers: {
    'content-type': 'application/json',
  },
  body: JSON.stringify({
    traceId: 'perf-trace',
    action: '打探',
    player: {
      routeId: 'xiunv',
      name: '沈容华',
      silver: 180,
      stamina: 88,
      currentRankId: 'xuanhui',
      baseStats: { charm: 72, intellect: 58, intrigue: 46, prestige: 35, favor: 40, resilience: 60 },
      skills: { etiquette: 42, intrigue: 30, performance: 50, governance: 20, insight: 36 },
      persona: {
        title: '初入深宫的新枝',
        summary: '容色出众，尚未彻底学会隐藏锋芒。',
        strengths: ['容貌惊艳'],
        weaknesses: ['根基单薄'],
      },
    },
    emperor: { mood: '审视', sincerity: 42, nightlyInterest: 38 },
    location: '寝宫',
    time: { year: 1, month: 1, xun: 1, slotIndex: 0, slot: '晨起' },
    weights: { risk: 0.65, reward: 0.75, stability: 0.4 },
  }),
});

autocannon.track(instance, { renderProgressBar: true });

instance.on('done', (result) => {
  console.log(JSON.stringify({
    averageLatencyMs: result.latency.average,
    p99LatencyMs: result.latency.p99,
    requestsPerSec: result.requests.average,
    throughputBytesPerSec: result.throughput.average,
  }, null, 2));
});
