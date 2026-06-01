# GM 指令说明

## 福德单次调整
- 命令语义：`fortune +/-1`
- 对应接口：`POST /api/v1/foundation/fortune/adjust`

## 福德批量调整
- 命令语义：`fortune batch`
- 对应接口：`POST /api/v1/foundation/fortune/adjust-batch`

## 动态线路配置热加载
- 命令语义：`line reload`
- 对应接口：`POST /api/v1/foundation/config/reload`

## 快照回滚
- 命令语义：`rollback {snapshotId}`
- 对应接口：`POST /api/v1/foundation/rollback`
- 限制：快照创建时间必须在 7 天内
