/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PRESTIGE_RANGE } from '../../config/constants';
import { CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN } from '../lib/consortVisitRuntime';
import { PLAYER_PALACE_STRIFE_TARGET_ID } from '../lib/palaceStrifeRuntime';
import { YINGLUOYETING_STORY_FLAGS } from '../lib/yingluoyetingStoryRuntime';
import { SAVE_GAME_SCHEMA_VERSION, SAVE_GAME_STORAGE_KEY } from '../save/saveGameV1';
import { useGameFlowStore } from './gameFlowStore';

describe('gameFlowStore SaveGameV1 integration', () => {
  beforeEach(() => {
    localStorage.clear();
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'stats',
      activeMapLocation: '太医院',
      mapEventText: 'temporary map copy',
      briefing: 'temporary briefing',
      dialogue: {
        speaker: 'temporary speaker',
        text: 'temporary line',
        options: [],
      },
      state: {
        ...state.state,
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1234,
        favor: 48,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1234,
        favor: 48,
        initialRank: '皇后',
      },
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
      palaceStrifeCases: [
        {
          id: 'palace-strife-1',
          xunKey: '2-3-2',
          year: 2,
          month: 3,
          xun: 2,
          actorId: 'player',
          targetConsortId: 'consort-cui',
          targetName: '崔令蓉',
          actionKind: 'rumor',
          methodLabel: '散布流言',
          itemLabel: '不使用',
          allyLabel: '无',
          severity: 'light',
          actionSuccessRate: 52,
          concealmentSuccessRate: 61,
          actionRoll: 12,
          concealmentRoll: 88,
          actionSucceeded: true,
          concealmentSucceeded: false,
          status: 'investigating',
          outcome: 'pending',
          investigationXunsElapsed: 0,
          convictionRate: 35,
          summary: '流言已起，内廷开始追查源头。',
        },
      ],
    }));
  });

  const completePendingYangxinVerdict = (caseId = 'palace-strife-1') => {
    const begin = useGameFlowStore.getState().beginPendingYangxinVerdict(caseId);
    expect(begin.success).toBe(true);
    expect(useGameFlowStore.getState().advanceYangxinVerdict().success).toBe(true);
    expect(useGameFlowStore.getState().advanceYangxinVerdict().success).toBe(true);
    expect(useGameFlowStore.getState().advanceYangxinVerdict('accept').success).toBe(true);
    const event = useGameFlowStore.getState().pendingYangxinVerdict;
    expect(event?.stage).toBe('verdict');
    expect(useGameFlowStore.getState().finalizeYangxinVerdict(event?.id ?? '').success).toBe(true);
  };

  it('exports durable state as SaveGameV1 without transient UI fields', () => {
    const saveGame = useGameFlowStore.getState().exportSaveGameV1('2026-05-22T06:00:00.000Z');
    const encoded = JSON.stringify(saveGame);

    expect(saveGame.schemaVersion).toBe(SAVE_GAME_SCHEMA_VERSION);
    expect(saveGame.player.state.name).toBe('谢令仪');
    expect(saveGame.player.state.silver).toBe(1234);
    expect(saveGame.player.hiddenStats.initialRank).toBe('皇后');
    expect(saveGame.world.time.year).toBe(2);
    expect(saveGame.cases.palaceStrifeCases).toHaveLength(1);
    expect(encoded).not.toContain('currentView');
    expect(encoded).not.toContain('activeChamberPanel');
    expect(encoded).not.toContain('temporary map copy');
    expect(encoded).not.toContain('temporary line');
  });

  it('resolves daytime emperor audience without advancing time again', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      activeMapLocation: '养心殿',
      activeMapLocationEntryTime: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
      state: {
        ...state.state,
        favor: 80,
        trueHeart: 60,
        stats: {
          ...state.state.stats,
          intrigue: 900,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        favor: 80,
        trueHeart: 60,
      },
      nightlyService: {
        ...state.nightlyService,
        emperorMood: 70,
      },
    }));

    const beforeTime = useGameFlowStore.getState().time;
    const request = useGameFlowStore.getState().requestEmperorAudience('养心殿', 'yangxin-request');
    const interaction = useGameFlowStore.getState().completeEmperorMainInteraction('chess', '养心殿', 'yangxin-request');
    const flow = useGameFlowStore.getState();

    expect(request.chance).toBeGreaterThan(0);
    expect(interaction.success).toBe(true);
    expect(flow.time).toEqual(beforeTime);
    expect(flow.emperorInteraction.triggeredEncounterIds.some((id) => id.includes('养心殿:yangxin-request'))).toBe(true);
  });

  it('consumes a real inventory gift during emperor gift interaction', () => {
    const gift = useGameFlowStore.getState().inventory.find((item) => item.itemId === 'pine-wind-scroll');
    expect(gift?.quantity).toBeGreaterThan(0);

    const result = useGameFlowStore.getState().completeEmperorGift('pine-wind-scroll');
    const afterGift = useGameFlowStore.getState().inventory.find((item) => item.itemId === 'pine-wind-scroll');

    expect(result.success).toBe(true);
    expect(afterGift).toBeUndefined();
  });

  it('creates a dedicated palace banquet registration notice during the signup window', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      time: {
        year: 1,
        month: 1,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      palaceBanquetProgress: {
        submissionCount: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(1);

    const flow = useGameFlowStore.getState();
    expect(flow.time).toMatchObject({ year: 1, month: 2, xun: 1, slot: '清晨' });
    expect(flow.palaceBanquetProgress.lastRegistrationNoticeSeasonKey).toBe('1-3-1-palace-banquet');
    expect(flow.settlementReports.at(-1)).toMatchObject({
      kind: 'event',
      title: '宫宴报名开启',
    });
  });

  it('does not create a palace banquet registration notice before the one-month signup window', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      palaceBanquetProgress: {
        submissionCount: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(20);

    const flow = useGameFlowStore.getState();
    expect(flow.time).toMatchObject({ year: 1, month: 1, xun: 3, slot: '深夜' });
    expect(flow.palaceBanquetProgress.lastRegistrationNoticeSeasonKey).toBeUndefined();
    expect(flow.settlementReports.some((report) => report.title === '宫宴报名开启')).toBe(false);
  });

  it('resolves the system palace banquet once when time reaches the banquet slot', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        prestige: 2500,
        stats: {
          ...state.state.stats,
          talent: 10,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        prestige: 2500,
      },
      time: {
        year: 1,
        month: 3,
        xun: 1,
        slotIndex: 3,
        slot: '下午',
        slotProgress: 0,
      },
      musicHallProgress: {
        ...state.musicHallProgress,
        listenCount: 6,
        lianQiaoMet: true,
        lianQiaoFavor: 60,
        lianQiaoAffection: 60,
        musicScoreMastery: {
          'score-phoenix-return': {
            itemId: 'score-phoenix-return',
            name: '凤归云阙谱',
            color: 'red',
            rarity: 'red',
            difficulty: 85,
            masteryPercent: 160,
            practiceCount: 12,
            performanceScore: 150,
          },
        },
      },
      palaceBanquetProgress: {
        submissionCount: 1,
        submittedScore: {
          itemId: 'score-phoenix-return',
          name: '凤归云阙谱',
          color: 'red',
          rarity: 'red',
          seasonKey: '1-3-1-palace-banquet',
          submittedAt: {
            year: 1,
            month: 1,
            xun: 1,
            slotIndex: 1,
            slot: '上午',
            slotProgress: 0,
          },
        },
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
      nightlyService: {
        ...state.nightlyService,
        pendingEvent: undefined,
        pendingNotice: undefined,
      },
    }));

    useGameFlowStore.getState().advanceTime(1);
    const flow = useGameFlowStore.getState();
    const latestReport = flow.settlementReports.at(-1);

    expect(flow.time.slot).toBe('深夜');
    expect(flow.state.prestige).toBeGreaterThan(2500);
    expect(flow.palaceBanquetProgress.lastResolvedSeasonKey).toBe('1-3-1-palace-banquet');
    expect(flow.palaceBanquetProgress.lastResult?.scoreName).toBe('凤归云阙谱');
    expect(latestReport).toMatchObject({
      kind: 'event',
      title: '系统宫宴通报',
    });
    expect(flow.nightlyService.pendingEvent).toBeUndefined();
  });

  it('loads SaveGameV1 durable fields and resets transient UI state', () => {
    const saveGame = useGameFlowStore.getState().exportSaveGameV1('2026-05-22T06:00:00.000Z');

    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      activeChamberPanel: 'bond',
      mapEventText: 'stale text',
      dialogue: {
        speaker: 'stale',
        text: 'stale',
        options: [],
      },
      state: {
        ...state.state,
        name: 'Changed',
        silver: 1,
        favor: -20,
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1,
        favor: -20,
        initialRank: '才人',
      },
      time: {
        year: 9,
        month: 9,
        xun: 3,
        slotIndex: 5,
        slot: '夜晚',
        slotProgress: 0,
      },
    }));

    useGameFlowStore.getState().loadSaveGameV1(saveGame);

    const loaded = useGameFlowStore.getState();
    expect(loaded.state.name).toBe('谢令仪');
    expect(loaded.state.silver).toBe(1234);
    expect(loaded.hiddenStats.initialRank).toBe('皇后');
    expect(loaded.time.year).toBe(2);
    expect(loaded.time.month).toBe(3);
    expect(loaded.palaceStrifeCases).toHaveLength(1);
    expect(loaded.currentView).toBe('start');
    expect(loaded.activeChamberPanel).toBe('main');
    expect(loaded.activeMapLocation).toBeUndefined();
    expect(loaded.mapEventText).toBe('');
    expect(loaded.briefing).toBe('');
    expect(loaded.dialogue).toBeUndefined();
  });

  it('persists through a SaveGameV1 envelope instead of raw store fields', () => {
    const partialize = useGameFlowStore.persist.getOptions().partialize;
    expect(partialize).toBeTypeOf('function');

    const persisted = partialize?.(useGameFlowStore.getState()) as Record<string, unknown>;

    expect(persisted.saveGame).toMatchObject({
      schemaVersion: SAVE_GAME_SCHEMA_VERSION,
      player: {
        state: {
          name: '谢令仪',
          silver: 1234,
        },
      },
      world: {
        time: {
          year: 2,
        },
      },
      cases: {
        palaceStrifeCases: [
          {
            status: 'investigating',
          },
        ],
      },
    });
    expect(persisted.state).toBeUndefined();
    expect(persisted.hiddenStats).toBeUndefined();
    expect(persisted.currentView).toBeUndefined();
    expect(persisted.dialogue).toBeUndefined();
  });

  it('drops an incompatible persisted envelope during hydration instead of migrating it', () => {
    const merge = useGameFlowStore.persist.getOptions().merge;
    expect(merge).toBeTypeOf('function');
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify({ state: { saveGame: { schemaVersion: 1 } }, version: 0 }));

    const merged = merge?.(
      {
        saveGame: {
          schemaVersion: 1,
          savedAt: '2026-06-04T00:00:00.000Z',
          route: { routeId: 'yingluoyeting' },
          player: { state: { name: '旧档', routeId: 'yingluoyeting', stats: {} }, hiddenStats: {} },
          world: {
            time: { year: 1, month: 1, xun: 1, slotIndex: 0, slot: '清晨', slotProgress: 0 },
            settlementReports: [],
          },
          relations: { bondProfile: {}, consortInteractionMap: {} },
          progress: {},
        },
      } as unknown as Partial<ReturnType<typeof useGameFlowStore.getState>>,
      useGameFlowStore.getState(),
    ) as ReturnType<typeof useGameFlowStore.getState>;

    expect(localStorage.getItem(SAVE_GAME_STORAGE_KEY)).toBeNull();
    expect(merged.state.name).toBe(useGameFlowStore.getState().state.name);
    expect(merged.state.name).not.toBe('旧档');
  });

  it('starts a selected route with fresh durable state instead of carrying the previous persisted run', () => {
    const previous = useGameFlowStore.getState();
    const yingluoyeting = {
      id: 'yingluoyeting',
      label: '影落掖庭',
      labelArt: '/assets/routes/labels/yingluoyeting-vertical.png',
      intro: '',
      defaultName: '沉璧',
      familyDisplay: '罪臣之后',
      residenceDisplay: '储秀宫西偏殿',
      biography: '',
      clearanceRequirement: '',
      difficulty: '困难',
      portrait: '/assets/characters/women/chenbi.png',
      fontMask: '/assets/routes/fonts/yingluoyeting-mask.png',
      bannerHeight: 82,
      statsLocked: false,
      baseState: {
        name: '沉璧',
        family: '罪臣之后',
        residenceName: '储秀宫西偏殿',
        pointsTotal: 54,
        pointsLeft: 0,
      },
      hiddenStats: {
        silver: 50,
        prestige: 0,
        stress: 30,
        favor: 12,
        trueHeart: 10,
        favorLabel: '无宠',
        favorColor: '#7C7B78',
      },
    } as const;

    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      useGameFlowStore.setState((state) => ({
        ...state,
        state: {
          ...state.state,
          flags: {
            ...state.state.flags,
            [YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed]: true,
            [YINGLUOYETING_STORY_FLAGS.evidenceBoxDone]: true,
            mapGuideFinished: true,
            bedchamberIntroShown: true,
          },
        },
        time: {
          year: 9,
          month: 12,
          xun: 3,
          slotIndex: 5,
          slot: '夜晚',
          slotProgress: 0,
        },
        mapEventText: '旧局地图事件',
        briefing: '旧局简报',
        nightlyService: {
          ...state.nightlyService,
          playerNightFavorGauge: 88,
          reports: [
            {
              id: 'nightly-stale',
              xunKey: '9-12-3',
              year: 9,
              month: 12,
              xun: 3,
              outcome: 'player-companion',
              interest: 12,
              playerFavorDelta: 1,
              playerTrueHeartDelta: 0,
              playerPrestigeDelta: 0,
              emperorMoodDelta: 0,
              summary: '旧局侍寝通报',
              lines: ['旧局侍寝通报'],
            },
          ],
          pendingMorningLines: ['旧局清晨通报'],
        },
        settlementReports: [
          {
            id: 'settlement-stale',
            kind: 'xun',
            year: 9,
            month: 12,
            xun: 3,
            title: '旧局旬报',
            summary: '不应带入新局',
            lines: ['不应带入新局'],
          },
        ],
        palaceStrifeCases: [
          {
            id: 'palace-strife-stale',
            xunKey: '9-12-3',
            year: 9,
            month: 12,
            xun: 3,
            actorId: 'player',
            targetConsortId: 'consort-cui',
            targetName: '崔令蓉',
            actionKind: 'rumor',
            methodLabel: '散布流言',
            itemLabel: '不使用',
            allyLabel: '无',
            severity: 'light',
            actionSuccessRate: 52,
            concealmentSuccessRate: 61,
            actionRoll: 12,
            concealmentRoll: 88,
            actionSucceeded: true,
            concealmentSucceeded: false,
            status: 'investigating',
            outcome: 'pending',
            investigationXunsElapsed: 0,
            convictionRate: 35,
            summary: '旧局案件。',
          },
        ],
        latestSettlementReportId: 'settlement-stale',
        lastSeenSettlementReportId: 'settlement-stale',
        merchantLedger: { stale: 2 },
      }));

      useGameFlowStore.getState().applyRouteSelection(yingluoyeting!);

      const flow = useGameFlowStore.getState();
      const flags = flow.state.flags;
      expect(flags[YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed]).toBeUndefined();
      expect(flags[YINGLUOYETING_STORY_FLAGS.evidenceBoxDone]).toBeUndefined();
      expect(flags.mapGuideFinished).toBeUndefined();
      expect(flags.bedchamberIntroShown).toBeUndefined();
      expect(flags.routeLockedStats).toBe(Boolean(yingluoyeting.statsLocked));
      expect(flow.time).toMatchObject({
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      });
      expect(flow.mapEventText).toBe('');
      expect(flow.briefing).toBe('');
      expect(flow.state.residenceName).toBe('储秀宫西偏殿');
      expect(flow.nightlyService).toMatchObject({
        playerNightFavorGauge: 0,
        emperorMood: 40,
        reports: [],
      });
      expect(flow.nightlyService.pendingMorningLines).toBeUndefined();
      expect(flow.settlementReports).toEqual([]);
      expect(flow.palaceStrifeCases).toEqual([]);
      expect(flow.latestSettlementReportId).toBeUndefined();
      expect(flow.lastSeenSettlementReportId).toBeUndefined();
      expect(flow.merchantLedger).toEqual({});
    } finally {
      randomSpy.mockRestore();
      useGameFlowStore.setState(previous, true);
    }
  });

  it('registers palace strife for later resolution and pays the fortune cost immediately', () => {
    const target = useGameFlowStore.getState().concubines[0];
    const fortuneBefore = Number(useGameFlowStore.getState().state.stats.fortune ?? 0);

    const result = useGameFlowStore.getState().startPalaceStrifeCase({
      targetConsortId: target.id,
      actionKind: 'rumor',
      methodLabel: '散布流言',
      itemLabel: '与人偷情',
      allyLabel: '无',
      rolls: { action: 1, concealment: 99 },
    });

    const flow = useGameFlowStore.getState();
    expect(result.caseState.status).toBe('pending_resolution');
    expect(useGameFlowStore.getState().palaceStrifeCases).toContainEqual(result.caseState);
    expect(flow.state.stats.fortune).toBe(fortuneBefore - 5);
    expect(result.resultText).toContain('当旬夜晚');
  });

  it('resolves pending palace strife on the next xun transition before investigation growth begins', () => {
    const target = useGameFlowStore.getState().concubines[0];
    useGameFlowStore.setState((state) => ({
      ...state,
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().startPalaceStrifeCase({
      targetConsortId: target.id,
      actionKind: 'rumor',
      methodLabel: '散布流言',
      itemLabel: '与人偷情',
      allyLabel: '无',
      framedTargetName: '贵人 姚铃儿',
      rolls: { action: 1, concealment: 99 },
    });

    useGameFlowStore.getState().advanceTime(7);

    const flow = useGameFlowStore.getState();
    const resolvedCase = flow.palaceStrifeCases.find((caseState) => caseState.framedTargetName === '贵人 姚铃儿');
    expect(resolvedCase).toMatchObject({
      status: 'investigating',
      severity: 'medium',
      framedTargetName: '贵人 姚铃儿',
      investigationXunsElapsed: 0,
    });
    expect(flow.settlementReports[0].lines.join(' ')).toContain('娇娇回禀');
  });

  it('creates one npc palace strife case on xun transition when a high-risk concubine has a rival', () => {
    const [aggressor, rival, ...rest] = useGameFlowStore.getState().concubines;
    useGameFlowStore.setState((state) => ({
      ...state,
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      palaceStrifeCases: [],
      settlementReports: [],
      latestSettlementReportId: undefined,
      concubines: [
        {
          ...aggressor,
          stats: {
            ...aggressor.stats,
            ambition: 100,
            stress: 95,
            intrigue: 820,
          },
          rivals: [rival.id],
        },
        rival,
        ...rest,
      ],
      npcActivity: {
        xunKey: '2-3-2',
        triggeredVisitIds: [],
        entries: {
          [`npc-activity-2-3-2-${aggressor.id}`]: {
            id: `npc-activity-2-3-2-${aggressor.id}`,
            xunKey: '2-3-2',
            actorConsortId: aggressor.id,
            targetConsortId: rival.id,
            location: 'home',
            intent: 'hostile-plot',
            purpose: 'plot',
            summary: `${aggressor.name}暗中筹谋。`,
            resolved: false,
          },
        },
      },
    }));

    useGameFlowStore.getState().advanceTime(7);

    const flow = useGameFlowStore.getState();
    expect(flow.palaceStrifeCases).toHaveLength(1);
    expect(flow.palaceStrifeCases[0]).toMatchObject({
      actorId: 'npc',
      actorConsortId: aggressor.id,
      targetConsortId: rival.id,
      status: 'pending_resolution',
    });
    expect(flow.settlementReports[0].lines.join(' ')).toContain('宫中暗流');
  });

  it('creates npc palace strife cases that can target or frame the player', () => {
    const [aggressor, rival, ...rest] = useGameFlowStore.getState().concubines;
    useGameFlowStore.setState((state) => ({
      ...state,
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      palaceStrifeCases: [],
      settlementReports: [],
      latestSettlementReportId: undefined,
      concubines: [
        {
          ...aggressor,
          stats: {
            ...aggressor.stats,
            ambition: 100,
            stress: 95,
            intrigue: 820,
            relationToPlayer: -90,
          },
          rivals: [rival.id],
        },
        rival,
        ...rest,
      ],
      npcActivity: {
        xunKey: '2-3-2',
        triggeredVisitIds: [],
        entries: {
          [`npc-activity-2-3-2-${aggressor.id}`]: {
            id: `npc-activity-2-3-2-${aggressor.id}`,
            xunKey: '2-3-2',
            actorConsortId: aggressor.id,
            targetConsortId: PLAYER_PALACE_STRIFE_TARGET_ID,
            location: 'home',
            intent: 'hostile-plot',
            purpose: 'plot',
            summary: `${aggressor.name}暗中筹谋。`,
            resolved: false,
          },
        },
      },
    }));

    useGameFlowStore.getState().advanceTime(7);

    const flow = useGameFlowStore.getState();
    expect(flow.palaceStrifeCases[0]).toMatchObject({
      actorId: 'npc',
      actorConsortId: aggressor.id,
      targetConsortId: PLAYER_PALACE_STRIFE_TARGET_ID,
      targetName: '皇后 谢令仪',
      status: 'pending_resolution',
    });
  });

  it('resolves a required Yangxin hearing once and lowers conviction on successful argument', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        favor: 80,
        trueHeart: 60,
        stats: {
          ...state.state.stats,
          intrigue: 900,
          appearance: 800,
          temperament: 800,
        },
      },
      palaceStrifeCases: [
        {
          id: 'palace-strife-yangxin',
          xunKey: '2-3-2',
          year: 2,
          month: 3,
          xun: 2,
          actorId: 'player',
          targetConsortId: 'consort-cui',
          targetName: '崔令蓉',
          actionKind: 'rumor',
          methodLabel: '散布流言',
          itemLabel: '与人偷情',
          allyLabel: '无',
          severity: 'medium',
          actionSuccessRate: 52,
          concealmentSuccessRate: 61,
          actionRoll: 12,
          concealmentRoll: 88,
          actionSucceeded: true,
          concealmentSucceeded: false,
          status: 'investigating',
          outcome: 'pending',
          investigationXunsElapsed: 0,
          convictionRate: 60,
          yangxinHearingRequired: true,
          summary: '内廷已开始追查源头。',
        },
      ],
    }));

    const result = useGameFlowStore.getState().resolveYangxinPalaceStrifeCase('palace-strife-yangxin', 'argue');

    const flow = useGameFlowStore.getState();
    expect(result.success).toBe(true);
    expect(flow.palaceStrifeCases[0]).toMatchObject({
      yangxinHearingResolved: true,
      convictionRate: 30,
    });
    expect(result.message).toContain('据理力争');
  });

  it('advances palace strife investigations on xun transition and records the report line', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      palaceStrifeCases: [
        {
          id: 'palace-strife-1',
          xunKey: '2-3-2',
          year: 2,
          month: 3,
          xun: 2,
          actorId: 'player',
          targetConsortId: 'consort-cui',
          targetName: '崔令蓉',
          actionKind: 'rumor',
          methodLabel: '散布流言',
          itemLabel: '不使用',
          allyLabel: '无',
          severity: 'light',
          actionSuccessRate: 52,
          concealmentSuccessRate: 61,
          actionRoll: 12,
          concealmentRoll: 88,
          actionSucceeded: true,
          concealmentSucceeded: false,
          status: 'investigating',
          outcome: 'pending',
          investigationXunsElapsed: 0,
          convictionRate: 35,
          summary: '流言已起，内廷开始追查源头。',
        },
      ],
    }));

    useGameFlowStore.getState().advanceTime(7);

    const flow = useGameFlowStore.getState();
    expect(flow.palaceStrifeCases[0]).toMatchObject({
      convictionRate: 43,
      investigationXunsElapsed: 1,
      status: 'investigating',
    });
    expect(flow.settlementReports[0].lines.join(' ')).toContain('崔令蓉');
    expect(flow.settlementReports[0].lines.join(' ')).toContain('定案率43%');
  });

  it('spends silver to lower an investigating palace strife case conviction rate', () => {
    const result = useGameFlowStore.getState().bribePalaceStrifeCase('palace-strife-1', 20);

    const flow = useGameFlowStore.getState();
    expect(result.success).toBe(true);
    expect(flow.state.silver).toBe(1214);
    expect(flow.hiddenStats.silver).toBe(1214);
    expect(flow.palaceStrifeCases[0].convictionRate).toBe(30);
  });

  it('spends silver to raise or lower a specific palace strife suspect', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      palaceStrifeCases: state.palaceStrifeCases.map((caseState) => ({
        ...caseState,
        suspects: [
          {
            id: 'suspect-player',
            subjectType: 'player',
            subjectId: PLAYER_PALACE_STRIFE_TARGET_ID,
            name: '皇后 谢令仪',
            suspicionRate: 35,
            isActualActor: true,
            reason: '行动痕迹与动机最重，内廷优先追查。',
          },
          {
            id: 'suspect-cui',
            subjectType: 'consort',
            subjectId: 'consort-cui',
            name: '贵人 崔令蓉',
            suspicionRate: 70,
            isFramed: true,
            reason: '现场线索被刻意引向此人，嫌疑骤然升高。',
          },
        ],
        convictionRate: 70,
      })),
    }));

    const lower = useGameFlowStore.getState().adjustPalaceStrifeSuspect('palace-strife-1', 'suspect-cui', 'decrease');
    const raise = useGameFlowStore.getState().adjustPalaceStrifeSuspect('palace-strife-1', 'suspect-cui', 'increase');

    const flow = useGameFlowStore.getState();
    expect(lower.success).toBe(true);
    expect(raise.success).toBe(true);
    expect(flow.state.silver).toBe(1194);
    expect(flow.hiddenStats.silver).toBe(1194);
    expect(flow.palaceStrifeCases[0].suspects?.find((suspect) => suspect.id === 'suspect-cui')?.suspicionRate).toBe(70);
    expect(flow.palaceStrifeCases[0].convictionRate).toBe(70);
  });

  it('moves to pending verdict when suspect intervention pushes suspicion to 100', () => {
    const targetConsort = useGameFlowStore.getState().concubines[0];
    const beforePrestige = Number(targetConsort.stats.prestige ?? 0);
    useGameFlowStore.setState((state) => ({
      ...state,
      palaceStrifeCases: state.palaceStrifeCases.map((caseState) => ({
        ...caseState,
        suspects: [
          {
            id: `suspect-${targetConsort.id}`,
            subjectType: 'consort',
            subjectId: targetConsort.id,
            name: `${targetConsort.rankLabel} ${targetConsort.name}`,
            suspicionRate: 95,
            isFramed: true,
            reason: '现场线索被刻意引向此人，嫌疑骤然升高。',
          },
        ],
        convictionRate: 95,
      })),
    }));

    const result = useGameFlowStore.getState().adjustPalaceStrifeSuspect('palace-strife-1', `suspect-${targetConsort.id}`, 'increase');

    const flow = useGameFlowStore.getState();
    expect(result.success).toBe(true);
    expect(flow.palaceStrifeCases[0]).toMatchObject({
      status: 'pending_verdict',
      outcome: 'pending',
      pendingVerdictSuspectId: `suspect-${targetConsort.id}`,
      convictionRate: 100,
    });
    expect(flow.palaceStrifeCases[0].convictedSuspectId).toBeUndefined();
    expect(flow.concubines.find((consort) => consort.id === targetConsort.id)?.stats.prestige).toBe(beforePrestige);

    completePendingYangxinVerdict();

    const finalized = useGameFlowStore.getState();
    expect(finalized.palaceStrifeCases[0]).toMatchObject({
      status: 'resolved',
      outcome: 'convicted',
      convictedSuspectId: `suspect-${targetConsort.id}`,
      penaltyApplied: true,
    });
    expect(finalized.concubines.find((consort) => consort.id === targetConsort.id)?.stats.prestige).toBe(beforePrestige - 150);
  });

  it('applies player penalties only after Yangxin verdict finalization', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        prestige: 2500,
        favor: 40,
        stress: 20,
      },
      hiddenStats: {
        ...state.hiddenStats,
        prestige: 2500,
        favor: 40,
        stress: 20,
      },
      palaceStrifeCases: state.palaceStrifeCases.map((caseState) => ({
        ...caseState,
        suspects: [
          {
            id: 'suspect-player',
            subjectType: 'player',
            subjectId: PLAYER_PALACE_STRIFE_TARGET_ID,
            name: '皇后 谢令仪',
            suspicionRate: 95,
            isActualActor: true,
            reason: '行动痕迹与动机最重，内廷优先追查。',
          },
        ],
        convictionRate: 95,
      })),
    }));

    const result = useGameFlowStore.getState().adjustPalaceStrifeSuspect('palace-strife-1', 'suspect-player', 'increase');

    const flow = useGameFlowStore.getState();
    expect(result.success).toBe(true);
    expect(flow.palaceStrifeCases[0]).toMatchObject({
      status: 'pending_verdict',
      outcome: 'pending',
      pendingVerdictSuspectId: 'suspect-player',
    });
    expect(flow.state).toMatchObject({
      silver: 1214,
      prestige: 2500,
      favor: 40,
      stress: 20,
    });
    expect(flow.hiddenStats).toMatchObject({
      silver: 1214,
      prestige: 2500,
      favor: 40,
      stress: 20,
    });

    completePendingYangxinVerdict();

    const finalized = useGameFlowStore.getState();
    expect(finalized.palaceStrifeCases[0]).toMatchObject({
      status: 'resolved',
      outcome: 'convicted',
      convictedSuspectId: 'suspect-player',
      penaltyApplied: true,
    });
    expect(finalized.state).toMatchObject({
      silver: 1214,
      prestige: 2350,
      favor: 37,
      stress: 20,
    });
  });

  it('does not bribe palace strife cases when silver is insufficient', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        silver: 5,
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 5,
      },
    }));

    const result = useGameFlowStore.getState().bribePalaceStrifeCase('palace-strife-1', 10);

    const flow = useGameFlowStore.getState();
    expect(result.success).toBe(false);
    expect(flow.state.silver).toBe(5);
    expect(flow.palaceStrifeCases[0].convictionRate).toBe(35);
  });

  it('adds player silver through the debug store command and triggers numeric feedback', () => {
    const before = useGameFlowStore.getState();

    const result = useGameFlowStore.getState().debugAddSilver('66');

    const flow = useGameFlowStore.getState();
    expect(result).toMatchObject({
      success: true,
      requestedAmount: 66,
      appliedAmount: 66,
      silver: 1300,
    });
    expect(flow.state.silver).toBe(1300);
    expect(flow.hiddenStats.silver).toBe(1300);
    expect(flow.numericFeedbackSignal.sequence).toBe(before.numericFeedbackSignal.sequence + 1);
    expect(flow.numericFeedbackSignal.bucket).toBe('chamber-action');
  });

  it('rejects invalid debug silver amounts without changing state', () => {
    const before = useGameFlowStore.getState();

    const result = useGameFlowStore.getState().debugAddSilver('abc');

    const flow = useGameFlowStore.getState();
    expect(result.success).toBe(false);
    expect(result.appliedAmount).toBe(0);
    expect(flow.state.silver).toBe(before.state.silver);
    expect(flow.hiddenStats.silver).toBe(before.hiddenStats.silver);
    expect(flow.numericFeedbackSignal.sequence).toBe(before.numericFeedbackSignal.sequence);
  });

  it('allows player prestige losses to go below zero within the configured range', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        prestige: 100,
      },
      hiddenStats: {
        ...state.hiddenStats,
        prestige: 100,
      },
    }));

    useGameFlowStore.getState().applyStoryEffects({ prestige: -250 });

    const flow = useGameFlowStore.getState();
    expect(flow.state.prestige).toBe(-150);
    expect(flow.hiddenStats.prestige).toBe(-150);

    useGameFlowStore.getState().applyStoryEffects({ prestige: -5000 });

    const clampedFlow = useGameFlowStore.getState();
    expect(clampedFlow.state.prestige).toBe(PRESTIGE_RANGE[0]);
    expect(clampedFlow.hiddenStats.prestige).toBe(PRESTIGE_RANGE[0]);
  });

  it('applies player penalties once when a palace strife case becomes convicted', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        family: '未知',
        prestige: 100,
        favor: 50,
        stress: 20,
      },
      hiddenStats: {
        ...state.hiddenStats,
        prestige: 100,
        favor: 50,
        stress: 20,
      },
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      palaceStrifeCases: [
        {
          id: 'palace-strife-heavy',
          xunKey: '2-3-2',
          year: 2,
          month: 3,
          xun: 2,
          actorId: 'player',
          targetConsortId: 'consort-cui',
          targetName: '崔令蓉',
          actionKind: 'poison',
          methodLabel: '下毒',
          itemLabel: '鹤顶红',
          allyLabel: '无',
          severity: 'heavy',
          actionSuccessRate: 90,
          concealmentSuccessRate: 40,
          actionRoll: 12,
          concealmentRoll: 99,
          actionSucceeded: true,
          concealmentSucceeded: false,
          status: 'investigating',
          outcome: 'pending',
          investigationXunsElapsed: 1,
          convictionRate: 90,
          suspects: [
            {
              id: 'suspect-player',
              subjectType: 'player',
              subjectId: PLAYER_PALACE_STRIFE_TARGET_ID,
              name: '皇后 谢令仪',
              suspicionRate: 90,
              isActualActor: true,
              reason: '行动痕迹与动机最重，内廷优先追查。',
            },
          ],
          summary: '重案正在追查。',
        },
      ],
    }));

    useGameFlowStore.getState().advanceTime(7);

    const afterConviction = useGameFlowStore.getState();
    expect(afterConviction.palaceStrifeCases[0]).toMatchObject({
      status: 'pending_verdict',
      outcome: 'pending',
      pendingVerdictSuspectId: 'suspect-player',
    });
    expect(afterConviction.pendingYangxinVerdict?.stage).toBe('summon');
    expect(afterConviction.state.prestige).toBe(100);
    expect(afterConviction.state.favor).toBe(50);
    expect(afterConviction.state.stress).toBe(20);

    completePendingYangxinVerdict('palace-strife-heavy');

    const afterVerdict = useGameFlowStore.getState();
    expect(afterVerdict.palaceStrifeCases[0].outcome).toBe('convicted');
    expect(afterVerdict.state.prestige).toBe(-650);
    expect(afterVerdict.state.favor).toBe(40);
    expect(afterVerdict.state.stress).toBe(30);
    expect(afterVerdict.hiddenStats.prestige).toBe(-650);
    expect(afterVerdict.hiddenStats.favor).toBe(40);

    useGameFlowStore.getState().advanceTime(7);

    const afterNextXun = useGameFlowStore.getState();
    expect(afterNextXun.state.prestige).toBe(-650);
    expect(afterNextXun.state.favor).toBe(40);
    expect(afterNextXun.state.stress).toBe(30);
  });

  it('uses post-settlement resources for monthly rank feedback when conviction happens at month end', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        family: '未知',
        residenceName: '长春宫',
        silver: 1000,
        prestige: 1000,
        favor: 50,
        stress: 20,
        stats: {
          ...state.state.stats,
          fortune: 40,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        prestige: 1000,
        favor: 50,
        stress: 20,
        initialRank: '美人',
      },
      time: {
        year: 2,
        month: 3,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      palaceStrifeCases: [
        {
          id: 'palace-strife-heavy-month-end',
          xunKey: '2-3-3',
          year: 2,
          month: 3,
          xun: 3,
          actorId: 'player',
          targetConsortId: 'consort-cui',
          targetName: '贵人 崔令蓉',
          actionKind: 'poison',
          methodLabel: '下毒',
          itemLabel: '鹤顶红',
          allyLabel: '无',
          severity: 'heavy',
          actionSuccessRate: 90,
          concealmentSuccessRate: 40,
          actionRoll: 12,
          concealmentRoll: 99,
          actionSucceeded: true,
          concealmentSucceeded: false,
          status: 'investigating',
          outcome: 'pending',
          investigationXunsElapsed: 2,
          convictionRate: 90,
          suspects: [
            {
              id: 'suspect-player',
              subjectType: 'player',
              subjectId: PLAYER_PALACE_STRIFE_TARGET_ID,
              name: '美人 谢令仪',
              suspicionRate: 90,
              isActualActor: true,
              reason: '行动痕迹与动机最重，内廷优先追查。',
            },
          ],
          summary: '重案正在追查。',
        },
      ],
    }));

    useGameFlowStore.getState().advanceTime(1);

    const flow = useGameFlowStore.getState();
    const latestReport = flow.settlementReports.at(-1);
    expect(flow.state.prestige).toBe(1000);
    expect(flow.pendingYangxinVerdict?.stage).toBe('summon');
    expect(flow.hiddenStats.initialRank).toBe('嫔');
    expect(latestReport?.kind).toBe('month');
    expect(latestReport?.summary).toContain('当前位份：嫔');
    expect(latestReport?.summary).toContain('当前声望：1000 / 750');
    expect(latestReport?.summary).not.toContain('扣声望750');

    completePendingYangxinVerdict('palace-strife-heavy-month-end');

    const afterVerdict = useGameFlowStore.getState();
    expect(afterVerdict.state.prestige).toBe(250);
    expect(afterVerdict.palaceStrifeCases[0].outcome).toBe('convicted');
  });

  it('uses player-facing palace strife status in monthly reports', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        residenceName: '长春宫',
        silver: 1000,
        prestige: 900,
        favor: 45,
        stress: 18,
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        prestige: 900,
        favor: 45,
        stress: 18,
        initialRank: '婕好',
      },
      time: {
        year: 2,
        month: 3,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      palaceStrifeCases: [],
      concubines: state.concubines.map((consort, index) =>
        index === 0
          ? {
              ...consort,
              stats: {
                ...consort.stats,
                ambition: 100,
                stress: 95,
                intrigue: 820,
              },
              rivals: [state.concubines[1].id],
            }
          : consort,
      ),
      npcActivity: {
        xunKey: '2-3-3',
        triggeredVisitIds: [],
        entries: {
          [`npc-activity-2-3-3-${state.concubines[0].id}`]: {
            id: `npc-activity-2-3-3-${state.concubines[0].id}`,
            xunKey: '2-3-3',
            actorConsortId: state.concubines[0].id,
            targetConsortId: state.concubines[1].id,
            location: 'home',
            intent: 'hostile-plot',
            purpose: 'plot',
            summary: `${state.concubines[0].name}暗中筹谋。`,
            resolved: false,
          },
        },
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(1);

    const latestReport = useGameFlowStore.getState().settlementReports.at(-1);
    expect(latestReport?.summary).toContain('宫斗案件：本月有1条变动。');
    expect(latestReport?.summary).not.toContain('尚未接入真实判定');
  });

  it('does not add extra next-month guidance to monthly reports', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        residenceName: '长春宫',
        silver: 1000,
        prestige: 900,
        favor: 45,
        stress: 72,
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        prestige: 900,
        favor: 45,
        stress: 72,
        initialRank: '婕好',
      },
      time: {
        year: 2,
        month: 3,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      palaceStrifeCases: [],
      settlementReports: [],
      latestSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(1);

    const latestReport = useGameFlowStore.getState().settlementReports.at(-1);
    expect(latestReport?.summary).not.toContain('下月提点');
  });

  it('applies conviction penalties to npc actors instead of the player for npc palace strife cases', () => {
    const [actor, target, ...rest] = useGameFlowStore.getState().concubines;
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        prestige: 1000,
        favor: 50,
        stress: 20,
      },
      hiddenStats: {
        ...state.hiddenStats,
        prestige: 1000,
        favor: 50,
        stress: 20,
      },
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      concubines: [
        {
          ...actor,
          stats: {
            ...actor.stats,
            prestige: 900,
            favor: 40,
            stress: 20,
          },
        },
        target,
        ...rest,
      ],
      palaceStrifeCases: [
        {
          id: 'palace-strife-npc-heavy',
          xunKey: '2-3-2',
          year: 2,
          month: 3,
          xun: 2,
          actorId: 'npc',
          actorConsortId: actor.id,
          actorName: `${actor.rankLabel} ${actor.name}`,
          targetConsortId: target.id,
          targetName: `${target.rankLabel} ${target.name}`,
          actionKind: 'poison',
          methodLabel: '下毒',
          itemLabel: '鹤顶红',
          allyLabel: '无',
          severity: 'heavy',
          actionSuccessRate: 90,
          concealmentSuccessRate: 40,
          actionRoll: 12,
          concealmentRoll: 99,
          actionSucceeded: true,
          concealmentSucceeded: false,
          status: 'investigating',
          outcome: 'pending',
          investigationXunsElapsed: 1,
          convictionRate: 90,
          suspects: [
            {
              id: `suspect-${actor.id}`,
              subjectType: 'consort',
              subjectId: actor.id,
              name: `${actor.rankLabel} ${actor.name}`,
              suspicionRate: 90,
              isActualActor: true,
              reason: '行动痕迹与动机最重，内廷优先追查。',
            },
          ],
          summary: '重案正在追查。',
        },
      ],
    }));

    useGameFlowStore.getState().advanceTime(7);

    const flow = useGameFlowStore.getState();
    const penalizedActor = flow.concubines.find((consort) => consort.id === actor.id);
    expect(flow.state.prestige).toBe(1000);
    expect(flow.state.favor).toBe(50);
    expect(flow.state.stress).toBe(20);
    expect(flow.hiddenStats.prestige).toBe(1000);
    expect(penalizedActor?.stats.prestige).toBe(150);
    expect(penalizedActor?.stats.favor).toBe(30);
    expect(penalizedActor?.stats.stress).toBe(30);
    expect(flow.settlementReports[0].lines.join(' ')).toContain(actor.name);
  });

  it('defers player nightly service on xun transition and records it after interaction finalization', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        prestige: 900,
      },
      hiddenStats: {
        ...state.hiddenStats,
        favor: 50,
        trueHeart: 35,
        prestige: 900,
      },
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      nightlyService: {
        playerNightFavorGauge: 100,
        emperorMood: 40,
        reports: [],
        queuedRolls: {
          alone: 100,
          player: 1,
          pool: 1,
          interest: 80,
          pregnancy: 100,
        },
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(7);

    const pendingFlow = useGameFlowStore.getState();
    expect(pendingFlow.nightlyService.pendingEvent?.outcome).toBe('player-service');
    expect(pendingFlow.nightlyService.playerNightFavorGauge).toBe(100);
    expect(pendingFlow.state.favor).toBe(50);
    expect(pendingFlow.settlementReports).toHaveLength(0);

    useGameFlowStore.getState().finalizePendingNightlyService(['music', 'poetry', 'gentle']);

    const flow = useGameFlowStore.getState();
    expect(flow.nightlyService.pendingEvent).toBeUndefined();
    expect(flow.nightlyService.playerNightFavorGauge).toBe(0);
    expect(flow.nightlyService.reports.at(-1)?.outcome).toBe('player-service');
    expect(flow.state.favor).toBeGreaterThan(50);
    expect(flow.hiddenStats.favor).toBe(flow.state.favor);
    expect(flow.settlementReports.at(-1)?.lines.join(' ')).toContain('养心殿侍寝已毕');
  });

  it('announces the nightly service target when time enters night before morning settlement', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        favor: 1,
      },
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 4,
        slot: '傍晚',
        slotProgress: 0,
      },
      nightlyService: {
        playerNightFavorGauge: 0,
        emperorMood: 40,
        reports: [],
        queuedRolls: {
          alone: 100,
          player: 100,
          pool: 1,
          interest: 60,
          pregnancy: 100,
        },
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(1);

    const flow = useGameFlowStore.getState();
    expect(flow.time.slot).toBe('夜晚');
    expect(flow.nightlyService.pendingNotice?.lines.join(' ')).toContain('夜里太监来报');
    expect(flow.settlementReports).toHaveLength(0);

    useGameFlowStore.getState().acknowledgeNightlyServiceNotice();
    useGameFlowStore.getState().advanceTime(1);

    const deepNightFlow = useGameFlowStore.getState();
    expect(deepNightFlow.time.slot).toBe('深夜');
    expect(deepNightFlow.settlementReports).toHaveLength(0);

    useGameFlowStore.getState().advanceTime(1);

    const morningFlow = useGameFlowStore.getState();
    expect(morningFlow.time).toMatchObject({
      year: 2,
      month: 3,
      xun: 3,
      slot: '清晨',
    });
    expect(morningFlow.nightlyService.pendingNotice).toBeUndefined();
    expect(morningFlow.settlementReports.at(-1)?.title).toBe('2年3月第3旬清晨通报');
    expect(morningFlow.settlementReports.at(-1)?.lines.join(' ')).toContain('侍寝保底值');
  });

  it('reveals pregnancy on the morning report after finalized player service', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        name: '谢令仪',
        favor: 50,
        trueHeart: 35,
        prestige: 900,
        stats: {
          ...state.state.stats,
          fortune: 30,
        },
        flags: {
          ...state.state.flags,
          attributeStatsFinalized: true,
          pregnant: false,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        favor: 50,
        trueHeart: 35,
        prestige: 900,
      },
      time: {
        year: 2,
        month: 3,
        xun: 2,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      nightlyService: {
        playerNightFavorGauge: 100,
        emperorMood: 40,
        reports: [],
        queuedRolls: {
          alone: 100,
          player: 1,
          pool: 1,
          interest: 80,
          pregnancy: 30,
        },
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(7);
    useGameFlowStore.getState().finalizePendingNightlyService(['music', 'poetry', 'gentle']);

    const flow = useGameFlowStore.getState();
    expect(flow.state.flags.pregnant).toBe(true);
    expect(flow.settlementReports.at(-1)?.lines.join(' ')).toContain('太医请脉');
  });

  it('limits player-consort interactions per consort each xun', () => {
    const consort = useGameFlowStore.getState().concubines[0];

    for (let index = 0; index < CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN; index += 1) {
      const result = useGameFlowStore.getState().recordConsortInteractionAction(consort.id, 'greet');
      expect(result.success).toBe(true);
      expect(result.actionCountThisXun).toBe(index + 1);
      expect(result.actionLimitHit).toBe(false);
    }

    const blocked = useGameFlowStore.getState().recordConsortInteractionAction(consort.id, 'gift');
    expect(blocked.success).toBe(false);
    expect(blocked.actionLimitHit).toBe(true);
    expect(useGameFlowStore.getState().consortInteractionMap[consort.id].actionCountThisXun).toBe(
      CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN,
    );
  });

  it('blocks relationship judgement after the consort interaction limit is reached', () => {
    const consort = useGameFlowStore.getState().concubines[0];

    for (let index = 0; index < CONSORT_INTERACTION_ACTION_LIMIT_PER_XUN; index += 1) {
      useGameFlowStore.getState().recordConsortInteractionAction(consort.id, 'greet');
    }

    const beforeRelation = useGameFlowStore.getState().concubines[0].stats.relationToPlayer;
    const summary = useGameFlowStore.getState().applyConsortRelationshipJudgement(consort.id, 'greet', {
      favorDelta: 3,
      affectionDelta: 2,
      toneTag: 'friendly',
      optionText: '温声问候',
      reason: '对方愿意接话。',
      confidence: 0.8,
      source: 'local',
    });

    expect(summary.actionLimitHit).toBe(true);
    expect(summary.appliedFavorDelta).toBe(0);
    expect(useGameFlowStore.getState().concubines[0].stats.relationToPlayer).toBe(beforeRelation);
  });
});
