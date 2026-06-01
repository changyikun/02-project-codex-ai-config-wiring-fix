type RomanceStyle = 'none' | 'restrained' | 'teasing' | 'devotional' | 'dangerous';
type ConflictStyle = 'ritual_pressure' | 'soft_knife' | 'direct_rebuke' | 'avoidant';
type SecrecyStyle = 'deny' | 'deflect' | 'partial_hint' | 'silence';
type PersonaNpcKind = 'consort' | 'tool' | 'ambient' | 'special';

interface PersonaGuardSource {
  id: string;
  name: string;
  rank: string;
  personality: string;
}

export interface PersonaGuard {
  npcId: string;
  npcKind: PersonaNpcKind;
  identity: string;
  speechStyle: string[];
  romanceStyle: RomanceStyle;
  conflictStyle: ConflictStyle;
  secrecyStyle: SecrecyStyle;
  tabooTopics: string[];
  knowledgeBoundary: string[];
}

const TOOL_NPC_NAMES = new Set(['杜娘', '娇娇', '布自游']);
const AMBIENT_NPC_NAMES = new Set(['连翘', '当一', '简宁']);
const SPECIAL_NPC_NAMES = new Set(['太后', '容安', '阿翎']);

const splitSpeechStyle = (personality: string): string[] =>
  personality
    .split(/[、,，|/\s]+/u)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);

export const resolvePersonaNpcKind = ({ name, rank }: PersonaGuardSource): PersonaNpcKind => {
  if (TOOL_NPC_NAMES.has(name)) {
    return 'tool';
  }

  if (SPECIAL_NPC_NAMES.has(name) || rank === '皇帝' || rank === '太后') {
    return 'special';
  }

  if (AMBIENT_NPC_NAMES.has(name) || /医官|执事|伶人/u.test(rank)) {
    return 'ambient';
  }

  return 'consort';
};

const resolveRomanceStyle = (source: PersonaGuardSource, npcKind: PersonaNpcKind): RomanceStyle => {
  if (npcKind === 'tool') {
    return 'none';
  }

  if (source.name === '太后') {
    return 'none';
  }

  if (source.name === '容安' || source.rank === '皇帝') {
    return 'dangerous';
  }

  if (/清冷|寡言|克制|守密|端方/u.test(source.personality)) {
    return 'restrained';
  }

  if (/温顺|体贴|活泼|开朗|轻柔/u.test(source.personality)) {
    return 'teasing';
  }

  return npcKind === 'ambient' ? 'restrained' : 'restrained';
};

const resolveConflictStyle = (source: PersonaGuardSource, npcKind: PersonaNpcKind): ConflictStyle => {
  if (npcKind === 'special' || source.rank === '太后' || source.rank === '皇帝') {
    return 'ritual_pressure';
  }

  if (/骄矜|好胜|锋|强势/u.test(source.personality)) {
    return 'soft_knife';
  }

  if (/刚烈|直率|凌厉/u.test(source.personality)) {
    return 'direct_rebuke';
  }

  return npcKind === 'tool' ? 'avoidant' : 'avoidant';
};

const resolveSecrecyStyle = (source: PersonaGuardSource, npcKind: PersonaNpcKind): SecrecyStyle => {
  if (npcKind === 'special') {
    return 'partial_hint';
  }

  if (/守密|清醒|克制|端方|沉静/u.test(source.personality)) {
    return 'partial_hint';
  }

  return npcKind === 'tool' ? 'deflect' : 'deflect';
};

const buildTabooTopics = ({ name, rank }: PersonaGuardSource, npcKind: PersonaNpcKind): string[] => {
  const base = ['未触发主线真相', '真实血脉秘密', '案件真凶结论', '未公开怀孕或医疗秘密'];

  if (npcKind === 'tool') {
    return [...base, '交易硬规则改动', '深度情缘承诺', '后宫内部隐秘裁决'];
  }

  if (name === '太后') {
    return [...base, '轻佻调情', '越俎代庖改写宫规'];
  }

  if (name === '容安' || rank === '皇帝') {
    return [...base, '明示隐藏圣心数值', '未触发宠幸或立储结果'];
  }

  if (name === '阿翎') {
    return [...base, '未经上下文允许的故国机密'];
  }

  return [...base, '隐藏数值直白报数'];
};

const buildKnowledgeBoundary = ({ name }: PersonaGuardSource, npcKind: PersonaNpcKind): string[] => {
  const base = [
    '只能使用当前请求里给出的公开事实、关系快照和场景短存。',
    '不得声称知道未出现在上下文中的秘密、幕后真相、血脉、案件结论或隐藏数值。',
    '传闻、怀疑和误会必须以不确定语气表达，不能当作事实。',
  ];

  if (npcKind === 'tool') {
    return [...base, '工具 NPC 只可在买卖、见闻、边界感内回应，不得自发扩展成情缘型深关系。'];
  }

  if (name === '太后' || name === '容安') {
    return [...base, '高权力角色可以施压、试探、留白，但依旧不得越权知道系统未提供的隐藏真相。'];
  }

  if (name === '阿翎') {
    return [...base, '阿翎可以带故国旧识感，但不能凭空知道当前宫中未公开秘闻。'];
  }

  return base;
};

export const resolvePersonaGuard = (source: PersonaGuardSource): PersonaGuard => {
  const npcKind = resolvePersonaNpcKind(source);
  const speechStyle = splitSpeechStyle(source.personality);

  return {
    npcId: source.id,
    npcKind,
    identity: `${source.rank} ${source.name}`,
    speechStyle: speechStyle.length > 0 ? speechStyle : ['克制', '守礼', '话不说满'],
    romanceStyle: resolveRomanceStyle(source, npcKind),
    conflictStyle: resolveConflictStyle(source, npcKind),
    secrecyStyle: resolveSecrecyStyle(source, npcKind),
    tabooTopics: buildTabooTopics(source, npcKind),
    knowledgeBoundary: buildKnowledgeBoundary(source, npcKind),
  };
};
