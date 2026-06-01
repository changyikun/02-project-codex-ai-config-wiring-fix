# 固定核心NPC人设（情缘管理接入版）

## 1. 用途

本文件用于收纳固定核心 NPC 中**纳入情缘管理且可被攻略**的角色主档。  
当前纳入范围：

- `太后`
- `皇帝`
- `简宁`
- `布自游`
- `当一`
- `卢安平`
- `连翘`

这些角色的共同点是：

- 不属于后宫固定剧情妃池
- 不属于工具类 NPC
- 会被主系统长期调用
- 统一纳入情缘管理
- 统一进入可攻略角色池

## 2. 接入硬规则

### 2.1 情缘管理规则

- 本文件内全部角色 `relationship_managed = true`
- 本文件内全部角色 `can_romance = true`
- 这些角色必须进入统一情缘调用层
- 情缘判断至少接入以下字段：
  - `toward_player_like`
  - `toward_player_love`
  - `toward_player_trust`
  - `romance_route_open`

### 2.2 系统字段规则

- 这批角色不强制复用妃嫔池的 `位分 / 宠爱 / 声望` 结构
- 若某角色本身同时与后宫主系统强绑定，可额外挂接专属字段，但情缘层必须独立存在
- 初始关系值允许按路线分配，不要求一刀切写死成全局常数

### 2.3 调用模板

```yaml
npc_id:
display_name:
role_type: core_romance_npc
sub_layer: authority_core | story_core
route_scope: global | route_dependent
portrait_pool:
portrait_binding:
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: []
system_role:
public_face:
hidden_core:
initial_relation:
  mode: route_dependent | fixed
  toward_player_like:
  toward_player_love:
  toward_player_trust:
event_ids: []
route_flags: []
notes:
```

## 3. 权力核心可攻略 NPC

### 3.1 太后

```yaml
npc_id: core_empress_dowager
display_name: 太后
role_type: core_romance_npc
sub_layer: authority_core
route_scope: global
portrait_pool: 待同步
portrait_binding: 待绑定
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: [寿康宫, 请安, 宫规, 后宫裁决, 节庆]
system_role: 后宫最高权力长辈角色
public_face: 待从既有固定角色稿同步
hidden_core: 待从既有固定角色稿同步
initial_relation:
  mode: route_dependent
  toward_player_like: 待按路线分配
  toward_player_love: 待按路线分配
  toward_player_trust: 待按路线分配
event_ids: []
route_flags: []
notes: 已明确纳入情缘管理并可攻略，详细人设与事件待从旧稿同步。
```

### 3.2 皇帝

```yaml
npc_id: core_emperor
display_name: 皇帝
role_type: core_romance_npc
sub_layer: authority_core
route_scope: global
portrait_pool: 待同步
portrait_binding: 待绑定
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: [御书房, 寝宫, 宫宴, 朝堂外延, 召见]
system_role: 帝王角色
public_face: 待从既有固定角色稿同步
hidden_core: 待从既有固定角色稿同步
initial_relation:
  mode: route_dependent
  toward_player_like: 待按路线分配
  toward_player_love: 待按路线分配
  toward_player_trust: 待按路线分配
event_ids: []
route_flags: []
notes: 已明确纳入情缘管理并可攻略，详细人设与事件待从旧稿同步。
```

## 4. 固定核心剧情可攻略 NPC

### 4.1 简宁

```yaml
npc_id: core_jian_ning
display_name: 简宁
role_type: core_romance_npc
sub_layer: story_core
route_scope: route_dependent
portrait_pool: 待同步
portrait_binding: 待绑定
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: [待同步]
system_role: 待从既有固定角色稿同步
public_face: 待从既有固定角色稿同步
hidden_core: 待从既有固定角色稿同步
initial_relation:
  mode: route_dependent
  toward_player_like: 待按路线分配
  toward_player_love: 待按路线分配
  toward_player_trust: 待按路线分配
event_ids: []
route_flags: []
notes: 已明确纳入情缘管理并可攻略，详细字段待从旧稿同步。
```

### 4.2 布自游

```yaml
npc_id: core_bu_ziyou
display_name: 布自游
role_type: core_romance_npc
sub_layer: story_core
route_scope: route_dependent
portrait_pool: 待同步
portrait_binding: 待绑定
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: [待同步]
system_role: 待从既有固定角色稿同步
public_face: 待从既有固定角色稿同步
hidden_core: 待从既有固定角色稿同步
initial_relation:
  mode: route_dependent
  toward_player_like: 待按路线分配
  toward_player_love: 待按路线分配
  toward_player_trust: 待按路线分配
event_ids: []
route_flags: []
notes: 已明确纳入情缘管理并可攻略，详细字段待从旧稿同步。
```

### 4.3 当一

```yaml
npc_id: core_dang_yi
display_name: 当一
role_type: core_romance_npc
sub_layer: story_core
route_scope: route_dependent
portrait_pool: 待同步
portrait_binding: 待绑定
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: [待同步]
system_role: 待从既有固定角色稿同步
public_face: 待从既有固定角色稿同步
hidden_core: 待从既有固定角色稿同步
initial_relation:
  mode: route_dependent
  toward_player_like: 待按路线分配
  toward_player_love: 待按路线分配
  toward_player_trust: 待按路线分配
event_ids: []
route_flags: []
notes: 已明确纳入情缘管理并可攻略，详细字段待从旧稿同步。
```

### 4.4 卢安平

```yaml
npc_id: core_lu_anping
display_name: 卢安平
role_type: core_romance_npc
sub_layer: story_core
route_scope: route_dependent
portrait_pool: 待同步
portrait_binding: 待绑定
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: [待同步]
system_role: 待从既有固定角色稿同步
public_face: 待从既有固定角色稿同步
hidden_core: 待从既有固定角色稿同步
initial_relation:
  mode: route_dependent
  toward_player_like: 待按路线分配
  toward_player_love: 待按路线分配
  toward_player_trust: 待按路线分配
event_ids: []
route_flags: []
notes: 已明确纳入情缘管理并可攻略，详细字段待从旧稿同步。
```

### 4.5 连翘

```yaml
npc_id: core_lianqiao
display_name: 连翘
role_type: core_romance_npc
sub_layer: story_core
route_scope: route_dependent
portrait_pool: 待同步
portrait_binding: 待绑定
relationship_managed: true
can_romance: true
entry_state: active
active_scene_tags: [待同步]
system_role: 待从既有固定角色稿同步
public_face: 待从既有固定角色稿同步
hidden_core: 待从既有固定角色稿同步
initial_relation:
  mode: route_dependent
  toward_player_like: 待按路线分配
  toward_player_love: 待按路线分配
  toward_player_trust: 待按路线分配
event_ids: []
route_flags: []
notes: 已明确纳入情缘管理并可攻略，详细字段待从旧稿同步。
```

## 5. 当前接入建议

1. 先将本文件角色全部纳入统一情缘池。
2. 再按路线或主线节点补充 `event_ids` 与 `route_flags`。
3. 详细人设、数值、事件以既有旧稿为准继续同步，不在当前阶段臆写。
