# 三维系统性能报告

## 压测脚本
- 脚本：`scripts/perf/foundation-stress.perf.cjs`
- 规模：1万角色 * 10万月次循环

## 实测结果
- roles: 10000
- months: 100000
- durationMs: 1350.18
- cpuUserSec: 1.28
- cpuSystemSec: 0.06
- memoryRssMb: 41.28
- memoryDeltaMb: 0.36
- outOfRange: 0
- pass: true

## 验收结论
- 压力值无越界（0~100）
- CPU 与内存均远低于目标阈值（CPU<=60%，内存<=2GB）
