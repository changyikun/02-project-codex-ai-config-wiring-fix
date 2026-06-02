export type RouteId = 'lanyinxuguo' | 'fushengrumeng' | 'yingluoyeting' | 'chenyuansucuo';
export type SceneId = 'menu' | 'attribute' | 'briefing' | 'dialogue' | 'activity' | 'map';
export type CurrentView = 'start' | 'route-selection' | 'attribute-assignment' | 'opening-dialogue' | 'map-main' | 'bedchamber';
export type NumericFeedbackBucket = 'chamber-action' | 'map-event' | 'nightly-service' | 'settlement';
export type TimeSlot = '清晨' | '上午' | '中午' | '下午' | '傍晚' | '夜晚' | '深夜';
export type AffairSourceLabel = '宫斗事务' | '家族事务' | '朝堂事务';
export type ActivityId =
  | '练习音律'
  | '训练舞技'
  | '研读诗书'
  | '女红刺绣'
  | '请平安脉'
  | '殿内休息'
  | '离开寝居';

export type MapAreaId =
  | '御书房'
  | '御膳房'
  | '建章宫'
  | '御花园'
  | '正阳门'
  | '宫门'
  | '冷宫'
  | '养心殿'
  | '太医院'
  | '妙音堂'
  | '宝华殿'
  | '华清池'
  | '重华宫'
  | '椒房殿'
  | '储秀宫'
  | '掖庭院'
  | '长春宫'
  | '启祥宫'
  | '钟粹宫'
  | '昭阳宫'
  | '玉清宫'
  | '永宁宫'
  | '永和宫'
  | '延禧宫'
  | '临华殿'
  | '昭华殿'
  | '披香殿';

export interface AttributeField {
  key: string;
  label: string;
  min: number;
  max: number;
  value: number;
  note?: string;
}

export interface GameNumericsState {
  name: string;
  age: number;
  family: string;
  residenceName: MapAreaId;
  openingTendency?: string;
  monthlyExpenseStrategy?: MonthlyExpenseStrategyId;
  nextMonthlyExpenseStrategy?: MonthlyExpenseStrategyId;
  familyAidBonus?: number;
  familyAidPrestigePending?: number;
  pointsTotal: number;
  pointsLeft: number;
  routeId: RouteId;
  actionPoints: number;
  stamina: number;
  silver: number;
  prestige: number;
  stress: number;
  favor: number;
  trueHeart: number;
  stats: Record<string, number>;
  flags: Record<string, boolean>;
}

export type MonthlyExpenseStrategyId = 'frugal' | 'balanced' | 'luxury';

export interface PalaceTimeState {
  year: number;
  month: number;
  xun: number;
  slotIndex: number;
  slot: TimeSlot;
  slotProgress: number;
}

export type PalaceStrifeActionKind = 'rumor' | 'poison';
export type PalaceStrifeSeverity = 'light' | 'medium' | 'heavy';
export type PalaceStrifeCaseStatus = 'pending_resolution' | 'investigating' | 'resolved';
export type PalaceStrifeCaseOutcome = 'pending' | 'cold_case' | 'convicted';
export type PalaceStrifeActorId = 'player' | 'npc';
export type YangxinHearingStance = 'argue' | 'plead' | 'confess';

export interface PalaceStrifeRolls {
  action: number;
  concealment: number;
}

export interface PalaceStrifeCaseState {
  id: string;
  xunKey: string;
  year: number;
  month: number;
  xun: number;
  actorId: PalaceStrifeActorId;
  actorConsortId?: string;
  actorName?: string;
  targetConsortId: string;
  targetName: string;
  actionKind: PalaceStrifeActionKind;
  methodLabel: string;
  itemLabel: string;
  allyLabel: string;
  framedTargetConsortId?: string;
  framedTargetName?: string;
  queuedRolls?: PalaceStrifeRolls;
  severity: PalaceStrifeSeverity;
  actionSuccessRate: number;
  concealmentSuccessRate: number;
  actionRoll: number;
  concealmentRoll: number;
  actionSucceeded: boolean;
  concealmentSucceeded: boolean;
  status: PalaceStrifeCaseStatus;
  outcome: PalaceStrifeCaseOutcome;
  investigationXunsElapsed: number;
  convictionRate: number;
  yangxinHearingRequired?: boolean;
  yangxinHearingResolved?: boolean;
  yangxinHearingSummary?: string;
  summary: string;
}

export interface PalaceStrifeStartInput {
  targetConsortId: string;
  actionKind: PalaceStrifeActionKind;
  methodLabel: string;
  itemLabel: string;
  allyLabel: string;
  framedTargetConsortId?: string;
  framedTargetName?: string;
  rolls?: PalaceStrifeRolls;
}

export interface PalaceStrifeResolution {
  caseState: PalaceStrifeCaseState;
  shouldPersistCase: boolean;
  resultText: string;
}

export type SettlementReportKind = 'xun' | 'month' | 'event';

export interface SettlementReport {
  id: string;
  kind: SettlementReportKind;
  year: number;
  month: number;
  xun: number;
  title: string;
  summary: string;
  lines: string[];
}

export interface NightlyServiceRolls {
  alone?: number;
  player?: number;
  pool?: number;
  interest?: number;
  pregnancy?: number;
  thirdParty?: number;
}

export type NightlyServiceInteractionActionId = 'music' | 'poetry' | 'shy' | 'curtain' | 'gentle';
export type NightlyServiceGentleBranchId = 'comfort' | 'praise' | 'smear';

export interface NightlyServiceInteractionChoice {
  actionId: NightlyServiceInteractionActionId;
  gentleBranchId?: NightlyServiceGentleBranchId;
  targetConsortId?: string;
}

export type NightlyServicePendingStage = 'notice' | 'interaction' | 'service' | 'overnight';

export type NightlyServiceOutcome =
  | 'player-service'
  | 'player-companion'
  | 'other-consort-service'
  | 'other-consort-companion'
  | 'emperor-alone';

export interface NightlyServiceReport {
  id: string;
  xunKey: string;
  year: number;
  month: number;
  xun: number;
  outcome: NightlyServiceOutcome;
  targetId?: string;
  targetName?: string;
  interest: number;
  playerFavorDelta: number;
  playerTrueHeartDelta: number;
  playerPrestigeDelta: number;
  emperorMoodDelta: number;
  summary: string;
  lines: string[];
}

export interface NightlyServiceNightNotice {
  id: string;
  timeKey: string;
  outcome: NightlyServiceOutcome;
  targetName?: string;
  lines: string[];
}

export interface NightlyServicePendingEvent {
  id: string;
  timeKey: string;
  year: number;
  month: number;
  xun: number;
  outcome: 'player-service' | 'player-companion';
  playerName: string;
  rankLabel: string;
  initialInterest: number;
  currentInterest: number;
  interactionCount: number;
  maxInteractions: number;
  selectedActionIds: NightlyServiceInteractionActionId[];
  stage: NightlyServicePendingStage;
  pregnancyRoll?: number;
}

export interface NightlyServiceState {
  playerNightFavorGauge: number;
  emperorMood: number;
  reports: NightlyServiceReport[];
  pendingEvent?: NightlyServicePendingEvent;
  pendingNotice?: NightlyServiceNightNotice;
  pendingMorningLines?: string[];
  latestReportId?: string;
  queuedRolls?: NightlyServiceRolls;
}

export interface HiddenStatsState {
  silver: number;
  prestige: number;
  stress: number;
  favor: number;
  trueHeart: number;
  favorLabel: string;
  favorColor: string;
  initialRank?: string;
}

export interface RouteSelectionProfile {
  id: RouteId;
  label: string;
  labelArt: string;
  intro: string;
  defaultName: string;
  familyDisplay: string;
  residenceDisplay: MapAreaId;
  aptitudeDisplay?: string;
  biography: string;
  clearanceRequirement: string;
  difficulty: string;
  portrait: string;
  fontMask: string;
  bannerHeight: number;
  bannerOffsetTop?: number;
  familyOptions?: string[];
  statsLocked?: boolean;
  baseState: Partial<GameNumericsState>;
  hiddenStats: HiddenStatsState;
}

export interface NumericSaveEnvelope {
  data: GameNumericsState;
  checksum: string;
  savedAt: string;
}

export interface DialogueDataEffects {
  silver: number;
  stamina: number;
  favor: number;
  prestige: number;
  stress: number;
  trueHeart: number;
  stats: Record<string, number>;
  flags?: Record<string, boolean>;
}

export interface DialogueOption {
  id: string;
  label: string;
  effectHint: string;
  nextTopic?: string;
  hiddenEffects?: DialogueDataEffects;
  timeCost?: number;
}

export interface DialogueTurn {
  speaker: string;
  text: string;
  options: DialogueOption[];
  mode?: 'line' | 'branch';
  nextActionLabel?: string;
}

export type RelationshipToneTag = 'friendly' | 'flirt' | 'cold' | 'reject' | 'neutral';

export interface RelationshipJudgeOutcome {
  toneTag: RelationshipToneTag;
  favorDelta: number;
  affectionDelta: number;
  reason: string;
  confidence: number;
  source: 'ai' | 'fallback';
  optionText: string;
}

export interface BondProfileState {
  routeId: RouteId;
  npcId: string;
  npcName: string;
  sceneType: string;
  title: string;
  summary: string;
  favor: number;
  affection: number;
  xunKey: string;
  favorDeltaThisXun: number;
  affectionDeltaThisXun: number;
  recentContext: string[];
  lastOptionText?: string;
  lastToneTag?: RelationshipToneTag;
  lastReason?: string;
  lastConfidence?: number;
  lastSource?: 'ai' | 'fallback';
}

export interface BondInteractionOption {
  id: string;
  label: string;
  summary: string;
  fallbackToneTag: RelationshipToneTag;
}

export type InventoryItemCategory = 'gift' | 'food' | 'medicine' | 'rare' | 'music-score';
export type InventoryItemRarity = 'green' | 'blue' | 'purple' | 'red';

export interface InventoryItem {
  id?: string;
  itemId: string;
  name: string;
  color?: InventoryItemRarity;
  category: InventoryItemCategory;
  rarity: InventoryItemRarity;
  quantity: number;
  price: number;
  favorDelta: number;
  healthDelta: number;
  appearanceDelta: number;
  temperamentDelta: number;
  description: string;
  canSell?: boolean;
  canRecycle?: boolean;
  recyclePriceOverride?: number;
}

export type ConsortPalaceActionId = 'visit' | 'gift' | 'greet' | 'quarrel' | 'punish' | 'win-over' | 'smear' | 'farewell';

export interface ConsortDialogueOption {
  id: string;
  label: string;
  effectHint: string;
  fallbackToneTag: RelationshipToneTag;
  nextTopic?: string;
}

export interface DialogueMemoryCandidate {
  scope: 'session' | 'relation';
  type: 'interaction' | 'gift' | 'conflict' | 'promise' | 'preference' | 'boundary';
  summary: string;
  importance: 'low' | 'medium' | 'high';
  confidence: number;
  source: 'ai' | 'system';
  status: 'candidate';
}

export interface DialogueRelationCandidate {
  candidateType: 'rapport' | 'gift' | 'conflict' | 'promise' | 'preference' | 'boundary';
  scope: 'relation';
  summary: string;
  importance: 'low' | 'medium' | 'high';
  confidence: number;
  source: 'ai' | 'system';
  status: 'candidate';
  sourceEventId: string;
  promotable: boolean;
  dedupeKey: string;
  reason: string;
}

export type LongTermRelationType = 'familiarity' | 'trust' | 'affinity' | 'dependency';

export interface DialogueRelationMemoryEntrySummary {
  entryId: string;
  relationType: LongTermRelationType;
  candidateType: DialogueRelationCandidate['candidateType'];
  summary: string;
  sceneId: string;
  sourceEventId: string;
  dedupeKey: string;
  promotedAt: string;
  acceptedRule: string;
}

export interface DialogueRelationPromotionRejectedCandidate {
  dedupeKey: string;
  candidateType: DialogueRelationCandidate['candidateType'];
  reason: string;
}

export interface DialogueRelationMemoryInfo {
  enabled: boolean;
  totalEntryCount: number;
  sceneEntryCount: number;
  snapshotHighlights: Array<{
    relationType: LongTermRelationType;
    summary: string;
  }>;
  reviewedCount: number;
  promotedCount: number;
  rejectedCount: number;
  duplicateCount: number;
  promotedEntries: DialogueRelationMemoryEntrySummary[];
  rejectedCandidates: DialogueRelationPromotionRejectedCandidate[];
}

export interface DialogueAffectHint {
  key: 'trust' | 'affection' | 'tension' | 'suspicion' | 'mood';
  direction: 'up' | 'down' | 'flat';
  reason: string;
  confidence: number;
}

export interface DialogueSessionMemoryInfo {
  enabled: boolean;
  readTurnCount: number;
  readMemoryCandidateCount: number;
  writtenMemoryCandidateCount: number;
  readRelationCandidateCount: number;
  writtenRelationCandidateCount: number;
  totalTurnCount: number;
  totalExchangeCount: number;
  recentTurnCount: number;
  recentMemoryCandidateCount: number;
  recentRelationCandidateCount: number;
  recentSummary?: string;
  retrievedRefs: string[];
}

export interface ConsortDialogueTurn {
  mode: 'line' | 'branch';
  phase: 'continue' | 'finish';
  speakerIdentity: string;
  speakerName: string;
  text: string;
  nextActionLabel: string;
  sceneHint?: string;
  options: ConsortDialogueOption[];
  memoryCandidates?: DialogueMemoryCandidate[];
  relationCandidates?: DialogueRelationCandidate[];
  affectHints?: DialogueAffectHint[];
  sessionMemory?: DialogueSessionMemoryInfo;
  relationMemory?: DialogueRelationMemoryInfo;
  usedFallback?: boolean;
}

export interface ConsortInteractionProgress {
  consortId: string;
  xunKey: string;
  favorDeltaThisXun: number;
  affectionDeltaThisXun: number;
  lastActionId?: ConsortPalaceActionId;
  lastOptionText?: string;
  lastToneTag?: RelationshipToneTag;
  lastReason?: string;
  lastConfidence?: number;
  lastSource?: 'ai' | 'fallback';
}

export interface KitchenProgressState {
  strollCount: number;
  buZiyouUnlocked: boolean;
  buZiyouMet: boolean;
  buZiyouFavor: number;
  buZiyouAffinity: number;
  lastEncounterNpcId?: string;
  lastToneTag?: RelationshipToneTag;
}

export interface TempleProgressState {
  worshipCount: number;
  prayerCount: number;
  strollCount: number;
  dangYiFavor: number;
  dangYiAffinity: number;
  lastEncounterNpcId?: string;
  lastToneTag?: RelationshipToneTag;
  lastAmbientText?: string;
}

export interface MedicalProgressState {
  strollCount: number;
  consultationCount: number;
  jianNingMet: boolean;
  jianNingFavor: number;
  jianNingAffinity: number;
  lastEncounterNpcId?: string;
  lastToneTag?: RelationshipToneTag;
  lastAmbientText?: string;
}

export interface MusicHallProgressState {
  listenCount: number;
  strollCount: number;
  signUpCount: number;
  lianQiaoFirstMet: boolean;
  lianQiaoMet: boolean;
  lianQiaoFavor: number;
  lianQiaoAffection: number;
  lastEncounterNpcId?: string;
  lastToneTag?: RelationshipToneTag;
  lastAmbientText?: string;
  lastGiftXunIndex?: number;
  lastSubmittedMusicScoreId?: string;
}

export interface PalaceBanquetSubmittedScore {
  itemId: string;
  name: string;
  color?: string;
  rarity?: string;
  submittedAt: PalaceTimeState;
  seasonKey: string;
}

export interface PalaceBanquetResultState {
  seasonKey: string;
  completedAt: PalaceTimeState;
  scoreName?: string;
  completionPercent: number;
  prestigeDelta: number;
  summary: string;
}

export interface PalaceBanquetProgressState {
  currentSeasonKey?: string;
  submittedScore?: PalaceBanquetSubmittedScore;
  submissionCount: number;
  lastRegistrationNoticeSeasonKey?: string;
  lastResolvedSeasonKey?: string;
  lastResult?: PalaceBanquetResultState;
}

export interface ResourceMappingEntry {
  slot: string;
  source: string;
  runtime: string;
  note: string;
}

export type ConcubineStatus = 'live' | 'limbo' | 'deceased';

export interface ConcubineStats {
  prestige: number;
  favor: number;
  familyInfluence: number;
  health: number;
  appearance: number;
  relationToPlayer: number;
  childrenCount: number;
  ambition: number;
  stress: number;
  intrigue: number;
  medicine?: number;
  temperament: number;
  affection: number;
  fortune: number;
}

export interface ConcubineConditionFlags {
  illness?: boolean;
  madness?: boolean;
  pregnant?: boolean;
}

export interface ConcubineProfile {
  id: string;
  routeScope?: RouteId | 'all';
  portraitId: string;
  name: string;
  rankLabel: string;
  posthumousTitle?: string;
  status: ConcubineStatus;
  residence: string;
  stateLabel: string;
  conditionFlags?: ConcubineConditionFlags;
  age: number;
  familyBackground: string;
  personality: string;
  summary: string;
  source: 'fixed' | 'generated' | 'custom';
  stats: ConcubineStats;
  allies: string[];
  rivals: string[];
  isCustomConsort?: boolean;
  customSource?: 'player';
  entrySource?: string;
  personaCard?: string;
  insertedAtXun?: string;
}
