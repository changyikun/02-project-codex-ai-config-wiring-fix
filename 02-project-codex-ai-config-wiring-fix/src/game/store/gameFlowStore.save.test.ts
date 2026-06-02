/* @vitest-environment jsdom */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { PRESTIGE_RANGE } from '../../config/constants';
import { YINGLUOYETING_STORY_FLAGS } from '../lib/yingluoyetingStoryRuntime';
import { SAVE_GAME_SCHEMA_VERSION } from '../save/saveGameV1';
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

  it('creates a dedicated palace banquet registration notice during the signup window', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      time: {
        year: 1,
        month: 11,
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
    expect(flow.palaceBanquetProgress.lastRegistrationNoticeSeasonKey).toBe('2-3-1-palace-banquet');
    expect(flow.settlementReports.at(-1)).toMatchObject({
      kind: 'event',
      title: '宫宴报名开启',
    });
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

  it('starts a selected route with fresh durable state instead of carrying the previous persisted run', () => {
    const previous = useGameFlowStore.getState();
    const yingluoyeting = {
      id: 'yingluoyeting',
      label: '影落掖庭',
      labelArt: '/assets/routes/labels/yingluoyeting-vertical.png',
      intro: '',
      defaultName: '沉璧',
      familyDisplay: '罪臣之后',
      residenceDisplay: '掖庭院',
      biography: '',
      clearanceRequirement: '',
      difficulty: '困难',
      portrait: '/assets/routes/portraits/yingluoyeting.png',
      fontMask: '/assets/routes/fonts/yingluoyeting-mask.png',
      bannerHeight: 82,
      statsLocked: false,
      baseState: {
        name: '沉璧',
        family: '罪臣之后',
        residenceName: '掖庭院',
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
          summary: '重案正在追查。',
        },
      ],
    }));

    useGameFlowStore.getState().advanceTime(7);

    const afterConviction = useGameFlowStore.getState();
    expect(afterConviction.palaceStrifeCases[0].outcome).toBe('convicted');
    expect(afterConviction.state.prestige).toBe(-650);
    expect(afterConviction.state.favor).toBe(40);
    expect(afterConviction.state.stress).toBe(30);
    expect(afterConviction.hiddenStats.prestige).toBe(-650);
    expect(afterConviction.hiddenStats.favor).toBe(40);
    expect(afterConviction.settlementReports[0].lines.join(' ')).toContain('扣声望750');

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
          summary: '重案正在追查。',
        },
      ],
    }));

    useGameFlowStore.getState().advanceTime(1);

    const flow = useGameFlowStore.getState();
    const latestReport = flow.settlementReports.at(-1);
    expect(flow.state.prestige).toBe(250);
    expect(flow.hiddenStats.initialRank).toBe('才人');
    expect(latestReport?.kind).toBe('month');
    expect(latestReport?.summary).toContain('当前位份：才人');
    expect(latestReport?.summary).toContain('当前声望：250 / 350');
    expect(latestReport?.summary).toContain('扣声望750');
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
          fortune: 3,
        },
        flags: {
          ...state.state.flags,
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
});
