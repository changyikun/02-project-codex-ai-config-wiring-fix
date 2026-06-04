/* @vitest-environment jsdom */

import { describe, expect, it } from 'vitest';

import {
  buildSaveGameV1,
  clearSaveGameV1Storage,
  readSaveGameV1FromStorage,
  SAVE_GAME_SCHEMA_VERSION,
  SAVE_GAME_STORAGE_KEY,
  type SaveGameV1Source,
} from './saveGameV1';
import { buildInitialBondProfile } from '../data/bondPresets';
import { buildInitialConcubineRoster } from '../data/concubineRoster';
import { cloneInitialInventory } from '../data/inventoryPresets';

const source: SaveGameV1Source = {
  routeId: 'lanyinxuguo',
  state: {
    name: '谢令仪',
    age: 16,
    family: '镇国公嫡女',
    residenceName: '椒房殿',
    openingTendency: '节衣缩食',
    pointsTotal: 56,
    pointsLeft: 0,
    routeId: 'lanyinxuguo',
    stamina: 8,
    silver: 1120,
    prestige: 2600,
    stress: 25,
    favor: 52,
    trueHeart: 35,
    stats: {
      health: 5,
      appearance: 5,
      temperament: 5,
    },
    flags: {
      mapGuideFinished: true,
    },
  },
  hiddenStats: {
    silver: 1120,
    prestige: 2600,
    stress: 25,
    favor: 52,
    trueHeart: 35,
    favorLabel: '得宠',
    favorColor: '#7371D8',
    initialRank: '皇后',
  },
  time: {
    year: 1,
    month: 2,
    xun: 1,
    slotIndex: 0,
    slot: '清晨',
    slotProgress: 0,
  },
  selectedRoute: undefined,
  bondProfile: buildInitialBondProfile('lanyinxuguo', '1-2-1'),
  concubineRouteId: 'lanyinxuguo',
  concubines: buildInitialConcubineRoster('lanyinxuguo'),
  customConsorts: [],
  inventory: cloneInitialInventory(),
  merchantLedger: {
    '1-2-1:embroidered-sachet': 1,
  },
  consortInteractionMap: {},
  kitchenProgress: {
    strollCount: 1,
    buZiyouUnlocked: false,
    buZiyouMet: false,
    buZiyouFavor: 0,
    buZiyouAffinity: 0,
  },
  medicalProgress: {
    strollCount: 0,
    consultationCount: 1,
    jianNingMet: true,
    jianNingFavor: 1,
    jianNingAffinity: 0,
  },
  musicHallProgress: {
    listenCount: 1,
    strollCount: 0,
    signUpCount: 0,
    lianQiaoFirstMet: false,
    lianQiaoMet: false,
    lianQiaoFavor: 0,
    lianQiaoAffection: 0,
  },
  palaceBanquetProgress: {
    submissionCount: 0,
  },
  templeProgress: {
    worshipCount: 0,
    prayerCount: 1,
    strollCount: 0,
    dangYiFavor: 0,
    dangYiAffinity: 0,
  },
  nightlyService: {
    playerNightFavorGauge: 6,
    emperorMood: 40,
    reports: [],
  },
  npcActivity: {
    xunKey: '1-2-1',
    entries: {},
    triggeredVisitIds: [],
  },
  npcRelationMatrix: {},
  settlementReports: [
    {
      id: 'settlement-1',
      kind: 'xun',
      year: 1,
      month: 2,
      xun: 1,
      title: '旬初通报',
      summary: '体力恢复。',
      lines: ['体力恢复。'],
    },
  ],
  palaceStrifeCases: [
    {
      id: 'palace-strife-1',
      xunKey: '1-2-1',
      year: 1,
      month: 2,
      xun: 1,
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
  latestSettlementReportId: 'settlement-1',
  lastSeenSettlementReportId: undefined,
};

describe('SaveGameV1', () => {
  it('captures the current durable game state in explicit buckets', () => {
    const saveGame = buildSaveGameV1(source, '2026-05-22T05:00:00.000Z');

    expect(saveGame.schemaVersion).toBe(SAVE_GAME_SCHEMA_VERSION);
    expect(saveGame.route.routeId).toBe('lanyinxuguo');
    expect(saveGame.player.state.name).toBe('谢令仪');
    expect(saveGame.player.hiddenStats.initialRank).toBe('皇后');
    expect(saveGame.world.time.month).toBe(2);
    expect(saveGame.world.settlementReports).toHaveLength(1);
    expect(saveGame.cases.palaceStrifeCases).toHaveLength(1);
    expect(saveGame.cases.palaceStrifeCases[0].status).toBe('investigating');
    expect(saveGame.roster.concubines.length).toBeGreaterThan(0);
    expect(saveGame.inventory.items.length).toBeGreaterThan(0);
    expect(saveGame.progress.medical.jianNingMet).toBe(true);
    expect(saveGame.progress.palaceBanquet.submissionCount).toBe(0);
    expect(saveGame.progress.npcActivity.xunKey).toBe('1-2-1');
    expect(saveGame.relations.bondProfile.npcId).toBe(source.bondProfile.npcId);
    expect(saveGame.relations.npcRelationMatrix).toEqual({});
  });

  it('keeps transient UI state out of the durable save schema', () => {
    const saveGame = buildSaveGameV1(source, '2026-05-22T05:00:00.000Z');
    const encoded = JSON.stringify(saveGame);

    expect(encoded).not.toContain('currentView');
    expect(encoded).not.toContain('activeChamberPanel');
    expect(encoded).not.toContain('dialogue');
    expect(encoded).not.toContain('mapEventText');
    expect(encoded).not.toContain('briefing');
  });

  it('reads and clears the persisted SaveGameV1 envelope', () => {
    const saveGame = buildSaveGameV1(source, '2026-05-22T05:00:00.000Z');
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify({ state: { saveGame }, version: 0 }));

    expect(readSaveGameV1FromStorage()?.savedAt).toBe('2026-05-22T05:00:00.000Z');

    clearSaveGameV1Storage();

    expect(readSaveGameV1FromStorage()).toBeUndefined();
  });

  it('clears an incompatible persisted envelope instead of migrating it', () => {
    const incompatibleSaveGame = buildSaveGameV1(source, '2026-05-22T05:00:00.000Z') as unknown as {
      progress: Partial<ReturnType<typeof buildSaveGameV1>['progress']>;
    };
    delete incompatibleSaveGame.progress.npcActivity;
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify({ state: { saveGame: incompatibleSaveGame }, version: 0 }));

    expect(readSaveGameV1FromStorage()).toBeUndefined();
    expect(localStorage.getItem(SAVE_GAME_STORAGE_KEY)).toBeNull();
  });
});
