# 固定工具NPC人设

## 1. 用途

本文件用于收纳**不进入情缘管理、不可被攻略**的固定工具类 NPC。  
当前纳入范围：

- `娇娇`
- `杜娘`

## 2. 接入硬规则

- 本文件内全部角色 `relationship_managed = false`
- 本文件内全部角色 `can_romance = false`
- 这批角色只承担功能入口、提示、服务或交易，不进入可攻略池
- 若工具类 NPC 后续承接剧情，只能作为功能剧情，不转入情缘线

## 3. 调用模板

```yaml
npc_id:
display_name:
role_type: tool_npc
tool_scope:
relationship_managed: false
can_romance: false
entry_state: active
active_scene_tags: []
function_hooks: []
interaction_rules: []
notes:
```

## 4. 角色主档

### 4.1 娇娇

```yaml
npc_id: tool_jiaojiao
display_name: 娇娇
role_type: tool_npc
tool_scope: 寝殿陪侍 / 日常提示 / 生活引导
relationship_managed: false
can_romance: false
entry_state: active
active_scene_tags: [寝殿, 日常起居, 行动提示, 新手引导]
function_hooks:
  - bedchamber_service
  - daily_hint
  - life_prompt
interaction_rules:
  - 提供陪侍与生活类引导
  - 可承接寝殿内基础提示与操作说明
  - 不进入情缘系统
notes: 固定宫女 NPC，用于稳定承接寝殿内的日常交互。
```

### 4.2 杜娘

```yaml
npc_id: tool_du_niang
display_name: 杜娘
role_type: tool_npc
tool_scope: 宫门商店 / 物品售卖 / 物品回收
relationship_managed: false
can_romance: false
entry_state: active
active_scene_tags: [宫门, 商店, 交易入口]
function_hooks:
  - shop_open
  - item_sell
  - item_recycle
interaction_rules:
  - 负责物品售卖
  - 负责物品回收
  - 交易默认即时结算
pricing_rules:
  recycle_formula: floor(shop_price * 0.8)
  recycle_condition: 仅可回收已定义 shop_price 且允许售卖的物品
  extra_cost: 无额外体力消耗，无额外时段推进
notes: 宫门处固定商贩 NPC。回收价按该物品售卖价格的八折向下取整。
```

## 5. 当前接入建议

1. 娇娇挂到寝殿与日常引导系统。
2. 杜娘挂到宫门商店系统。
3. 物品表应至少补齐：
   - `shop_price`
   - `can_sell`
   - `can_recycle`
   - `recycle_price_override`
