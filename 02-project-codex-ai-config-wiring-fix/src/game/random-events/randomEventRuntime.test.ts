import { describe, expect, it } from 'vitest';
import type { ConcubineProfile, GameNumericsState, InventoryItem } from '../types';
import { parseRandomEventCsv } from './randomEventCatalog';
import {
  advanceRandomEventLine,
  applyRandomEventEffect,
  applyRandomEventUnlocks,
  beginRandomEventSession,
  completeRandomEvent,
  createInitialRandomEventProgress,
  getRandomEventCurrentLine,
  getRandomEventCurrentOptions,
  listEligibleRandomEvents,
  pickRandomEvent,
  selectRandomEventOption,
} from './randomEventRuntime';

const header =
  'eventId,rowType,poolId,weight,repeatPolicy,prerequisiteEventIds,branchId,order,speakerIdentity,speakerName,portraitKey,portraitPlacement,narrationName,text,sceneHint,optionId,optionLabel,nextBranchId,effectJson,unlockEventIds,notes';

const csv = `${header}
first,event,pool,9,once,,,,,,,,,,,,,,,,
first,line,,,,,start,1,旁白,,,,,"{{playerName}}遇见{{targetName}}",,,,,,
first,option,,,,,start,,,,,,,,,good,示好,result,"{""target"":{""relationToPlayer"":2}}",locked,
first,line,,,,,result,1,旁白,,,,,结果,"",,,,,
locked,event,pool,1,once,first,,,,,,,,,,,,,,,
locked,line,,,,,start,1,旁白,,,,,后续,,,,,,
daily,event,pool,1,repeatable,,,,,,,,,,,,,,,,
daily,line,,,,,start,1,旁白,,,,,日常,"",,,,"{""player"":{""stress"":-1}}",,`;

const catalog = parseRandomEventCsv(csv);

const player: GameNumericsState = {
  name: '谢令仪',
  age: 16,
  family: '寒门',
  residenceName: '储秀宫西偏殿',
  pointsTotal: 0,
  pointsLeft: 0,
  routeId: 'yingluoyeting',
  stamina: 5,
  silver: 20,
  prestige: 0,
  stress: 10,
  favor: 0,
  trueHeart: 0,
  stats: { intrigue: 1 },
  flags: {},
};

const target: ConcubineProfile = {
  id: 'yao',
  portraitId: 'yao',
  name: '姚铃儿',
  rankLabel: '贵人',
  status: 'live',
  residence: '长乐宫',
  stateLabel: '平稳',
  age: 18,
  familyBackground: '官宦',
  personality: '爽利',
  summary: '测试妃嫔',
  source: 'fixed',
  stats: {
    prestige: 100,
    favor: 10,
    familyInfluence: 20,
    health: 80,
    appearance: 70,
    relationToPlayer: 0,
    childrenCount: 0,
    ambition: 30,
    stress: 5,
    intrigue: 20,
    temperament: 70,
    affection: 0,
    fortune: 50,
  },
  allies: [],
  rivals: [],
};

describe('randomEventRuntime', () => {
  it('filters eligible events by prerequisites, repeat policy and option unlocks', () => {
    const progress = createInitialRandomEventProgress();
    expect(listEligibleRandomEvents({ poolId: 'pool', progress, catalog }).map((event) => event.eventId)).toEqual([
      'first',
      'daily',
    ]);

    const afterFirst = completeRandomEvent({ ...beginRandomEventSession({ eventId: 'first', catalog }), stage: 'done' }, progress);
    expect(listEligibleRandomEvents({ poolId: 'pool', progress: afterFirst, catalog }).map((event) => event.eventId)).toEqual(['daily']);

    const unlocked = applyRandomEventUnlocks(afterFirst, ['locked']);
    expect(listEligibleRandomEvents({ poolId: 'pool', progress: unlocked, catalog }).map((event) => event.eventId)).toEqual([
      'locked',
      'daily',
    ]);
  });

  it('picks weighted events using caller-provided random', () => {
    const progress = createInitialRandomEventProgress();
    expect(pickRandomEvent({ poolId: 'pool', progress, random: () => 0.1, catalog })?.eventId).toBe('first');
    expect(pickRandomEvent({ poolId: 'pool', progress, random: () => 0.95, catalog })?.eventId).toBe('daily');
  });

  it('plays start lines, options and selected result branch', () => {
    let session = beginRandomEventSession({
      eventId: 'first',
      variables: { playerName: '谢令仪', targetName: '姚铃儿' },
      catalog,
    });
    expect(getRandomEventCurrentLine(session, catalog)?.text).toContain('谢令仪遇见姚铃儿');

    const firstAdvance = advanceRandomEventLine(session, catalog);
    session = firstAdvance.session;
    expect(firstAdvance.awaitingOptions).toBe(true);
    expect(getRandomEventCurrentOptions(session, catalog)).toHaveLength(1);

    const optionResult = selectRandomEventOption(session, 'good', catalog);
    expect(optionResult.effect?.target?.relationToPlayer).toBe(2);
    expect(optionResult.unlockEventIds).toEqual(['locked']);

    const resultAdvance = advanceRandomEventLine(optionResult.session, catalog);
    expect(resultAdvance.completed).toBe(true);
    const progress = completeRandomEvent(resultAdvance.session, createInitialRandomEventProgress());
    expect(progress.triggerCounts.first).toBe(1);
  });

  it('returns line effects when leaving the line', () => {
    const session = beginRandomEventSession({ eventId: 'daily', catalog });
    const result = advanceRandomEventLine(session, catalog);
    expect(result.effect?.player?.stress).toBe(-1);
    expect(result.completed).toBe(true);
  });

  it('applies player, target and inventory effects without touching store', () => {
    const item: InventoryItem = {
      itemId: 'test-gift',
      name: '测试礼',
      category: 'gift',
      rarity: 'green',
      quantity: 1,
      price: 5,
      favorDelta: 0,
      healthDelta: 0,
      appearanceDelta: 0,
      temperamentDelta: 0,
      description: '测试',
    };
    const result = applyRandomEventEffect(
      {
        player: { silver: 5, stress: -3, stats: { intrigue: 2 } },
        target: { relationToPlayer: 3, stress: 2 },
        inventory: { gain: [{ itemId: 'test-gift', quantity: 2 }], lose: [{ itemId: 'test-gift', quantity: 1 }] },
      },
      { player, target, inventory: [{ ...item }], itemCatalog: [item] },
    );

    expect(result.player.silver).toBe(25);
    expect(result.player.stress).toBe(7);
    expect(result.player.stats.intrigue).toBe(3);
    expect(result.target?.stats.relationToPlayer).toBe(3);
    expect(result.target?.stats.stress).toBe(7);
    expect(result.inventory.find((entry) => entry.itemId === 'test-gift')?.quantity).toBe(2);
  });

  it('rejects target effects without target context and inventory losses without stock', () => {
    expect(() => applyRandomEventEffect({ target: { stress: 1 } }, { player })).toThrow(/requires a target/);
    expect(() =>
      applyRandomEventEffect(
        { inventory: { lose: [{ itemId: 'missing', quantity: 1 }] } },
        { player, inventory: [] },
      ),
    ).toThrow(/not enough quantity/);
  });
});
