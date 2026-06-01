# 固定可攻略NPC人设（统一接入版）

## 1. 用途

本文件作为固定可攻略 NPC 的分层主档之一，用于给游戏接入层统一调用。  
当前这份文件纳入范围仅包括：

- 固定剧情妃：`姚玲儿 / 柳仪芳 / 江晚晚 / 年欣兰 / 沈妙清 / 陈婉宁 / 杜云嫣`
- 路线专属可攻略角色：`阿翎（尘缘夙错）`

并行文件归属：

- [固定核心NPC人设.md](</C:/02-project/game word/固定核心NPC人设.md>)
  - 收纳 `太后 / 皇帝 / 简宁 / 布自游 / 当一 / 卢安平 / 连翘`
  - 这些角色纳入情缘管理，且可攻略
- [固定工具NPC人设.md](</C:/02-project/game word/固定工具NPC人设.md>)
  - 收纳 `娇娇 / 杜娘`
  - 这些角色不纳入情缘管理，不可攻略

本文件不承载：

- 太后、皇帝等固定核心可攻略 NPC
- 非可攻略的功能型 NPC
- 具体对白文本

## 1.1 角色层级划分

当前角色接入建议分为 `5` 层：

### 第一层：权力核心可攻略 NPC

- 作用：
  主系统长期调用，承担世界观与后宫最高权力结构，同时纳入情缘管理，可被攻略。
- 当前属于这一层的角色：
  - `太后`
  - `皇帝`
- 文件归属建议：
  写入 `固定核心NPC人设.md` 的权力核心分栏。

### 第二层：固定核心剧情可攻略 NPC

- 作用：
  长期参与主线、案件、陪伴、引导、外部行动或关键情报，不属于妃嫔池，但会被系统反复调用，同时纳入情缘管理，可被攻略。
- 当前属于这一层的角色：
  - `简宁`
  - `布自游`
  - `当一`
  - `卢安平`
  - `连翘`
- 文件归属建议：
  写入 `固定核心NPC人设.md` 的核心剧情分栏。

### 第三层：工具类 NPC

- 作用：
  提供稳定功能入口，如陪侍、引导、售卖、回收、提示、生活服务，不承担大体量主线，但会高频调用。
- 当前属于这一层的角色：
  - `娇娇`
  - `杜娘`
- 文件归属建议：
  单独写入 `固定工具NPC人设.md`。
- 当前已明确硬规则：
  - `娇娇`：固定宫女 NPC，承担陪侍、日常提示、生活类引导。
  - `杜娘`：宫门处固定商贩 NPC，承担物品售卖与物品回收。
  - `杜娘回收规则`：回收价格 = 该物品售卖价格的 `80%`
  - 若物品不可售卖，则默认不可回收，除非后续在物品表中单独标记例外。

### 第四层：固定剧情妃

- 作用：
  属于后宫固定可攻略角色，参与妃嫔系统、位分系统、请安、宫务、宠爱、声望、事件判定。
- 当前属于这一层的角色：
  - `姚玲儿`
  - `柳仪芳`
  - `江晚晚`
  - `年欣兰`
  - `沈妙清`
  - `陈婉宁`
  - `杜云嫣`
- 文件归属建议：
  统一写入本文件，并与后宫事件、路线事件做挂接。

### 第五层：路线专属可攻略角色

- 作用：
  不属于后宫妃嫔池，但承担某条路线的核心感情锚点或关键抉择。
- 当前属于这一层的角色：
  - `阿翎（尘缘夙错）`
- 文件归属建议：
  仍可写入本文件，但必须和固定剧情妃分栏，不可混用后宫位分、宠爱、声望字段。

## 2. 接入硬规则

### 2.1 统一调用原则

- 每个角色只保留一份主档，不允许在路线文档里重复写整份人物卡。
- 游戏内所有剧情、事件、场景调用，统一通过 `npc_id` 引用。
- 情缘管理统一覆盖：
  - 第一层 `权力核心可攻略 NPC`
  - 第二层 `固定核心剧情可攻略 NPC`
  - 第四层 `固定剧情妃`
  - 第五层 `路线专属可攻略角色`
- 第三层 `工具类 NPC` 不进入情缘管理，不进入可攻略池。
- 路线稿只写“该角色在本路线何时出场、触发什么节点”，不重复底卡。
- 事件层只写 `event_id -> npc_id -> 条件 -> 结果` 的调用关系。

### 2.2 立绘调用原则

- 固定剧情妃的立绘只能调用 `C:/02-project/women`
- 若固定剧情妃未绑定合法立绘，则显示统一占位卡，不允许回退到其他目录。
- `阿翎` 不属于后宫妃嫔池，立绘目录后续单独定；在目录未定前，允许使用路线专属占位资源。

### 2.3 数值口径

- 固定剧情妃默认使用后宫数值体系：
  - `健康`：默认 `当前值 / 1000`
  - `声望`、`宠爱`、`压力`、`福德`、`野心`、`心计`、`容貌`、`气质`
  - `对玩家好感`
  - `对玩家倾情`
  - `对皇帝真心`
- `杜云嫣` 为特殊例外，健康采用 `当前值 / 500`
- `阿翎` 不参与后宫位分、宠爱、声望体系，改用路线角色字段：
  - `体魄`
  - `警觉`
  - `隐忍`
  - `对玩家牵挂`
  - `对玩家信任`

### 2.4 接入字段模板

```yaml
npc_id:
display_name:
role_type: fixed_consort | route_romance_npc
route_scope:
portrait_pool:
portrait_binding:
can_romance: true
entry_state:
active_scene_tags: []
core_personality: []
public_face:
hidden_core:
initial_stats:
initial_relation:
event_ids: []
route_flags: []
notes:
```

## 3. 角色总览

| npc_id | 角色名 | 类型 | 所属路线 | 当前定位 |
| --- | --- | --- | --- | --- |
| `consort_yao_linger` | 姚玲儿 | 固定剧情妃 | 兰因絮果 | 高位旧情竞争者，可转盟友 |
| `consort_liu_yifang` | 柳仪芳 | 固定剧情妃 | 兰因絮果 | 主动暧昧型，替影与自我认同 |
| `consort_jiang_wanwan` | 江晚晚 | 固定剧情妃 | 兰因絮果 | 清醒守密型，难攻略 |
| `consort_nian_xinlan` | 年欣兰 | 固定剧情妃 | 浮生如梦 | 傲娇试探型，后期和解 |
| `consort_shen_miaoqing` | 沈妙清 | 固定剧情妃 | 浮生如梦 | 旧友护短型，天然偏向玩家 |
| `consort_chen_wanning` | 陈婉宁 | 固定剧情妃 | 影落掖庭 | 条件型对手，可攻略后反水 |
| `consort_du_yunyan` | 杜云嫣 | 固定剧情妃 | 尘缘夙错 | 病弱依赖型，最终成全 |
| `route_aling` | 阿翎 | 路线专属可攻略角色 | 尘缘夙错 | 草原旧人，离宫线核心锚点 |

## 4. 固定剧情妃

### 4.1 姚玲儿

```yaml
npc_id: consort_yao_linger
display_name: 姚玲儿
role_type: fixed_consort
route_scope: 兰因絮果
portrait_pool: C:/02-project/women
portrait_binding: 待绑定
can_romance: true
entry_state: active
active_scene_tags: [长春宫, 后宫, 御花园, 宫宴, 宫务]
core_personality: [骄矜, 好胜, 重脸面, 嫉妒, 权位]
public_face: 贵妃，19岁，三品文官嫡女，得宠，高傲，极重体面
hidden_core: 与皇帝有旧情，前期把玩家视为威胁，中后期可因敬重或利益转为盟友
initial_stats:
  health: 720/1000
  prestige: 2180
  favor: 72
  pressure: 32
  blessing: 8
  ambition: 48
  scheming: 780
  beauty: 860
  bearing: 780
initial_relation:
  toward_player_like: -20
  toward_player_love: 0
  toward_emperor_truth: 70
event_ids:
  - yao_rumor_case
  - yao_banquet_seat
  - yao_old_affection_return
  - yao_power_bid
  - yao_alliance_or_break
route_flags:
  - yao_helped_rumor_case
  - yao_owes_player_once
  - yao_demoted_by_rumor
  - yao_betrayed_by_player
notes: 核心写法是体面、旧情、嫉妒、权位，不写成单薄恶妃。
```

### 4.2 柳仪芳

```yaml
npc_id: consort_liu_yifang
display_name: 柳仪芳
role_type: fixed_consort
route_scope: 兰因絮果
portrait_pool: C:/02-project/women
portrait_binding: 待绑定
can_romance: true
entry_state: active
active_scene_tags: [延禧宫偏殿, 回廊, 香道场景, 夜间拜访]
core_personality: [温顺, 钦慕, 主动, 体贴, 敏感]
public_face: 美人，18岁，商贾之女，表面安静知趣
hidden_core: 不会刁难玩家，内心钦慕玩家，会比普通妃子更主动暧昧；核心矛盾是替影与自我认同
initial_stats:
  health: 640/1000
  prestige: 390
  favor: 56
  pressure: 24
  blessing: 12
  ambition: 14
  scheming: 520
  beauty: 830
  bearing: 690
initial_relation:
  toward_player_like: 45
  toward_player_love: 30
  toward_emperor_truth: 22
event_ids:
  - liu_mirror_entry
  - liu_sachet_test
  - liu_substitute_rumor
  - liu_blocks_disaster
  - liu_true_self_choice
route_flags:
  - liu_admiration_route_open
  - liu_substitute_rumor_seen
  - liu_protected_player_once
notes: 关键词是替影、钦慕、主动、体贴、自我认同。
```

### 4.3 江晚晚

```yaml
npc_id: consort_jiang_wanwan
display_name: 江晚晚
role_type: fixed_consort
route_scope: 兰因絮果
portrait_pool: C:/02-project/women
portrait_binding: 待绑定
can_romance: true
entry_state: active
active_scene_tags: [钟粹宫, 夜路, 藏书场景, 御花园深夜]
core_personality: [清醒, 克制, 守密, 温柔, 敏锐]
public_face: 淑妃，22岁，四品文官庶女，端方从容，知礼寡言
hidden_core: 擅写话本却不敢示人，对皇帝并不爱慕，早已看透帝王本质；对玩家最初中立，不轻易被攻略
initial_stats:
  health: 690/1000
  prestige: 1860
  favor: 48
  pressure: 18
  blessing: 16
  ambition: 22
  scheming: 860
  beauty: 760
  bearing: 880
initial_relation:
  toward_player_like: 12
  toward_player_love: 0
  toward_emperor_truth: 8
event_ids:
  - jiang_moonlight_manuscript
  - jiang_pages_leak
  - jiang_sees_emperor
  - jiang_east_palace_shadow
  - jiang_paper_confidant
route_flags:
  - jiang_secret_known
  - jiang_trust_route_open
notes: 普通送礼与调情不能快速推进她的倾情，必须先建立守密与信任。
```

### 4.4 年欣兰

```yaml
npc_id: consort_nian_xinlan
display_name: 年欣兰
role_type: fixed_consort
route_scope: 浮生如梦
portrait_pool: C:/02-project/women
portrait_binding: 待绑定
can_romance: true
entry_state: active
active_scene_tags: [启祥宫, 请安, 宫务, 训诫场景, 深夜寝殿]
core_personality: [傲娇, 嘴硬, 嫉妒, 试探, 不服软]
public_face: 妃，20岁，四品武将嫡女，爱拿规矩压人，表面上对玩家与沈妙清多有挑刺
hidden_core: 她在玩家和沈妙清身上看见自己与旧友的影子，因此嫉妒，也因此反复试探；只要二人经得住考验，她会在深夜来访后与二人和解
initial_stats:
  health: 730/1000
  prestige: 1580
  favor: 49
  pressure: 20
  blessing: 10
  ambition: 24
  scheming: 610
  beauty: 780
  bearing: 760
initial_relation:
  toward_player_like: -8
  toward_player_love: 0
  toward_emperor_truth: 18
event_ids:
  - nian_first_barb
  - nian_rules_pressure
  - nian_old_friend_trace
  - nian_final_test
  - nian_late_night_reconcile
route_flags:
  - nian_tests_bond
  - nian_softens_after_standing_together
notes: 她只负责试探与刁难，不承担致命陷害、毁容、流产、建案等不可逆恶性事件。
```

### 4.5 沈妙清

```yaml
npc_id: consort_shen_miaoqing
display_name: 沈妙清
role_type: fixed_consort
route_scope: 浮生如梦
portrait_pool: C:/02-project/women
portrait_binding: 待绑定
can_romance: true
entry_state: active
active_scene_tags: [储秀宫东偏殿, 请安, 受罚场景, 私下互保]
core_personality: [清冷, 护短, 跟随, 寡言, 认死理]
public_face: 常在，15岁，六品武将嫡女，表面安静冷淡
hidden_core: 因玩家而入宫，对玩家天然偏向，情感起点高，但关系并非绝对安全；路线压力主要由年欣兰提供
initial_stats:
  health: 710/1000
  prestige: 215
  favor: 22
  pressure: 14
  blessing: 20
  ambition: 6
  scheming: 430
  beauty: 700
  bearing: 750
initial_relation:
  toward_player_like: 78
  toward_player_love: 52
  toward_emperor_truth: 4
event_ids:
  - shen_entered_for_you
  - shen_pressured_by_nian
  - shen_takes_blame
  - shen_why_entered_palace
  - shen_stand_together
route_flags:
  - shen_old_friend_route
  - shen_shared_burden
notes: 她不是主动撩拨型，而是旧友护短型。重点写误会、互保与并肩。
```

### 4.6 陈婉宁

```yaml
npc_id: consort_chen_wanning
display_name: 陈婉宁
role_type: fixed_consort
route_scope: 影落掖庭
portrait_pool: C:/02-project/women
portrait_binding: 待绑定
can_romance: true
entry_state: active
active_scene_tags: [昭阳宫, 案件节点, 太医院, 雨夜夜谈]
core_personality: [端方, 克制, 温柔, 封口, 动摇]
public_face: 妃，20岁，二品文官庶女，会照拂人，说话得体
hidden_core: 知晓旧案真相，也知道自己家族参与过迫害玩家家族；若玩家不翻案，她不会主动加害，甚至会照拂；只有在高信任高倾情下才会背离母家
initial_stats:
  health: 760/1000
  prestige: 1680
  favor: 58
  pressure: 22
  blessing: 6
  ambition: 46
  scheming: 900
  beauty: 810
  bearing: 840
initial_relation:
  toward_player_like: 0
  toward_player_love: 0
  toward_emperor_truth: 26
event_ids:
  - chen_gentle_first_meet
  - chen_clue_missing
  - chen_false_care
  - chen_no_case_no_trouble
  - chen_sleeve_medicine
  - chen_unsaid_under_lamp
  - chen_turncoat_for_love
route_flags:
  - chen_secret_care_received
  - chen_romance_route_open
  - chen_case_turncoat
notes: 她的攻略不能靠送礼硬推，必须先证明玩家不是把她当线索工具。
```

### 4.7 杜云嫣

```yaml
npc_id: consort_du_yunyan
display_name: 杜云嫣
role_type: fixed_consort
route_scope: 尘缘夙错
portrait_pool: C:/02-project/women
portrait_binding: 待绑定
can_romance: true
entry_state: active
active_scene_tags: [永和宫, 病中探望, 夜谈, 静养场景]
core_personality: [娇气, 病弱, 依赖, 体贴, 成全]
public_face: 贵嫔，19岁，江南名门嫡女，娇气，怕苦怕冷，说话软，容易委屈
hidden_core: 身体不好，因此格外喜欢缠着玩家听草原故事；前期是依赖与亲近，中期转为心疼与不舍，后期知道阿翎后会鼓励玩家离开，并帮玩家打掩护
initial_stats:
  health: 420/500
  prestige: 1180
  favor: 44
  pressure: 26
  blessing: 18
  ambition: 8
  scheming: 420
  beauty: 820
  bearing: 870
initial_relation:
  toward_player_like: 32
  toward_player_love: 10
  toward_emperor_truth: 10
event_ids:
  - du_sick_cling
  - du_grassland_night_talk
  - du_feels_pain_for_you
  - du_knows_aling
  - du_reluctant_blessing
  - du_cover_escape
route_flags:
  - du_story_bond_started
  - du_story_bond_deepened
  - du_feels_for_player
  - du_knows_aling
  - du_supports_escape
  - du_cover_escape
notes: 她的推进顺序固定为依赖 -> 亲近 -> 心疼 -> 不舍 -> 成全，不允许跳段。
```

## 5. 路线专属可攻略角色

### 5.1 阿翎

```yaml
npc_id: route_aling
display_name: 阿翎
role_type: route_romance_npc
route_scope: 尘缘夙错
portrait_pool: 待定（非妃嫔立绘池）
portrait_binding: 待绑定
can_romance: true
entry_state: hidden
active_scene_tags: [回忆, 旧物, 边地消息, 离宫准备, 结局节点]
core_personality: [自由, 护短, 克制, 执拗, 可靠]
public_face: 尘缘夙错路线专属关键人物，来自草原，是玩家真正牵挂的人
hidden_core: 她不是后宫体系内的竞争者，而是整条路线“离开皇城、回到真正想去之处”的情感锚点；她的存在会持续拉扯玩家对宫中生活的认同感
initial_stats:
  physique: 860/1000
  vigilance: 820/1000
  endurance: 780/1000
initial_relation:
  toward_player_bond: 90
  toward_player_trust: 78
  toward_player_waiting: 88
event_ids:
  - aling_grassland_memory
  - aling_old_token_return
  - aling_border_trace
  - aling_still_waiting
  - aling_escape_anchor
route_flags:
  - aling_memory_awakened
  - aling_trace_found
  - aling_route_confirmed
  - aling_reunion_ready
notes: 阿翎不需要高频出场。她更适合作为记忆、旧物、消息与最终抉择的核心锚点，保持稀缺感才有分量。
```

## 6. 路线挂载关系

### 6.1 兰因絮果

- `consort_yao_linger`
- `consort_liu_yifang`
- `consort_jiang_wanwan`

### 6.2 浮生如梦

- `consort_nian_xinlan`
- `consort_shen_miaoqing`

### 6.3 影落掖庭

- `consort_chen_wanning`

### 6.4 尘缘夙错

- `consort_du_yunyan`
- `route_aling`

## 7. 接入建议

### 7.1 游戏层推荐拆法

- `character_master_data`
  只保存本文件中的角色主档
- `route_character_mounts`
  保存角色与路线的挂载关系
- `character_event_hooks`
  保存 `event_id -> npc_id -> flags` 的调用关系

### 7.2 调用顺序建议

1. 先根据路线加载可用 `npc_id`
2. 再根据场景标签过滤可见角色
3. 再根据 `route_flags` 与事件条件决定能否触发具体节点
4. 最后根据关系值、倾情值、隐藏标记决定文本分支

### 7.3 当前落地优先级

- 优先把 `npc_id / route_scope / portrait_pool / event_ids / route_flags` 这五类字段接进游戏
- 关系值与分支数值之后仍可继续细调，但主调用结构不要再改形
