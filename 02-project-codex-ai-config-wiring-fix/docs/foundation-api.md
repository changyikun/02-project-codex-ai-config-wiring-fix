# 家世—福德—压力 API 文档

## 基础配置
- `GET /api/v1/foundation/config`：读取当前家世与线路压力配置（支持热更新后读取最新值）
- `POST /api/v1/foundation/config/reload`：运行时重载配置文件
- `POST /api/v1/foundation/config/route-stress`：运行时新增/更新某条线路压力配置（无需重启）

## 角色初始化
- `POST /api/v1/foundation/characters/init`
- 请求体
```json
{
  "characterId": "c001",
  "routeId": "lanyinxuguo",
  "familyBackgroundId": "official_5"
}
```

## 福德 GM 指令接口
- 单次修正：`POST /api/v1/foundation/fortune/adjust`
  - `delta` 仅允许 `1` 或 `-1`
- 批量修正：`POST /api/v1/foundation/fortune/adjust-batch`
  - 可按角色列表批量增减，写入审计日志

## 月度推进与压力
- `POST /api/v1/foundation/monthly-tick`
  - 根据线路基础压力增速推进，压力上限 100
  - 达到 100 自动判定精神崩溃结局快照

## 血脉与后位限制校验
- `POST /api/v1/foundation/promotion/validate`
- `POST /api/v1/foundation/prince-candidate/validate`

## 特殊家世重写
- `POST /api/v1/foundation/line-clear/rewrite`
  - 仅对“罪臣之后”生效，通关后重写为“四品官员之女”

## 回滚
- `POST /api/v1/foundation/rollback`
- 仅支持 7 天内快照

## 兰因絮果专属（皇后线）
- `GET /api/v1/foundation/lanyinxuguo/endings/table`：读取五大结局校验表
- `POST /api/v1/foundation/lanyinxuguo/start-template`：生成谢令仪开局模板（支持手动覆盖）
- `POST /api/v1/foundation/lanyinxuguo/stress-life/tick`：执行“压力>80 每旬扣寿0.2”的全局监听
- `POST /api/v1/foundation/lanyinxuguo/npc-madness/check`：执行 NPC 疯癫概率判定（疯癫后永久禁侍寝）
- `POST /api/v1/foundation/lanyinxuguo/endings/validate`：五大结局条件严格校验

## 错误码（新增）
- `FOUNDATION_4000` 初始化请求体非法
- `FOUNDATION_4001` 福德单次修正请求非法
- `FOUNDATION_4002` 福德批量修正请求非法
- `FOUNDATION_4003` 月度推进请求非法
- `FOUNDATION_4004` 晋升校验请求非法
- `FOUNDATION_4005` 回滚请求非法
- `FOUNDATION_4006` 线路压力配置请求非法
- `FOUNDATION_4007` 兰因开局模板请求非法
- `FOUNDATION_4008` 压力寿命监听请求非法
- `FOUNDATION_4009` NPC疯癫判定请求非法
- `FOUNDATION_4010` 兰因结局校验请求非法
