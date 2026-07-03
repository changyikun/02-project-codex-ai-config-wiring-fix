# 非妃嫔 NPC 配置表说明

`non_consort_npc_profiles.csv` 是当前版本非妃嫔 NPC 的唯一资料入口。妃嫔不写入此表，仍由妃嫔 roster / 生成模板维护。

## 字段

| 字段 | 含义 |
|---|---|
| `npcId` | 稳定 ID。不得使用旧 `npc-*` ID。 |
| `displayName` | 游戏内显示名。 |
| `identityLabel` | 身份标签，如皇帝、太监总管、妙音堂乐师。 |
| `npcKind` | NPC 类型，用于运行时分组。 |
| `gender` | `male`、`female` 或 `unknown`。 |
| `routeScope` | `all` 或路线 ID。 |
| `defaultLocationId` | 默认地图地点；无地图入口时留空。 |
| `portraitKey` | 剧情 / 对话表中引用的立绘 key。 |
| `portraitSrc` | 实际立绘资源路径；没有可留空。 |
| `isRomanceable` | 是否可进入情缘系统，不代表是否有普通好感。 |
| `bondTitle` | 情缘标题；可攻略角色必填。 |
| `bondSceneType` | 情缘面板中的场景类型；可攻略角色必填。 |
| `initialAffinity` | 初始常驻好感，当前多为 `0`。 |
| `personality` | 性格摘要，给本地对话 / 关系判定作人物口径。 |
| `summary` | 角色功能与背景摘要；可攻略角色必填。 |
| `notes` | 策划备注，不参与硬规则。 |

## 当前规则

- 可攻略名单由 `isRomanceable=true` 自动生成。
- 旧“连翘”不再作为 NPC 配置项；妙音堂乐师是 `miaoyin-musician / 凌萧`，舞者是 `miaoyin-dancer / 凌袖`。
- 杜娘、李公公、太后等可以有常驻好感，但 `isRomanceable=false`，不进入情缘系统。
- 数据结构处于开发期；字段结构不兼容时清旧存档，不做旧 ID / 旧 flag fallback。
