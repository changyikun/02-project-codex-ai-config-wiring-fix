import playerAttributeFieldsCsv from './csv/player_attribute_fields.csv?raw';
import globalNumericRulesCsv from './csv/global_numeric_rules.csv?raw';
import routeInitialProfilesCsv from './csv/route_initial_profiles.csv?raw';
import routeInitialStatsCsv from './csv/route_initial_stats.csv?raw';
import chamberActionsCsv from './csv/chamber_actions.csv?raw';
import monthlyExpenseStrategiesCsv from './csv/monthly_expense_strategies.csv?raw';
import rankPrestigeTableCsv from './csv/rank_prestige_table.csv?raw';
import favorTiersCsv from './csv/favor_tiers.csv?raw';
import inventoryItemsCsv from './csv/inventory_items.csv?raw';
import craftWorksCsv from './csv/craft_works.csv?raw';
import fixedConsortRosterCsv from './csv/fixed_consort_roster.csv?raw';
import palaceStrifeSeverityRulesCsv from './csv/palace_strife_severity_rules.csv?raw';
import palaceStrifeRumorItemsCsv from './csv/palace_strife_rumor_items.csv?raw';
import yangxinVerdictChoiceRulesCsv from './csv/yangxin_verdict_choice_rules.csv?raw';
import nightlyEmperorAloneRatesCsv from './csv/nightly_emperor_alone_rates.csv?raw';
import nightlyFavorWeightsCsv from './csv/nightly_favor_weights.csv?raw';
import nightlyInterestEffectsCsv from './csv/nightly_interest_effects.csv?raw';
import nightlyRuntimeRulesCsv from './csv/nightly_runtime_rules.csv?raw';
import generatedConsortRulesCsv from './csv/generated_consort_rules.csv?raw';
import generatedConsortTemplatesCsv from './csv/generated_consort_templates.csv?raw';
import { RarityColorId, type RangeTuple, type 位分声望条目 } from '../../config/types';
import type {
  ConcubineStats,
  ConcubineStatus,
  CraftWorkType,
  InventoryItem,
  MonthlyExpenseStrategyId,
  PalaceStrifeSeverity,
  PlayerResidenceName,
  RouteId,
  YangxinVerdictChoiceId,
} from '../types';
import {
  parseBoolean,
  parseNumericCsv,
  parseOptionalBoolean,
  parseOptionalNumber,
  parseRequiredNumber,
  parseStatDeltas,
  splitPipeList,
} from './csvNumericLoader';

export interface NumericAttributeFieldConfig {
  key: string;
  label: string;
  min: number;
  max: number;
  value: number;
  runtimeMultiplier: number;
  category: 'main' | 'skill';
  note: string;
}

export interface NumericRuleConfig {
  id: string;
  value?: number;
  min?: number;
  max?: number;
  booleanValue?: boolean;
  notes: string;
}

export interface NumericRouteInitialProfileConfig {
  routeId: RouteId;
  defaultName: string;
  familyDisplay: string;
  residenceDisplay: PlayerResidenceName;
  ageRange: RangeTuple;
  pointsRange: RangeTuple;
  silverRange: RangeTuple;
  prestigeRange: RangeTuple;
  stressRange: RangeTuple;
  favorRange: RangeTuple;
  trueHeartRange: RangeTuple;
  initialRankOptions: string[];
  statsLocked: boolean;
  familyOptions: string[];
}

export interface NumericChamberActionConfig {
  id: string;
  label: string;
  summary: string;
  timeCost: number;
  staminaCost: number;
  statDeltas?: Record<string, number>;
  stressDelta?: number;
  favorDelta?: number;
}

export interface NumericMonthlyExpenseStrategyConfig {
  id: MonthlyExpenseStrategyId;
  label: string;
  expenseRate: number;
  prestigeDelta: number;
  healthDelta: number;
  isDefault: boolean;
  summary: string;
}

export interface NumericFavorTierConfig {
  id: string;
  label: string;
  range: RangeTuple;
  colorId: RarityColorId;
  maxCount: number;
}

export interface NumericInventoryItem extends InventoryItem {
  pools: string[];
}

export interface NumericCraftWorkConfig {
  workId: string;
  type: CraftWorkType;
  name: string;
  rarity: InventoryItem['rarity'];
  requiredStatKey: string;
  supportStatKey: string;
  difficulty: number;
  basePrice: number;
  baseFavorDelta: number;
  description: string;
}

export interface NumericConsortSeed {
  routeScope: RouteId | 'all';
  portraitId: string;
  name: string;
  rankLabel: string;
  posthumousTitle?: string;
  status: ConcubineStatus;
  residence: string;
  stateLabel: string;
  age: number;
  familyBackground: string;
  personality: string;
  summary: string;
  stats: ConcubineStats;
}

export interface NumericPalaceStrifeSeverityRule {
  severity: PalaceStrifeSeverity;
  actionModifier: number;
  concealmentModifier: number;
  convictionModifier: number;
  investigationGrowth: number;
  prestigePenalty: number;
  favorPenalty: number;
  stressPenalty: number;
  suspectBonus: number;
  verdictAttendeeLimit: number;
  notes: string;
}

export interface NumericYangxinVerdictChoiceRule {
  choiceId: YangxinVerdictChoiceId;
  multipliers: Record<PalaceStrifeSeverity, number>;
  suspectRelationDelta: number;
  victimRelationDelta: number;
  notes: string;
}

export interface NumericRateBand {
  max: number;
  value: number;
  notes: string;
}

export interface NumericNightlyInterestEffect {
  minInterest: number;
  maxInterest: number;
  emperorMoodDelta: number;
  favorDelta: number;
  trueHeartDelta: number;
  prestigeDelta: number;
  notes: string;
}

export interface NumericGeneratedConsortTemplate {
  templateId: string;
  portraitId: string;
  name: string;
  familyBackground: string;
  personality: string;
  summary: string;
  ageRange: RangeTuple;
  possibleRanks: string[];
  possibleResidences: string[];
  stats: ConcubineStats;
}

const routeIds = new Set<RouteId>(['lanyinxuguo', 'fushengrumeng', 'yingluoyeting', 'chenyuansucuo']);
const colorIds = new Set<string>(Object.values(RarityColorId));
const inventoryCategories = new Set<InventoryItem['category']>(['gift', 'food', 'medicine', 'rare', 'music-score']);
const inventoryRarities = new Set<InventoryItem['rarity']>(['green', 'blue', 'purple', 'red']);
const craftWorkTypes = new Set<CraftWorkType>(['embroidery', 'painting', 'incense']);
const consortStatuses = new Set<ConcubineStatus>(['live', 'limbo', 'deceased']);
const palaceStrifeSeverities = new Set<PalaceStrifeSeverity>(['light', 'medium', 'heavy']);
const yangxinVerdictChoiceIds = new Set<YangxinVerdictChoiceId>([
  'self-defend',
  'self-doubt',
  'self-plead',
  'self-shift',
  'self-accept',
  'demand-punish',
  'state-facts',
  'raise-doubt',
  'plead-mercy',
  'silent-observe',
]);

const assertUniqueIds = <T>(items: readonly T[], resolveId: (item: T) => string, label: string): void => {
  const seen = new Set<string>();
  items.forEach((item) => {
    const id = resolveId(item);
    if (seen.has(id)) {
      throw new Error(`Duplicate numeric ${label} id "${id}".`);
    }
    seen.add(id);
  });
};

const parseRange = (row: Record<string, string>, minKey: string, maxKey: string, label: string): RangeTuple => {
  const min = parseRequiredNumber(row[minKey] ?? '', `${label}.${minKey}`);
  const max = parseRequiredNumber(row[maxKey] ?? '', `${label}.${maxKey}`);
  if (min > max) {
    throw new Error(`${label} has min greater than max.`);
  }
  return [min, max] as const;
};

const parseRouteId = (value: string, fieldName: string): RouteId => {
  if (!routeIds.has(value as RouteId)) {
    throw new Error(`${fieldName} has invalid routeId "${value}".`);
  }
  return value as RouteId;
};

const parseColorId = (value: string, fieldName: string): RarityColorId => {
  if (!colorIds.has(value)) {
    throw new Error(`${fieldName} has invalid colorId "${value}".`);
  }
  return value as RarityColorId;
};

const parsePalaceStrifeSeverity = (value: string, fieldName: string): PalaceStrifeSeverity => {
  if (!palaceStrifeSeverities.has(value as PalaceStrifeSeverity)) {
    throw new Error(`${fieldName} has invalid palace strife severity "${value}".`);
  }
  return value as PalaceStrifeSeverity;
};

export const numericAttributeFields: readonly NumericAttributeFieldConfig[] = parseNumericCsv(
  playerAttributeFieldsCsv,
  'player_attribute_fields.csv',
  ['key', 'label', 'min', 'max', 'defaultValue', 'runtimeMultiplier', 'category'],
).map((row) => {
  const category = row.category;
  if (category !== 'main' && category !== 'skill') {
    throw new Error(`player_attribute_fields.csv has invalid category "${category}".`);
  }

  return {
    key: row.key,
    label: row.label,
    min: parseRequiredNumber(row.min, `${row.key}.min`),
    max: parseRequiredNumber(row.max, `${row.key}.max`),
    value: parseRequiredNumber(row.defaultValue, `${row.key}.defaultValue`),
    runtimeMultiplier: parseRequiredNumber(row.runtimeMultiplier, `${row.key}.runtimeMultiplier`),
    category,
    note: row.description,
  };
});

assertUniqueIds(numericAttributeFields, (field) => field.key, 'attribute field');

export const numericRules: readonly NumericRuleConfig[] = parseNumericCsv(globalNumericRulesCsv, 'global_numeric_rules.csv', [
  'id',
]).map((row) => ({
  id: row.id,
  value: parseOptionalNumber(row.value, `${row.id}.value`),
  min: parseOptionalNumber(row.min, `${row.id}.min`),
  max: parseOptionalNumber(row.max, `${row.id}.max`),
  booleanValue: parseOptionalBoolean(row.booleanValue, `${row.id}.booleanValue`),
  notes: row.notes,
}));

assertUniqueIds(numericRules, (rule) => rule.id, 'rule');

const numericRuleById = new Map(numericRules.map((rule) => [rule.id, rule]));

export const getNumericRule = (id: string): NumericRuleConfig => {
  const rule = numericRuleById.get(id);
  if (!rule) {
    throw new Error(`Unknown numeric rule "${id}".`);
  }
  return rule;
};

export const getNumericRuleValue = (id: string): number => {
  const value = getNumericRule(id).value;
  if (value === undefined) {
    throw new Error(`Numeric rule "${id}" does not define value.`);
  }
  return value;
};

export const getNumericRuleRange = (id: string): RangeTuple => {
  const rule = getNumericRule(id);
  if (rule.min === undefined || rule.max === undefined) {
    throw new Error(`Numeric rule "${id}" does not define min/max range.`);
  }
  if (rule.min > rule.max) {
    throw new Error(`Numeric rule "${id}" has min greater than max.`);
  }
  return [rule.min, rule.max] as const;
};

export const numericRouteInitialProfiles: readonly NumericRouteInitialProfileConfig[] = parseNumericCsv(
  routeInitialProfilesCsv,
  'route_initial_profiles.csv',
  ['routeId', 'defaultName', 'familyDisplay', 'residenceDisplay', 'ageMin', 'ageMax'],
).map((row) => ({
  routeId: parseRouteId(row.routeId, 'route_initial_profiles.routeId'),
  defaultName: row.defaultName,
  familyDisplay: row.familyDisplay,
  residenceDisplay: row.residenceDisplay as PlayerResidenceName,
  ageRange: parseRange(row, 'ageMin', 'ageMax', `route_initial_profiles.${row.routeId}.age`),
  pointsRange: parseRange(row, 'pointsMin', 'pointsMax', `route_initial_profiles.${row.routeId}.points`),
  silverRange: parseRange(row, 'silverMin', 'silverMax', `route_initial_profiles.${row.routeId}.silver`),
  prestigeRange: parseRange(row, 'prestigeMin', 'prestigeMax', `route_initial_profiles.${row.routeId}.prestige`),
  stressRange: parseRange(row, 'stressMin', 'stressMax', `route_initial_profiles.${row.routeId}.stress`),
  favorRange: parseRange(row, 'favorMin', 'favorMax', `route_initial_profiles.${row.routeId}.favor`),
  trueHeartRange: parseRange(row, 'trueHeartMin', 'trueHeartMax', `route_initial_profiles.${row.routeId}.trueHeart`),
  initialRankOptions: splitPipeList(row.initialRankOptions),
  statsLocked: parseBoolean(row.statsLocked, `${row.routeId}.statsLocked`),
  familyOptions: splitPipeList(row.familyOptions),
}));

assertUniqueIds(numericRouteInitialProfiles, (profile) => profile.routeId, 'route initial profile');

const numericRouteProfileById = new Map(numericRouteInitialProfiles.map((profile) => [profile.routeId, profile]));

export const getRouteInitialProfileConfig = (routeId: RouteId): NumericRouteInitialProfileConfig => {
  const profile = numericRouteProfileById.get(routeId);
  if (!profile) {
    throw new Error(`Unknown route initial profile "${routeId}".`);
  }
  return profile;
};

export const numericRouteInitialStats = parseNumericCsv(routeInitialStatsCsv, 'route_initial_stats.csv', [
  'routeId',
  'attributeKey',
  'initialPoints',
]).map((row) => ({
  routeId: parseRouteId(row.routeId, 'route_initial_stats.routeId'),
  attributeKey: row.attributeKey,
  initialPoints: parseRequiredNumber(row.initialPoints, `${row.routeId}.${row.attributeKey}`),
}));

export const getRouteInitialStatDefaults = (routeId: RouteId): Record<string, number> =>
  Object.fromEntries(
    numericRouteInitialStats.filter((entry) => entry.routeId === routeId).map((entry) => [entry.attributeKey, entry.initialPoints]),
  );

const resolveFamilyBasePoints = (family: string): number => {
  const normalized = String(family ?? '').replace(/\s+/g, '');
  if (normalized.includes('镇国公') || normalized.includes('和亲公主')) {
    return 48;
  }
  if (normalized.includes('异国贡女')) {
    return 52;
  }
  if (normalized.includes('罪臣')) {
    return 54;
  }
  if (normalized.includes('商贾')) {
    return 56;
  }

  const gradeMatch = normalized.match(/[一二三四五六七八九]品/);
  if (gradeMatch) {
    const gradeMap: Record<string, number> = {
      一: 1,
      二: 2,
      三: 3,
      四: 4,
      五: 5,
      六: 6,
      七: 7,
      八: 8,
      九: 9,
    };
    const grade = gradeMap[gradeMatch[0][0]];
    if (grade) {
      return Math.max(48, Math.min(56, 47 + grade));
    }
  }

  return 50;
};

export const resolveRouteInitialPointsTotal = (routeId: RouteId, family: string): number => {
  const profile = getRouteInitialProfileConfig(routeId);
  const base = resolveFamilyBasePoints(family);
  return Math.max(profile.pointsRange[0], Math.min(profile.pointsRange[1], base));
};

export const numericChamberActions: readonly NumericChamberActionConfig[] = parseNumericCsv(
  chamberActionsCsv,
  'chamber_actions.csv',
  ['id', 'label', 'summary', 'timeCost', 'staminaCost'],
).map((row) => ({
  id: row.id,
  label: row.label,
  summary: row.summary,
  timeCost: parseRequiredNumber(row.timeCost, `${row.id}.timeCost`),
  staminaCost: parseRequiredNumber(row.staminaCost, `${row.id}.staminaCost`),
  statDeltas: parseStatDeltas(row.statDeltas),
  stressDelta: parseOptionalNumber(row.stressDelta, `${row.id}.stressDelta`),
  favorDelta: parseOptionalNumber(row.favorDelta, `${row.id}.favorDelta`),
}));

assertUniqueIds(numericChamberActions, (action) => action.id, 'chamber action');

export const numericMonthlyExpenseStrategies: readonly NumericMonthlyExpenseStrategyConfig[] = parseNumericCsv(
  monthlyExpenseStrategiesCsv,
  'monthly_expense_strategies.csv',
  ['id', 'label', 'expenseRate', 'prestigeDelta', 'healthDelta', 'isDefault', 'summary'],
).map((row) => ({
  id: row.id as MonthlyExpenseStrategyId,
  label: row.label,
  expenseRate: parseRequiredNumber(row.expenseRate, `${row.id}.expenseRate`),
  prestigeDelta: parseRequiredNumber(row.prestigeDelta, `${row.id}.prestigeDelta`),
  healthDelta: parseRequiredNumber(row.healthDelta, `${row.id}.healthDelta`),
  isDefault: parseBoolean(row.isDefault, `${row.id}.isDefault`),
  summary: row.summary,
}));

assertUniqueIds(numericMonthlyExpenseStrategies, (strategy) => strategy.id, 'monthly expense strategy');

const resolvedDefaultMonthlyExpenseStrategyId =
  numericMonthlyExpenseStrategies.find((strategy) => strategy.isDefault)?.id ?? numericMonthlyExpenseStrategies[0]?.id;

if (!resolvedDefaultMonthlyExpenseStrategyId) {
  throw new Error('monthly_expense_strategies.csv must define at least one strategy.');
}

export const DEFAULT_MONTHLY_EXPENSE_STRATEGY_ID: MonthlyExpenseStrategyId = resolvedDefaultMonthlyExpenseStrategyId;

export const numericFavorTiers: readonly NumericFavorTierConfig[] = parseNumericCsv(favorTiersCsv, 'favor_tiers.csv', [
  'id',
  'label',
  'min',
  'max',
  'colorId',
  'maxCount',
]).map((row) => ({
  id: row.id,
  label: row.label,
  range: parseRange(row, 'min', 'max', `favor_tiers.${row.id}`),
  colorId: parseColorId(row.colorId, `favor_tiers.${row.id}.colorId`),
  maxCount: parseRequiredNumber(row.maxCount, `${row.id}.maxCount`),
}));

assertUniqueIds(numericFavorTiers, (tier) => tier.id, 'favor tier');

export const numericPrestigeRankTable: readonly 位分声望条目[] = parseNumericCsv(
  rankPrestigeTableCsv,
  'rank_prestige_table.csv',
  ['tableType', 'level', 'rankName', 'requiredPrestige', 'colorId', 'iconPath'],
)
  .filter((row) => row.tableType === 'normal')
  .map((row) => ({
    等级: parseRequiredNumber(row.level, `${row.rankName}.level`),
    位分名称: row.rankName,
    所需声望值: parseRequiredNumber(row.requiredPrestige, `${row.rankName}.requiredPrestige`),
    对应颜色标识: parseColorId(row.colorId, `${row.rankName}.colorId`),
    图标路径: row.iconPath,
  }));

export const numericSpecialPrestigeRankTable: readonly 位分声望条目[] = parseNumericCsv(
  rankPrestigeTableCsv,
  'rank_prestige_table.csv',
  ['tableType', 'level', 'rankName', 'requiredPrestige', 'colorId', 'iconPath'],
)
  .filter((row) => row.tableType === 'special')
  .map((row) => ({
    等级: parseRequiredNumber(row.level, `${row.rankName}.level`),
    位分名称: row.rankName,
    所需声望值: parseRequiredNumber(row.requiredPrestige, `${row.rankName}.requiredPrestige`),
    对应颜色标识: parseColorId(row.colorId, `${row.rankName}.colorId`),
    图标路径: row.iconPath,
  }));

export const numericInventoryItems: readonly NumericInventoryItem[] = parseNumericCsv(
  inventoryItemsCsv,
  'inventory_items.csv',
  ['itemId', 'name', 'category', 'rarity', 'quantity', 'price', 'pools'],
).map((row) => {
  if (!inventoryCategories.has(row.category as InventoryItem['category'])) {
    throw new Error(`inventory_items.csv has invalid category "${row.category}".`);
  }
  if (!inventoryRarities.has(row.rarity as InventoryItem['rarity'])) {
    throw new Error(`inventory_items.csv has invalid rarity "${row.rarity}".`);
  }
  const color = row.color ? (row.color as InventoryItem['rarity']) : undefined;
  if (color && !inventoryRarities.has(color)) {
    throw new Error(`inventory_items.csv has invalid color "${row.color}".`);
  }

  return {
    id: row.category === 'music-score' ? row.itemId : undefined,
    itemId: row.itemId,
    name: row.name,
    category: row.category as InventoryItem['category'],
    rarity: row.rarity as InventoryItem['rarity'],
    color,
    quantity: parseRequiredNumber(row.quantity, `${row.itemId}.quantity`),
    price: parseRequiredNumber(row.price, `${row.itemId}.price`),
    favorDelta: parseRequiredNumber(row.favorDelta, `${row.itemId}.favorDelta`),
    healthDelta: parseRequiredNumber(row.healthDelta, `${row.itemId}.healthDelta`),
    appearanceDelta: parseRequiredNumber(row.appearanceDelta, `${row.itemId}.appearanceDelta`),
    temperamentDelta: parseRequiredNumber(row.temperamentDelta, `${row.itemId}.temperamentDelta`),
    description: row.description,
    canSell: parseBoolean(row.canSell, `${row.itemId}.canSell`),
    canRecycle: parseBoolean(row.canRecycle, `${row.itemId}.canRecycle`),
    recyclePriceOverride: parseOptionalNumber(row.recyclePriceOverride, `${row.itemId}.recyclePriceOverride`),
    pools: splitPipeList(row.pools),
  };
});

export const getInventoryItemsByPool = (pool: string): InventoryItem[] =>
  numericInventoryItems
    .filter((item) => item.pools.includes(pool))
    .map(({ pools: _pools, ...item }) => ({ ...item }));

export const numericCraftWorks: readonly NumericCraftWorkConfig[] = parseNumericCsv(
  craftWorksCsv,
  'craft_works.csv',
  ['workId', 'type', 'name', 'rarity', 'requiredStatKey', 'supportStatKey', 'difficulty', 'basePrice', 'baseFavorDelta'],
).map((row) => {
  if (!craftWorkTypes.has(row.type as CraftWorkType)) {
    throw new Error(`craft_works.csv has invalid type "${row.type}".`);
  }
  if (!inventoryRarities.has(row.rarity as InventoryItem['rarity'])) {
    throw new Error(`craft_works.csv has invalid rarity "${row.rarity}".`);
  }
  return {
    workId: row.workId,
    type: row.type as CraftWorkType,
    name: row.name,
    rarity: row.rarity as InventoryItem['rarity'],
    requiredStatKey: row.requiredStatKey,
    supportStatKey: row.supportStatKey,
    difficulty: parseRequiredNumber(row.difficulty, `${row.workId}.difficulty`),
    basePrice: parseRequiredNumber(row.basePrice, `${row.workId}.basePrice`),
    baseFavorDelta: parseRequiredNumber(row.baseFavorDelta, `${row.workId}.baseFavorDelta`),
    description: row.description,
  };
});

assertUniqueIds(numericCraftWorks, (work) => work.workId, 'craft work');

export const getCraftWorksByType = (type: CraftWorkType): NumericCraftWorkConfig[] =>
  numericCraftWorks.filter((work) => work.type === type).map((work) => ({ ...work }));

export const getCraftWorkConfig = (workId: string): NumericCraftWorkConfig => {
  const work = numericCraftWorks.find((entry) => entry.workId === workId);
  if (!work) {
    throw new Error(`Unknown craft work "${workId}".`);
  }
  return work;
};

export const numericFixedConsortSeeds: readonly NumericConsortSeed[] = parseNumericCsv(
  fixedConsortRosterCsv,
  'fixed_consort_roster.csv',
  ['routeId', 'portraitId', 'name', 'rankLabel', 'status', 'residence', 'age'],
).map((row) => {
  const routeScope = row.routeId === 'all' ? 'all' : parseRouteId(row.routeId, 'fixed_consort_roster.routeId');
  if (!consortStatuses.has(row.status as ConcubineStatus)) {
    throw new Error(`fixed_consort_roster.csv has invalid status "${row.status}".`);
  }

  return {
    routeScope,
    portraitId: row.portraitId,
    name: row.name,
    rankLabel: row.rankLabel,
    posthumousTitle: row.posthumousTitle || undefined,
    status: row.status as ConcubineStatus,
    residence: row.residence,
    stateLabel: row.stateLabel,
    age: parseRequiredNumber(row.age, `${row.name}.age`),
    familyBackground: row.familyBackground,
    personality: row.personality,
    summary: row.summary,
    stats: {
      prestige: parseRequiredNumber(row.prestige, `${row.name}.prestige`),
      favor: parseRequiredNumber(row.favor, `${row.name}.favor`),
      familyInfluence: parseRequiredNumber(row.familyInfluence, `${row.name}.familyInfluence`),
      health: parseRequiredNumber(row.health, `${row.name}.health`),
      appearance: parseRequiredNumber(row.appearance, `${row.name}.appearance`),
      relationToPlayer: parseRequiredNumber(row.relationToPlayer, `${row.name}.relationToPlayer`),
      childrenCount: parseRequiredNumber(row.childrenCount, `${row.name}.childrenCount`),
      ambition: parseRequiredNumber(row.ambition, `${row.name}.ambition`),
      stress: parseRequiredNumber(row.stress, `${row.name}.stress`),
      intrigue: parseRequiredNumber(row.intrigue, `${row.name}.intrigue`),
      temperament: parseRequiredNumber(row.temperament, `${row.name}.temperament`),
      affection: parseRequiredNumber(row.affection, `${row.name}.affection`),
      fortune: parseRequiredNumber(row.fortune, `${row.name}.fortune`),
    },
  };
});

assertUniqueIds(numericFixedConsortSeeds, (seed) => `${seed.routeScope}:${seed.name}`, 'fixed consort seed');

export const numericPalaceStrifeSeverityRules: readonly NumericPalaceStrifeSeverityRule[] = parseNumericCsv(
  palaceStrifeSeverityRulesCsv,
  'palace_strife_severity_rules.csv',
  ['severity', 'actionModifier', 'concealmentModifier', 'convictionModifier', 'investigationGrowth'],
).map((row) => ({
  severity: parsePalaceStrifeSeverity(row.severity, 'palace_strife_severity_rules.severity'),
  actionModifier: parseRequiredNumber(row.actionModifier, `${row.severity}.actionModifier`),
  concealmentModifier: parseRequiredNumber(row.concealmentModifier, `${row.severity}.concealmentModifier`),
  convictionModifier: parseRequiredNumber(row.convictionModifier, `${row.severity}.convictionModifier`),
  investigationGrowth: parseRequiredNumber(row.investigationGrowth, `${row.severity}.investigationGrowth`),
  prestigePenalty: parseRequiredNumber(row.prestigePenalty, `${row.severity}.prestigePenalty`),
  favorPenalty: parseRequiredNumber(row.favorPenalty, `${row.severity}.favorPenalty`),
  stressPenalty: parseRequiredNumber(row.stressPenalty, `${row.severity}.stressPenalty`),
  suspectBonus: parseRequiredNumber(row.suspectBonus, `${row.severity}.suspectBonus`),
  verdictAttendeeLimit: parseRequiredNumber(row.verdictAttendeeLimit, `${row.severity}.verdictAttendeeLimit`),
  notes: row.notes,
}));

assertUniqueIds(numericPalaceStrifeSeverityRules, (rule) => rule.severity, 'palace strife severity rule');

const palaceStrifeSeverityRuleById = new Map(numericPalaceStrifeSeverityRules.map((rule) => [rule.severity, rule]));

export const getPalaceStrifeSeverityRule = (severity: PalaceStrifeSeverity): NumericPalaceStrifeSeverityRule => {
  const rule = palaceStrifeSeverityRuleById.get(severity);
  if (!rule) {
    throw new Error(`Unknown palace strife severity "${severity}".`);
  }
  return rule;
};

export const numericPalaceStrifeRumorItems: readonly { itemLabel: string; severity: PalaceStrifeSeverity; notes: string }[] =
  parseNumericCsv(palaceStrifeRumorItemsCsv, 'palace_strife_rumor_items.csv', ['itemLabel', 'severity']).map((row) => ({
    itemLabel: row.itemLabel,
    severity: parsePalaceStrifeSeverity(row.severity, `${row.itemLabel}.severity`),
    notes: row.notes,
  }));

assertUniqueIds(numericPalaceStrifeRumorItems, (item) => item.itemLabel, 'palace strife rumor item');

const palaceStrifeRumorSeverityByLabel = new Map(numericPalaceStrifeRumorItems.map((item) => [item.itemLabel, item.severity]));

export const getPalaceStrifeRumorSeverity = (itemLabel: string): PalaceStrifeSeverity | undefined =>
  palaceStrifeRumorSeverityByLabel.get(itemLabel);

export const numericYangxinVerdictChoiceRules: readonly NumericYangxinVerdictChoiceRule[] = parseNumericCsv(
  yangxinVerdictChoiceRulesCsv,
  'yangxin_verdict_choice_rules.csv',
  ['choiceId', 'lightMultiplier', 'mediumMultiplier', 'heavyMultiplier'],
).map((row) => {
  if (!yangxinVerdictChoiceIds.has(row.choiceId as YangxinVerdictChoiceId)) {
    throw new Error(`yangxin_verdict_choice_rules.csv has invalid choiceId "${row.choiceId}".`);
  }

  return {
    choiceId: row.choiceId as YangxinVerdictChoiceId,
    multipliers: {
      light: parseRequiredNumber(row.lightMultiplier, `${row.choiceId}.lightMultiplier`),
      medium: parseRequiredNumber(row.mediumMultiplier, `${row.choiceId}.mediumMultiplier`),
      heavy: parseRequiredNumber(row.heavyMultiplier, `${row.choiceId}.heavyMultiplier`),
    },
    suspectRelationDelta: parseRequiredNumber(row.suspectRelationDelta, `${row.choiceId}.suspectRelationDelta`),
    victimRelationDelta: parseRequiredNumber(row.victimRelationDelta, `${row.choiceId}.victimRelationDelta`),
    notes: row.notes,
  };
});

assertUniqueIds(numericYangxinVerdictChoiceRules, (rule) => rule.choiceId, 'yangxin verdict choice rule');

const yangxinVerdictChoiceRuleById = new Map(numericYangxinVerdictChoiceRules.map((rule) => [rule.choiceId, rule]));

export const getYangxinVerdictChoiceRule = (choiceId: YangxinVerdictChoiceId): NumericYangxinVerdictChoiceRule => {
  const rule = yangxinVerdictChoiceRuleById.get(choiceId);
  if (!rule) {
    throw new Error(`Unknown yangxin verdict choice rule "${choiceId}".`);
  }
  return rule;
};

export const numericNightlyEmperorAloneRateBands: readonly NumericRateBand[] = parseNumericCsv(
  nightlyEmperorAloneRatesCsv,
  'nightly_emperor_alone_rates.csv',
  ['maxMood', 'aloneRate'],
).map((row) => ({
  max: parseRequiredNumber(row.maxMood, `${row.maxMood}.maxMood`),
  value: parseRequiredNumber(row.aloneRate, `${row.maxMood}.aloneRate`),
  notes: row.notes,
}));

export const numericNightlyFavorWeightBands: readonly NumericRateBand[] = parseNumericCsv(
  nightlyFavorWeightsCsv,
  'nightly_favor_weights.csv',
  ['maxFavor', 'weight'],
).map((row) => ({
  max: parseRequiredNumber(row.maxFavor, `${row.maxFavor}.maxFavor`),
  value: parseRequiredNumber(row.weight, `${row.maxFavor}.weight`),
  notes: row.notes,
}));

const assertAscendingBands = (bands: readonly NumericRateBand[], label: string): void => {
  bands.forEach((band, index) => {
    if (index > 0 && band.max <= bands[index - 1].max) {
      throw new Error(`${label} must be sorted by ascending max.`);
    }
  });
};

assertAscendingBands(numericNightlyEmperorAloneRateBands, 'nightly_emperor_alone_rates.csv');
assertAscendingBands(numericNightlyFavorWeightBands, 'nightly_favor_weights.csv');

export const numericNightlyInterestEffects: readonly NumericNightlyInterestEffect[] = parseNumericCsv(
  nightlyInterestEffectsCsv,
  'nightly_interest_effects.csv',
  ['minInterest', 'maxInterest', 'emperorMoodDelta', 'favorDelta', 'trueHeartDelta', 'prestigeDelta'],
).map((row) => {
  const minInterest = parseRequiredNumber(row.minInterest, `${row.minInterest}.minInterest`);
  const maxInterest = parseRequiredNumber(row.maxInterest, `${row.maxInterest}.maxInterest`);
  if (minInterest > maxInterest) {
    throw new Error(`nightly_interest_effects.csv has min greater than max for "${row.notes}".`);
  }

  return {
    minInterest,
    maxInterest,
    emperorMoodDelta: parseRequiredNumber(row.emperorMoodDelta, `${row.minInterest}.emperorMoodDelta`),
    favorDelta: parseRequiredNumber(row.favorDelta, `${row.minInterest}.favorDelta`),
    trueHeartDelta: parseRequiredNumber(row.trueHeartDelta, `${row.minInterest}.trueHeartDelta`),
    prestigeDelta: parseRequiredNumber(row.prestigeDelta, `${row.minInterest}.prestigeDelta`),
    notes: row.notes,
  };
});

export const numericNightlyRules: readonly NumericRuleConfig[] = parseNumericCsv(nightlyRuntimeRulesCsv, 'nightly_runtime_rules.csv', [
  'id',
  'value',
]).map((row) => ({
  id: row.id,
  value: parseRequiredNumber(row.value, `${row.id}.value`),
  notes: row.notes,
}));

assertUniqueIds(numericNightlyRules, (rule) => rule.id, 'nightly runtime rule');

const nightlyRuleById = new Map(numericNightlyRules.map((rule) => [rule.id, rule]));

export const getNightlyRuleValue = (id: string): number => {
  const value = nightlyRuleById.get(id)?.value;
  if (value === undefined) {
    throw new Error(`Unknown nightly runtime rule "${id}".`);
  }
  return value;
};

export const numericGeneratedConsortRules: readonly NumericRuleConfig[] = parseNumericCsv(
  generatedConsortRulesCsv,
  'generated_consort_rules.csv',
  ['id', 'value'],
).map((row) => ({
  id: row.id,
  value: parseRequiredNumber(row.value, `${row.id}.value`),
  notes: row.notes,
}));

assertUniqueIds(numericGeneratedConsortRules, (rule) => rule.id, 'generated consort rule');

const generatedConsortRuleById = new Map(numericGeneratedConsortRules.map((rule) => [rule.id, rule]));

export const getGeneratedConsortRuleValue = (id: string): number => {
  const value = generatedConsortRuleById.get(id)?.value;
  if (value === undefined) {
    throw new Error(`Unknown generated consort rule "${id}".`);
  }
  return value;
};

export const numericGeneratedConsortTemplates: readonly NumericGeneratedConsortTemplate[] = parseNumericCsv(
  generatedConsortTemplatesCsv,
  'generated_consort_templates.csv',
  ['templateId', 'portraitId', 'name', 'ageMin', 'ageMax', 'possibleRanks', 'possibleResidences'],
).map((row) => ({
  templateId: row.templateId,
  portraitId: row.portraitId,
  name: row.name,
  familyBackground: row.familyBackground,
  personality: row.personality,
  summary: row.summary,
  ageRange: parseRange(row, 'ageMin', 'ageMax', `generated_consort_templates.${row.templateId}.age`),
  possibleRanks: splitPipeList(row.possibleRanks),
  possibleResidences: splitPipeList(row.possibleResidences),
  stats: {
    prestige: parseRequiredNumber(row.prestige, `${row.templateId}.prestige`),
    favor: parseRequiredNumber(row.favor, `${row.templateId}.favor`),
    familyInfluence: parseRequiredNumber(row.familyInfluence, `${row.templateId}.familyInfluence`),
    health: parseRequiredNumber(row.health, `${row.templateId}.health`),
    appearance: parseRequiredNumber(row.appearance, `${row.templateId}.appearance`),
    relationToPlayer: parseRequiredNumber(row.relationToPlayer, `${row.templateId}.relationToPlayer`),
    childrenCount: parseRequiredNumber(row.childrenCount, `${row.templateId}.childrenCount`),
    ambition: parseRequiredNumber(row.ambition, `${row.templateId}.ambition`),
    stress: parseRequiredNumber(row.stress, `${row.templateId}.stress`),
    intrigue: parseRequiredNumber(row.intrigue, `${row.templateId}.intrigue`),
    temperament: parseRequiredNumber(row.temperament, `${row.templateId}.temperament`),
    affection: parseRequiredNumber(row.affection, `${row.templateId}.affection`),
    fortune: parseRequiredNumber(row.fortune, `${row.templateId}.fortune`),
  },
}));

assertUniqueIds(numericGeneratedConsortTemplates, (template) => template.templateId, 'generated consort template');
