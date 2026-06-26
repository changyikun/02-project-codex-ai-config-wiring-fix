/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { CONSORT_DIALOGUE_TIMEOUT_MS } from '../ai/consortDialogueAgent';
import { EmperorAudiencePanel } from '../components/chamber/EmperorAudiencePanel';
import { InventoryPanelView } from '../components/chamber/ChamberUtilityViews';
import { GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { GlobalDialogue } from '../components/dialogue/PalaceDialogueBox';
import { getFavorTierByValue, STAMINA_INITIAL_PER_XUN } from '../config/constants';
import { GUIDE_TENDENCY_OPTIONS } from '../config/palaceUi';
import { buildInitialBondProfile } from '../game/data/bondPresets';
import { buildInitialConcubineRoster } from '../game/data/concubineRoster';
import { buildDuNiangShopCatalog, buildMusicScoreItem, buildYetingPoisonCatalog, cloneInitialInventory } from '../game/data/inventoryPresets';
import { buildRouteProfiles } from '../game/data/routeProfiles';
import { buildInitialNpcActivityState } from '../game/lib/npcActivityRuntime';
import { YINGLUOYETING_STORY_FLAGS } from '../game/lib/yingluoyetingStoryRuntime';
import { SAVE_GAME_STORAGE_KEY } from '../game/save/saveGameV1';
import { useGameFlowStore } from '../game/store/gameFlowStore';

const resetFlowStore = () => {
  const defaultFavorTier = getFavorTierByValue(50);
  useGameFlowStore.setState((state) => ({
    ...state,
    currentView: 'start',
    scene: 'menu',
    activeChamberPanel: 'main',
    activeMapLocation: undefined,
    activeAffairsSource: '宫斗事务',
    routeId: 'lanyinxuguo',
    state: {
      ...state.state,
      routeId: 'lanyinxuguo',
      openingTendency: undefined,
      monthlyExpenseStrategy: 'balanced',
      nextMonthlyExpenseStrategy: undefined,
      familyAidBonus: 0,
      familyAidPrestigePending: 0,
      stamina: STAMINA_INITIAL_PER_XUN,
      silver: 1000,
      prestige: 2500,
      stress: 30,
      favor: 50,
      trueHeart: 35,
      flags: {},
    },
    hiddenStats: {
      silver: 1000,
      prestige: 2500,
      stress: 30,
      favor: 50,
      trueHeart: 35,
      favorLabel: defaultFavorTier.label,
      favorColor: defaultFavorTier.color,
      initialRank: undefined,
    },
    selectedRoute: undefined,
    briefing: '',
    dialogue: undefined,
    mapEventText: '',
    save: undefined,
    settlementReports: [],
    latestSettlementReportId: undefined,
    lastSeenSettlementReportId: undefined,
    palaceStrifeCases: [],
    pendingYangxinVerdict: undefined,
    numericFeedbackSignal: { sequence: 0, bucket: 'chamber-action' },
    pendingViewTransitionCleanup: undefined,
    bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
    concubineRouteId: 'lanyinxuguo',
    concubines: buildInitialConcubineRoster('lanyinxuguo'),
    customConsorts: [],
    inventory: cloneInitialInventory(),
    merchantLedger: {},
    npcActivity: buildInitialNpcActivityState(),
    npcRelationMatrix: {},
    permanentNpcRelationships: {},
    randomEventProgress: {
      triggerCounts: {},
      unlockedEventIds: [],
      pendingUnlocks: [],
    },
    consortInteractionMap: {},
    kitchenProgress: {
      strollCount: 0,
      buZiyouUnlocked: false,
      buZiyouMet: false,
      buZiyouFavor: 0,
      buZiyouAffinity: 0,
    },
    medicalProgress: {
      strollCount: 0,
      consultationCount: 0,
      jianNingMet: false,
      jianNingFavor: 0,
      jianNingAffinity: 0,
    },
    musicHallProgress: {
      listenCount: 0,
      strollCount: 0,
      signUpCount: 0,
      lianQiaoFirstMet: false,
      lianQiaoMet: false,
      lianQiaoFavor: 0,
      lianQiaoAffection: 0,
    },
    palaceBanquetProgress: {
      submissionCount: 0,
      lastRegistrationNoticeSeasonKey: '1-3-1-palace-banquet',
    },
    craftWorksProgress: {
      activeWorks: {},
    },
    templeProgress: {
      worshipCount: 0,
      prayerCount: 0,
      strollCount: 0,
      dangYiFavor: 0,
      dangYiAffinity: 0,
    },
    nightlyService: {
      playerNightFavorGauge: 0,
      emperorMood: 40,
      reports: [],
      pendingEvent: undefined,
      pendingNotice: undefined,
      pendingMorningLines: undefined,
      latestReportId: undefined,
      queuedRolls: undefined,
    },
    time: {
      year: 1,
      month: 1,
      xun: 1,
      slotIndex: 0,
      slot: '清晨',
      slotProgress: 0,
    },
  }));
};

const getDialoguePageTarget = () => document.querySelector<HTMLElement>('[data-dialogue-page-state="more"]');
const getDialogueContent = () => document.querySelector<HTMLElement>('.palace-dialogue-box__content');

const advanceDialoguePages = async () => {
  await waitFor(() => expect(getDialoguePageTarget()).toBeTruthy(), { timeout: 500 }).catch(() => undefined);
  let dialogueContent = getDialoguePageTarget();
  while (dialogueContent) {
    fireEvent.click(dialogueContent);
    await Promise.resolve();
    dialogueContent = getDialoguePageTarget();
  }
};

const clickDialogueAdvance = async () => {
  await advanceDialoguePages();
  const dialogueContent = getDialogueContent();
  expect(dialogueContent).toBeInTheDocument();
  fireEvent.click(dialogueContent!);
  await Promise.resolve();
};

const clickDialogueOnce = async () => {
  const dialogueContent = getDialogueContent();
  expect(dialogueContent).toBeInTheDocument();
  fireEvent.click(dialogueContent!);
  await Promise.resolve();
};

const advanceFirstPaintingWork = async () => {
  let craftPanel = await screen.findByLabelText('字画制作面板');
  fireEvent.click(within(craftPanel).getByRole('button', { name: /才思泉涌/ }));
  await waitFor(() => expect(useGameFlowStore.getState().craftWorksProgress.activeWorks).not.toEqual({}));
  await clickDialogueAdvance();
  fireEvent.click(await screen.findByRole('button', { name: '泼墨作画' }));
  craftPanel = await screen.findByLabelText('字画制作面板');
  const activeWork = Object.values(useGameFlowStore.getState().craftWorksProgress.activeWorks)[0];
  expect(activeWork).toBeDefined();
  await waitFor(() => {
    expect(within(craftPanel).getByText(/完成度 0%/)).toBeInTheDocument();
  });
  fireEvent.click(within(craftPanel).getByRole('button', { name: new RegExp(activeWork?.name ?? '') }));
  return activeWork?.name ?? '';
};

const dismissPalaceBanquetRegistrationNoticeIfPresent = async () => {
  act(() => {
    useGameFlowStore.setState((flow) => ({
      ...flow,
      palaceBanquetProgress: {
        ...flow.palaceBanquetProgress,
        lastRegistrationNoticeSeasonKey: '1-3-1-palace-banquet',
      },
    }));
  });

  await waitFor(() => expect(screen.queryByLabelText('宫宴通报场景')).toBeInTheDocument(), { timeout: 250 }).catch(() => undefined);
  if (screen.queryByLabelText('宫宴通报场景')) {
    await clickDialogueAdvance();
  }
};

const clickMapGuideReturnToChamber = async () => {
  const guideDialog = screen.queryByLabelText('地图引导对话框');
  if (guideDialog) {
    const dialogueContent = guideDialog.querySelector('.palace-dialogue-box__content');
    expect(dialogueContent).toBeInTheDocument();
    fireEvent.click(dialogueContent as Element);
    return;
  }

  const sidebar = await screen.findByLabelText('寝殿左侧功能栏');
  fireEvent.click(within(sidebar).getByRole('button', { name: '回宫' }));
};

const finishOpeningGuide = async () => {
  await clickDialogueAdvance();
  await clickDialogueAdvance();
  await advanceDialoguePages();
  fireEvent.click((await screen.findByText('节衣缩食')).closest('button')!);
  await clickDialogueAdvance();
  await clickMapGuideReturnToChamber();
  await waitFor(() => expect(screen.getByRole('button', { name: '诵读经典' })).toBeInTheDocument());
  if (screen.queryByLabelText('寝殿对白')) {
    await clickDialogueAdvance();
  }
  await dismissPalaceBanquetRegistrationNoticeIfPresent();
};

const clickStartNewGame = async () => {
  fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
  fireEvent.click(await screen.findByRole('button', { name: '确认新开' }));
};

describe('App 主流程切换', () => {
  beforeEach(() => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('offline'));
    localStorage.clear();
    resetFlowStore();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('可从开始页进入路线选择页', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
    expect(await screen.findByRole('dialog', { name: '新游戏确认' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    expect(screen.queryByRole('dialog', { name: '新游戏确认' })).not.toBeInTheDocument();

    await clickStartNewGame();
    expect(await screen.findByText('通关要求')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument();
  });

  it('开始新游戏会二级确认、清空旧存档并创建新存档', async () => {
    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        time: {
          year: 7,
          month: 8,
          xun: 3,
          slotIndex: 5,
          slot: '夜晚',
          slotProgress: 0,
        },
        settlementReports: [
          {
            id: 'stale-report',
            kind: 'xun',
            year: 7,
            month: 8,
            xun: 3,
            title: '旧局通报',
            summary: '不应进入新局',
            lines: ['不应进入新局'],
          },
        ],
        palaceStrifeCases: [
          {
            id: 'stale-case',
            xunKey: '7-8-3',
            year: 7,
            month: 8,
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
      }));
    });
    const staleSave = useGameFlowStore.getState().exportSaveGameV1('2026-06-02T00:00:00.000Z');
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify({ state: { saveGame: staleSave }, version: 0 }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
    expect(await screen.findByRole('dialog', { name: '新游戏确认' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '确认新开' }));

    const flow = useGameFlowStore.getState();
    expect(flow.currentView).toBe('route-selection');
    expect(flow.time).toMatchObject({
      year: 1,
      month: 1,
      xun: 1,
      slot: '清晨',
    });
    expect(flow.settlementReports).toEqual([]);
    expect(flow.palaceStrifeCases).toEqual([]);

    await waitFor(() => {
      const persisted = JSON.parse(localStorage.getItem(SAVE_GAME_STORAGE_KEY) ?? '{}');
      expect(persisted.state.saveGame.world.time.year).toBe(1);
      expect(persisted.state.saveGame.world.settlementReports).toEqual([]);
      expect(persisted.state.saveGame.cases.palaceStrifeCases).toEqual([]);
    });
  });

  it('回溯会读取上一次存档并进入对应游戏阶段', async () => {
    const routeProfile = buildRouteProfiles()[0];
    act(() => {
      useGameFlowStore.getState().applyRouteSelection(routeProfile);
      useGameFlowStore.setState((state) => ({
        ...state,
        currentView: 'start',
        state: {
          ...state.state,
          name: '谢令仪',
          flags: {
            ...state.state.flags,
            attributeStatsFinalized: true,
            openingGuideFinished: true,
            mapGuideFinished: true,
          },
        },
        time: {
          year: 3,
          month: 4,
          xun: 2,
          slotIndex: 3,
          slot: '下午',
          slotProgress: 0,
        },
      }));
    });
    const saveGame = useGameFlowStore.getState().exportSaveGameV1('2026-06-02T01:00:00.000Z');
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify({ state: { saveGame }, version: 0 }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '回溯历史进度' }));

    expect(await screen.findByLabelText('寝殿左侧功能栏')).toBeInTheDocument();
    const flow = useGameFlowStore.getState();
    expect(flow.currentView).toBe('bedchamber');
    expect(flow.state.name).toBe('谢令仪');
    expect(flow.time).toMatchObject({
      year: 3,
      month: 4,
      xun: 2,
      slot: '下午',
    });
  });

  it('回溯已确认属性但未完成开场的存档会回到开场，不再回创建面板二次放大属性', async () => {
    const routeProfile = buildRouteProfiles()[0];
    act(() => {
      useGameFlowStore.getState().applyRouteSelection(routeProfile);
      useGameFlowStore.setState((state) => ({
        ...state,
        currentView: 'start',
        state: {
          ...state.state,
          stats: {
            ...state.state.stats,
            health: 300,
            fortune: 40,
            intrigue: 500,
            appearance: 600,
            temperament: 700,
            poetry: 10,
            talent: 20,
            painting: 30,
            embroidery: 40,
            medicine: 50,
            politics: 20,
          },
          flags: {
            ...state.state.flags,
            attributeStatsFinalized: true,
          },
        },
      }));
    });
    const saveGame = useGameFlowStore.getState().exportSaveGameV1('2026-06-02T01:30:00.000Z');
    localStorage.setItem(SAVE_GAME_STORAGE_KEY, JSON.stringify({ state: { saveGame }, version: 0 }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '回溯历史进度' }));

    expect(await screen.findByLabelText('开场对话框')).toBeInTheDocument();
    expect(useGameFlowStore.getState().currentView).toBe('opening-dialogue');
    expect(screen.queryByRole('button', { name: '确认进入剧情' })).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stats.health).toBe(300);
  });

  it('没有存档时回溯会留在开始页并显示提示', async () => {
    localStorage.clear();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '回溯历史进度' }));

    expect(await screen.findByRole('status')).toHaveTextContent('暂无可回溯的存档。');
    expect(screen.getByRole('button', { name: '开始新游戏' })).toBeInTheDocument();
  });

  it('开局三选项是用度策略，不再是一次性性格加成', () => {
    expect(GUIDE_TENDENCY_OPTIONS.map((option) => option.label)).toEqual(['节衣缩食', '量入为出', '锦衣玉食']);
    expect(GUIDE_TENDENCY_OPTIONS.map((option) => option.id)).toEqual(['frugal', 'balanced', 'luxury']);
    expect(GUIDE_TENDENCY_OPTIONS.every((option) => option.effects === undefined)).toBe(true);
  });

  it('年龄使用有边界的加减调整', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    await screen.findByRole('button', { name: '确认进入剧情' });

    const ageInput = screen.getByRole('textbox', { name: '年龄' }) as HTMLInputElement;
    const decreaseAge = screen.getByRole('button', { name: '年龄减一' });
    const increaseAge = screen.getByRole('button', { name: '年龄加一' });

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(decreaseAge);
    }
    expect(ageInput.value).toBe('15');
    expect(decreaseAge).toBeDisabled();

    for (let index = 0; index < 20; index += 1) {
      fireEvent.click(increaseAge);
    }
    expect(ageInput.value).toBe('23');
    expect(increaseAge).toBeDisabled();
  });

  it('属性加点按钮会在下限、上限和点数不足时禁用', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    await screen.findByRole('button', { name: '确认进入剧情' });

    const decreaseHealth = screen.getByRole('button', { name: '健康减少' });
    const increaseHealth = screen.getByRole('button', { name: '健康增加' });

    expect(decreaseHealth).toBeDisabled();
    expect(increaseHealth).not.toBeDisabled();

    act(() => {
      useGameFlowStore.setState((current) => ({
        state: {
          ...current.state,
          pointsLeft: 0,
          stats: {
            ...current.state.stats,
            health: 3,
          },
        },
      }));
    });

    await waitFor(() => {
      expect(increaseHealth).toBeDisabled();
      expect(decreaseHealth).not.toBeDisabled();
    });

    act(() => {
      useGameFlowStore.setState((current) => ({
        state: {
          ...current.state,
          pointsLeft: 10,
          stats: {
            ...current.state.stats,
            health: 2,
          },
        },
      }));
    });

    await waitFor(() => {
      expect(decreaseHealth).toBeDisabled();
      expect(increaseHealth).not.toBeDisabled();
    });

    for (let index = 0; index < 6; index += 1) {
      fireEvent.click(increaseHealth);
    }

    expect(increaseHealth).toBeDisabled();
    expect(decreaseHealth).not.toBeDisabled();

    fireEvent.click(decreaseHealth);

    expect(increaseHealth).not.toBeDisabled();
  });

  it('属性说明按钮会在当前属性位置弹出用途说明', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    await screen.findByRole('button', { name: '确认进入剧情' });

    fireEvent.click(screen.getByRole('button', { name: '查看心计说明' }));

    const helpDialog = await screen.findByRole('dialog');
    expect(helpDialog).toHaveTextContent('心计');
    expect(helpDialog).toHaveTextContent('试探');
    expect(helpDialog).toHaveTextContent('应对暗处风险');

    fireEvent.click(screen.getByRole('button', { name: '查看心计说明' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('福德加点按每点十点显示，进入剧情后折算为运行时福德值', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    const confirmStory = await screen.findByRole('button', { name: '确认进入剧情' });

    const initialFortunePoints = Number(useGameFlowStore.getState().state.stats.fortune);
    fireEvent.click(screen.getByRole('button', { name: '福德增加' }));
    const expectedFortunePoints = initialFortunePoints + 1;
    const expectedFortuneValue = expectedFortunePoints * 10;
    expect(useGameFlowStore.getState().state.stats.fortune).toBe(expectedFortunePoints);
    expect(screen.getByText(String(expectedFortuneValue))).toBeInTheDocument();

    fireEvent.click(confirmStory);

    await screen.findByLabelText('开场对话框');
    expect(useGameFlowStore.getState().state.stats.fortune).toBe(expectedFortuneValue);
  });

  it('确认进入剧情会将所有加点属性折算为运行时真值', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    const confirmStory = await screen.findByRole('button', { name: '确认进入剧情' });

    act(() => {
      useGameFlowStore.setState((current) => ({
        state: {
          ...current.state,
          pointsLeft: 0,
          stats: {
            ...current.state.stats,
            health: 3,
            fortune: 4,
            intrigue: 5,
            appearance: 6,
            temperament: 7,
            poetry: 1,
            talent: 2,
            painting: 3,
            embroidery: 4,
            medicine: 5,
            politics: 2,
          },
        },
      }));
    });

    fireEvent.click(confirmStory);

    await screen.findByLabelText('开场对话框');
    expect(useGameFlowStore.getState().state.stats).toMatchObject({
      health: 300,
      fortune: 40,
      intrigue: 500,
      appearance: 600,
      temperament: 700,
      poetry: 10,
      talent: 20,
      painting: 30,
      embroidery: 40,
      medicine: 50,
      politics: 20,
    });
  });

  it('属性创建面板若拿到已确认属性，只展示运行时真值且禁用加减', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    await screen.findByRole('button', { name: '确认进入剧情' });

    act(() => {
      useGameFlowStore.setState((current) => ({
        state: {
          ...current.state,
          stats: {
            ...current.state.stats,
            health: 300,
            fortune: 40,
            intrigue: 500,
            appearance: 600,
            temperament: 700,
            poetry: 10,
            talent: 20,
            painting: 30,
            embroidery: 40,
            medicine: 50,
            politics: 20,
          },
          flags: {
            ...current.state.flags,
            attributeStatsFinalized: true,
          },
        },
      }));
    });

    expect(screen.getByText(/已确认/)).toBeInTheDocument();
    expect(screen.getByText('300')).toBeInTheDocument();
    expect(screen.queryByText('30000')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '健康增加' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '健康减少' })).toBeDisabled();
  });

  it('角色初始化和属性调整阶段不会显示数值变化 toast', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    const confirmStory = await screen.findByRole('button', { name: '确认进入剧情' });

    expect(screen.queryByLabelText('数值变化提示')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '健康增加' }));
    await waitFor(() => {
      expect(screen.queryByLabelText('数值变化提示')).not.toBeInTheDocument();
    });

    fireEvent.click(confirmStory);
    await screen.findByLabelText('开场对话框');
    expect(screen.queryByLabelText('数值变化提示')).not.toBeInTheDocument();
  });

  it('属性页改名会同步路线状态和影落掖庭开场称呼', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '影落掖庭' }));
    await screen.findByDisplayValue('沉璧');
    fireEvent.click(screen.getByRole('button', { name: '确定' }));
    await screen.findByRole('button', { name: '确认进入剧情' });

    const nameInput = screen.getByDisplayValue('沉璧') as HTMLInputElement;
    fireEvent.change(nameInput, { target: { value: '林晚照' } });

    expect(useGameFlowStore.getState().state.name).toBe('林晚照');
    expect(useGameFlowStore.getState().selectedRoute?.defaultName).toBe('林晚照');
    expect(useGameFlowStore.getState().selectedRoute?.baseState.name).toBe('林晚照');

    fireEvent.click(screen.getByRole('button', { name: '确认进入剧情' }));

    expect(await screen.findByText(/掖庭掌事把名册合上/)).toBeInTheDocument();
    fireEvent.click(getDialoguePageTarget()!);
    expect(await screen.findByText(/林氏，字写得不错/)).toBeInTheDocument();
    expect(screen.queryByText(/沉氏，字写得不错/)).not.toBeInTheDocument();
  });

  it('对话正文逐字显示时点击文本框会立即补全', () => {
    const fullText = '她将手中茶盏轻轻搁下，抬眼望向你，像是终于肯把这一句话说完。';
    const onNextAction = vi.fn();

    const { container } = render(
      <GlobalDialogue
        characterIdentity="贵妃"
        characterName="姚铃儿"
        content={fullText}
        onNextAction={onNextAction}
        typewriter={true}
      />,
    );

    expect(screen.queryByText(fullText)).not.toBeInTheDocument();

    const contentLayer = container.querySelector('.palace-dialogue-box__content');
    expect(contentLayer).toBeInTheDocument();

    fireEvent.click(contentLayer as Element);

    expect(screen.getByText(fullText)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一句' })).not.toBeInTheDocument();
    expect(onNextAction).not.toHaveBeenCalled();

    fireEvent.click(contentLayer as Element);
    expect(onNextAction).toHaveBeenCalledTimes(1);
  });

  it('全局对话舞台会把长段剧情分页展示，翻完前不显示分支选项', () => {
    const onSelectOption = vi.fn();

    render(
      <GlobalDialogueStage
        sceneLabel="测试剧情舞台"
        portraitLabel="测试立绘"
        characterIdentity="场景旁白"
        characterName="冷宫"
        content={[
          '冷宫门前的铜锁早已生锈。',
          '这里没有人高声说话，连落叶被踩碎的声音都显得突兀。',
          '檐下有个老宫人正在扫灰。她看见你，并没有立刻行礼，只把扫帚往身后一收。',
          '“姑娘又来了。”',
        ].join('\n')}
        options={[{ id: 'take', label: '只收下残抄' }]}
        onSelectOption={onSelectOption}
        typewriter={false}
      />,
    );

    expect(document.querySelector('.global-dialogue-stage__interaction-lock')).toBeInTheDocument();
    expect(screen.getByText(/冷宫门前的铜锁早已生锈/)).toBeInTheDocument();
    expect(screen.queryByText(/姑娘又来了/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '只收下残抄' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '继续' })).not.toBeInTheDocument();

    fireEvent.click(getDialoguePageTarget()!);

    expect(screen.getByText(/姑娘又来了/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '只收下残抄' })).toBeInTheDocument();
    expect(screen.getByLabelText('对话正文')).toHaveAttribute('tabindex', '-1');
    expect(document.querySelector('.palace-dialogue-box__content')).toHaveAttribute('data-dialogue-interaction', 'disabled');

    fireEvent.click(document.querySelector('.palace-dialogue-box__content')!);
    expect(onSelectOption).not.toHaveBeenCalled();
  });

  it('全局对话舞台按当前对白说话人切换立绘，不把原角色立绘误用于拆出的其他角色对白', () => {
    render(
      <GlobalDialogueStage
        sceneLabel="测试剧情舞台"
        portraitLabel="娇娇立绘"
        portrait={<img src="/assets/characters/women/jiaojiao.png" alt="娇娇" />}
        characterIdentity="场景旁白"
        characterName="掖庭院"
        quotedSpeakerIdentity="内廷听用宫人"
        quotedSpeakerName="沉璧"
        resolvePortrait={(segment) => {
          if (segment.characterName !== '沉璧') {
            return undefined;
          }

          return {
            label: '沉璧立绘',
            placement: 'dialogue-left',
            portrait: <img src="/assets/characters/women/chenbi.png" alt="沉璧" />,
          };
        }}
        content="隔着屏风问话时，你只答礼制、曲名和用典：“妾听闻此曲本为旧制，若用在今日，当避其锋芒。”"
        typewriter={false}
      />,
    );

    expect(screen.getByText(/隔着屏风问话时/)).toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(screen.queryByAltText('沉璧')).not.toBeInTheDocument();

    fireEvent.click(getDialoguePageTarget()!);

    expect(screen.getByText(/妾听闻此曲本为旧制/)).toBeInTheDocument();
    expect(screen.getByAltText('沉璧')).toBeInTheDocument();
    expect(screen.getByLabelText('沉璧立绘')).toHaveClass('global-dialogue-stage__portrait-stage--dialogue-left');
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
  });

  it('全局对话舞台未配置拆出说话人的立绘时只显示该说话人的占位，不复用原角色立绘', () => {
    render(
      <GlobalDialogueStage
        sceneLabel="测试剧情舞台"
        portraitLabel="娇娇立绘"
        portrait={<img src="/assets/characters/women/jiaojiao.png" alt="娇娇" />}
        characterIdentity="掖庭引路宫女"
        characterName="娇娇"
        quotedSpeakerIdentity="内廷听用宫人"
        quotedSpeakerName="沉璧"
        content="娇娇替你压低伞沿，你隔着雨声道：“此事暂且不提，先看掌事如何回话。”"
        typewriter={false}
      />,
    );

    expect(screen.getByText(/娇娇替你压低伞沿/)).toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();

    fireEvent.click(getDialoguePageTarget()!);

    expect(screen.getByText(/此事暂且不提/)).toBeInTheDocument();
    expect(screen.getByText('沉璧')).toHaveClass('global-dialogue-stage__portrait-placeholder');
    expect(screen.getByLabelText('沉璧剪影')).toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
  });

  it('全局对话舞台的线性剧情翻完后点击正文推进，不显示下一句按钮', () => {
    const onNextAction = vi.fn();

    render(
      <GlobalDialogueStage
        sceneLabel="测试线性剧情"
        portraitLabel="测试立绘"
        characterIdentity="场景旁白"
        characterName="寝殿"
        content="右上角记着时辰、银两与体力，往后每做一件事，都得先看分寸与余力。"
        onNextAction={onNextAction}
        typewriter={false}
      />,
    );

    expect(screen.queryByRole('button', { name: '下一句' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('对话正文').closest('.palace-dialogue-box__content')!);

    expect(onNextAction).toHaveBeenCalledTimes(1);
  });

  it('可从路线选择页进入属性页，再进入开场引导', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));

    expect(await screen.findByText(/剩余点数/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '确认进入剧情' }));

    expect(await screen.findByText('中宫掌事宫女 · 娇娇')).toBeInTheDocument();
    await advanceDialoguePages();
    expect(screen.queryByRole('button', { name: '下一句' })).not.toBeInTheDocument();
    expect(getDialogueContent()).toBeInTheDocument();
  });

  it('不同开局角色会拿到不同的开场人设回应', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'opening-dialogue',
      scene: 'briefing',
      routeId: 'chenyuansucuo',
      state: {
        ...state.state,
        routeId: 'chenyuansucuo',
        name: '乌兰托娅',
        family: '和亲公主',
        residenceName: '玉清宫',
        favor: 50,
        stress: 40,
      },
      hiddenStats: {
        silver: 1000,
        prestige: 1200,
        stress: 40,
        favor: 50,
        trueHeart: 10,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '和亲入宫',
      },
      selectedRoute: {
        id: 'chenyuansucuo',
        label: '尘缘夙错',
        labelArt: '/assets/routes/labels/chenyuansucuo-vertical.png',
        intro: '',
        defaultName: '乌兰托娅',
        familyDisplay: '和亲公主',
        residenceDisplay: '玉清宫',
        biography: '',
        clearanceRequirement: '',
        difficulty: '中等',
        portrait: '/assets/routes/portraits/chenyuansucuo.png',
        fontMask: '/assets/routes/fonts/chenyuansucuo-mask.png',
        bannerHeight: 84,
        bannerOffsetTop: 11,
        familyOptions: ['和亲公主'],
        statsLocked: true,
        baseState: {
          name: '乌兰托娅',
          family: '和亲公主',
          residenceName: '玉清宫',
        },
        hiddenStats: {
          silver: 1000,
          prestige: 1200,
          stress: 40,
          favor: 50,
          trueHeart: 10,
          favorLabel: defaultFavorTier.label,
          favorColor: defaultFavorTier.color,
          initialRank: '和亲入宫',
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByText('陪嫁侍女 · 娇娇')).toBeInTheDocument();
    expect(screen.getByText(/和亲|故国|异邦/)).toBeInTheDocument();
  });

  it('影落掖庭开场会先交代掖庭旧案背景，再由娇娇引导起手选择', async () => {
    const defaultFavorTier = getFavorTierByValue(10);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'opening-dialogue',
      scene: 'briefing',
      routeId: 'yingluoyeting',
      state: {
        ...state.state,
        routeId: 'yingluoyeting',
        name: '沈璧',
        family: '罪臣女眷',
        residenceName: '储秀宫西偏殿',
        favor: 10,
        stress: 60,
        prestige: 50,
        silver: 50,
        trueHeart: 0,
        openingTendency: undefined,
      },
      hiddenStats: {
        silver: 50,
        prestige: 50,
        stress: 60,
        favor: 10,
        trueHeart: 0,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '低位小主',
      },
      selectedRoute: undefined,
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    const { container } = render(<App />);

    expect((container.querySelector('.opening-dialogue__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/yeting_daytime.png',
    );
    expect(screen.getByText(/掖庭掌事/)).toBeInTheDocument();
    expect(screen.queryByText(/真正改命/)).not.toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();

    for (let index = 0; index < 6 && !screen.queryByText(/字写得不错/); index += 1) {
      await clickDialogueOnce();
    }

    expect(await screen.findByText(/字写得不错/)).toBeInTheDocument();
    expect(screen.getByAltText('掌事宫人')).toHaveAttribute('src', '/assets/characters/women/gongren_middleage.png');
    expect(screen.getByLabelText('掌事宫人立绘')).toBeInTheDocument();

    await clickDialogueAdvance();

    expect((container.querySelector('.opening-dialogue__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/yushufang_inside_daytime.png',
    );
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(await screen.findByText(/那份祝词随待呈文书送到御前/)).toBeInTheDocument();

    for (let index = 0; index < 8 && !screen.queryByText(/旧词不合宫宴礼数/); index += 1) {
      await clickDialogueOnce();
    }

    expect(await screen.findByText(/旧词不合宫宴礼数/)).toBeInTheDocument();
    expect(screen.getByAltText('沈璧')).toBeInTheDocument();
    expect(screen.getByLabelText('沈璧立绘')).toHaveClass('global-dialogue-stage__portrait-stage--dialogue-left');
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();

    await advanceDialoguePages();
    expect(screen.getByText(/放进后妃册最末/)).toBeInTheDocument();
    expect(screen.queryByText(/往后人前说话/)).not.toBeInTheDocument();

    await clickDialogueAdvance();

    expect((container.querySelector('.opening-dialogue__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/yeting_daytime.png',
    );
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(await screen.findByText(/娇娇也是那日被拨到你身边/)).toBeInTheDocument();
    expect(screen.queryByText(/往后人前说话/)).not.toBeInTheDocument();

    await clickDialogueOnce();

    expect(await screen.findByAltText('娇娇')).toBeInTheDocument();
    expect(screen.getByText('掖庭引路宫女 · 娇娇')).toBeInTheDocument();
    expect(await screen.findByText(/往后人前说话/)).toBeInTheDocument();
    expect(screen.queryByText(/娇娇也是那日被拨到你身边/)).not.toBeInTheDocument();

    await clickDialogueAdvance();

    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(await screen.findByText(/回忆像灯花一样轻轻爆开/)).toBeInTheDocument();
    await advanceDialoguePages();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();

    await clickDialogueAdvance();

    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(await screen.findByText(/娇娇扶着木匣/)).toBeInTheDocument();
    expect(screen.queryByText(/进储秀宫西偏殿前/)).not.toBeInTheDocument();

    await clickDialogueOnce();

    expect(await screen.findByAltText('娇娇')).toBeInTheDocument();
    expect(await screen.findByText(/进储秀宫西偏殿前/)).toBeInTheDocument();
    expect(screen.queryByText(/娇娇扶着木匣/)).not.toBeInTheDocument();
    expect(screen.getByText('节衣缩食')).toBeInTheDocument();
    expect(screen.getByText('量入为出')).toBeInTheDocument();
    expect(screen.getByText('锦衣玉食')).toBeInTheDocument();
    expect(screen.getByText('先问清用度')).toBeInTheDocument();
  });

  it('影落掖庭开场定下用度后会先听地图引导，再经过后宫触发陈婉宁初见', async () => {
    const defaultFavorTier = getFavorTierByValue(10);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'opening-dialogue',
      scene: 'briefing',
      routeId: 'yingluoyeting',
      state: {
        ...state.state,
        routeId: 'yingluoyeting',
        name: '沈璧',
        family: '罪臣女眷',
        residenceName: '储秀宫西偏殿',
        favor: 10,
        stress: 60,
        prestige: 50,
        silver: 50,
        trueHeart: 0,
        openingTendency: undefined,
        flags: {},
      },
      hiddenStats: {
        silver: 50,
        prestige: 50,
        stress: 60,
        favor: 10,
        trueHeart: 0,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '低位小主',
      },
      selectedRoute: undefined,
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    for (let index = 0; index < 4; index += 1) {
      await advanceDialoguePages();
      await clickDialogueAdvance();
    }
    await advanceDialoguePages();
    fireEvent.click(await screen.findByRole('button', { name: '量入为出' }));

    const mapGuide = await screen.findByLabelText('地图引导对话框');
    expect(mapGuide).toHaveTextContent(/宫中大事多半都要从地图上走/);
    expect(useGameFlowStore.getState().state.flags.mapGuideFinished).not.toBe(true);
    expect(screen.queryByText(/你第一次踏进后宫宫道时/)).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().state.flags[YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]).toBe(true);

    await clickDialogueAdvance();
    expect(screen.getByLabelText('地图引导对话框')).toHaveTextContent(/左侧四个圆形是常驻入口/);
    await clickDialogueAdvance();

    expect(await screen.findByText(/你第一次踏进后宫宫道时/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.flags.mapGuideFinished).toBe(true);

    await advanceDialoguePages();
    fireEvent.click(screen.getByRole('button', { name: '谢她照拂，只字不提旧案' }));
    expect(await screen.findByText(/陈婉宁笑意未改/)).toBeInTheDocument();
    await advanceDialoguePages();
    fireEvent.click(document.querySelector<HTMLElement>('[data-dialogue-page-state="last"]')!);

    await waitFor(() => {
      const flow = useGameFlowStore.getState();
      expect(flow.currentView).toBe('bedchamber');
      expect(flow.state.residenceName).toBe('储秀宫西偏殿');
      expect(flow.state.flags[YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]).toBe(false);
      expect(flow.state.flags[YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed]).toBe(true);
    });
    expect(await screen.findByLabelText('玩家信息')).toHaveTextContent('储秀宫西偏殿');
  });

  it('开场用度解释选项由说话人说明三档含义后返回选择', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await clickDialogueAdvance();
    await clickDialogueAdvance();
    await advanceDialoguePages();
    fireEvent.click((await screen.findByText('先问清用度')).closest('button')!);

    expect(await screen.findByText(/这三档说的是每月固定用度/)).toBeInTheDocument();
    expect(screen.getByText(/· 娇娇/)).toBeInTheDocument();

    fireEvent.click(getDialoguePageTarget()!);
    expect(await screen.findByText(/节衣缩食：每月用月俸四分之一/)).toBeInTheDocument();

    fireEvent.click(getDialoguePageTarget()!);
    expect(await screen.findByText(/量入为出：每月用月俸一半/)).toBeInTheDocument();

    fireEvent.click(getDialoguePageTarget()!);
    expect(await screen.findByText(/锦衣玉食：每月用月俸四分之三/)).toBeInTheDocument();

    await clickDialogueOnce();

    expect(await screen.findByText('节衣缩食')).toBeInTheDocument();
    expect(screen.getByText('量入为出')).toBeInTheDocument();
    expect(screen.getByText('锦衣玉食')).toBeInTheDocument();
    expect(screen.getByText('先问清用度')).toBeInTheDocument();
  });

  it('可从开场引导进入地图，再进入寝殿', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await clickDialogueAdvance();
    await clickDialogueAdvance();
    await advanceDialoguePages();
    const tendencyButton = (await screen.findByText('节衣缩食')).closest('button');
    expect(tendencyButton).not.toBeNull();
    fireEvent.click(tendencyButton!);

    await clickDialogueAdvance();
    await clickMapGuideReturnToChamber();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '诵读经典' })).toBeInTheDocument();
      expect(screen.queryByText(/更换装扮/)).not.toBeInTheDocument();
    });
  });

  it.each([
    ['清晨', '/assets/routes/home/home_yeting_dawn%20till%20dask.png'],
    ['上午', '/assets/routes/home/home_yeting_dawn%20till%20dask.png'],
    ['中午', '/assets/routes/home/home_yeting_dawn%20till%20dask.png'],
    ['下午', '/assets/routes/home/home_yeting_dawn%20till%20dask.png'],
    ['傍晚', '/assets/routes/home/home_yeting_dawn%20till%20dask.png'],
    ['夜晚', '/assets/routes/home/home_yeting_night%20till%20latenight.png'],
    ['深夜', '/assets/routes/home/home_yeting_night%20till%20latenight.png'],
  ] as const)('回宫后的寝殿在%s使用对应 routes/home 背景', (slot, expectedBackground) => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      time: {
        ...state.time,
        slot,
      },
      state: {
        ...state.state,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          attributeStatsFinalized: true,
        },
      },
    }));

    const { container } = render(<App />);

    const chamberBackground = container.querySelector('.chamber-main__background') as HTMLElement;
    expect(chamberBackground.style.backgroundImage).toContain(expectedBackground);
  });

  it('寝殿主界面按点位渲染行动按钮并提供吩咐娇娇入口', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          attributeStatsFinalized: true,
        },
      },
    }));

    const { container } = render(<App />);

    expect(container.querySelector('.chamber-main__inner-panel')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '吩咐娇娇' })).toHaveClass('chamber-main__jiaojiao-entry');
    expect(document.querySelector('.chamber-main__jiaojiao-entry img')).toHaveAttribute('src', '/assets/characters/women/jiaojiao.png');
    expect(screen.getByRole('button', { name: '诵读经典' })).toHaveClass('chamber-main__scene-button--vertical');
    expect(screen.getByRole('button', { name: '结束本旬' })).toHaveClass('chamber-main__scene-button--horizontal');
  });

  it('吩咐娇娇页复用寝殿工具入口，并可退回寝殿主界面', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));

    expect(screen.getByLabelText('吩咐娇娇选项')).toBeInTheDocument();
    expect(screen.getByLabelText('娇娇吩咐提示')).toHaveTextContent('有何吩咐');
    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '宫斗事务' })).toHaveClass('chamber-main__scene-button--horizontal');
    expect(screen.getByRole('button', { name: '无事，且先退下吧' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看属性' }));
    expect(useGameFlowStore.getState().activeChamberPanel).toBe('stats');
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(useGameFlowStore.getState().activeChamberPanel).toBe('jiaojiao');
    expect(screen.getByLabelText('吩咐娇娇选项')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '道具管理' }));
    expect(useGameFlowStore.getState().activeChamberPanel).toBe('inventory');

    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(useGameFlowStore.getState().activeChamberPanel).toBe('jiaojiao');
    expect(screen.getByLabelText('吩咐娇娇选项')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '无事，且先退下吧' }));
    expect(useGameFlowStore.getState().activeChamberPanel).toBe('main');
  });

  it('寝殿时间背景变化时保留上一张背景做淡出过渡', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 4,
        slot: '傍晚',
        slotProgress: 0,
      },
    }));

    const { container } = render(<App />);

    const currentBackground = container.querySelector('.chamber-main__background') as HTMLElement;
    expect(currentBackground.style.backgroundImage).toContain('/assets/routes/home/home_yeting_dawn%20till%20dask.png');

    act(() => {
      useGameFlowStore.setState((state) => ({
        ...state,
        time: {
          ...state.time,
          slotIndex: 5,
          slot: '夜晚',
        },
      }));
    });

    await waitFor(() => {
      expect((container.querySelector('.chamber-main__background') as HTMLElement).style.backgroundImage).toContain(
        '/assets/routes/home/home_yeting_night%20till%20latenight.png',
      );
      expect((container.querySelector('.chamber-main__background--previous') as HTMLElement).style.backgroundImage).toContain(
        '/assets/routes/home/home_yeting_dawn%20till%20dask.png',
      );
    });
  });

  it('寝殿时间背景在对白收起后才开始淡出过渡', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 4,
        slot: '傍晚',
        slotProgress: 0,
      },
    }));

    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '诵读经典' }));

    expect(await screen.findByLabelText('寝殿对白')).toBeInTheDocument();
    expect(useGameFlowStore.getState().time.slot).toBe('夜晚');
    expect((container.querySelector('.chamber-main__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/home/home_yeting_dawn%20till%20dask.png',
    );
    expect(container.querySelector('.chamber-main__background--previous')).not.toBeInTheDocument();

    await clickDialogueAdvance();

    expect((await screen.findAllByLabelText('夜晚侍寝通报')).length).toBeGreaterThan(0);
    expect((container.querySelector('.chamber-main__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/home/home_yeting_dawn%20till%20dask.png',
    );

    await clickDialogueAdvance();

    await waitFor(() => {
      expect((container.querySelector('.chamber-main__background') as HTMLElement).style.backgroundImage).toContain(
        '/assets/routes/home/home_yeting_night%20till%20latenight.png',
      );
      expect((container.querySelector('.chamber-main__background--previous') as HTMLElement).style.backgroundImage).toContain(
        '/assets/routes/home/home_yeting_dawn%20till%20dask.png',
      );
    });
  });

  it('点击外出会先停留在寝殿展示出行提示，收起后再进入地图', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(chamberDialogue).getByText(/宫中各处都在眼前/)).toBeInTheDocument();
    expect(screen.getByText('贴身宫女 · 娇娇')).toBeInTheDocument();

    await clickDialogueAdvance();

    await waitFor(() => {
      expect(useGameFlowStore.getState().currentView).toBe('map-main');
    });
  });

  it('外部地点侧栏可返回地图，也可直接回宫', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '妙音堂',
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    const sidebar = screen.getByRole('navigation', { name: '寝殿左侧功能栏' });
    expect(within(sidebar).getByRole('button', { name: '外出' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: '回宫' })).toBeInTheDocument();

    fireEvent.click(within(sidebar).getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBe('妙音堂');
    await waitFor(() => expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined());

    act(() => {
      useGameFlowStore.getState().enterMainChamber('妙音堂');
    });

    fireEvent.click(within(await screen.findByRole('navigation', { name: '寝殿左侧功能栏' })).getByRole('button', { name: '回宫' }));

    expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
  });

  it('进出普通地点只切换场景，不推进时辰', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '御膳房' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().activeMapLocation).toBe('御膳房');
      expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    });
    expect(useGameFlowStore.getState().time.slot).toBe('清晨');
    expect(screen.getByText('1年1月1旬（清晨）')).toBeInTheDocument();

    const sidebar = await screen.findByRole('navigation', { name: '寝殿左侧功能栏' });
    fireEvent.click(within(sidebar).getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    await waitFor(() => expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined());
    expect(useGameFlowStore.getState().time.slot).toBe('清晨');
  });

  it('空置地图地点进入后会显示统一地点行动和特殊入口', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        residenceName: '椒房殿',
        stats: {
          ...state.state.stats,
          politics: 10,
        },
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '养心殿' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));
    expect(await screen.findByLabelText('养心殿行动')).toBeInTheDocument();
    expect(screen.queryByText(/行至养心殿前/)).not.toBeInTheDocument();
    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();

    const locationPanel = await screen.findByLabelText('养心殿行动');
    expect(within(locationPanel).getByRole('button', { name: '抄读' })).toBeInTheDocument();
    expect(within(locationPanel).getByRole('button', { name: '朝堂事务' })).toBeInTheDocument();

    fireEvent.click(within(locationPanel).getByRole('button', { name: '抄读' }));

    expect(await screen.findByLabelText('养心殿行动结果')).toBeInTheDocument();
    expect(locationPanel).not.toContainElement(screen.getByLabelText('养心殿行动结果舞台'));
    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();
    expect(screen.queryByText(/行至养心殿前/)).not.toBeInTheDocument();
    expect(await screen.findByText(/养心殿外书气沉沉/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stats.politics).toBe(11);
    expect(useGameFlowStore.getState().time.slot).toBe('上午');
  });

  it('后宫侧栏外出返回地图，回宫才返回寝殿', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '后宫' }));
    expect(screen.queryByRole('button', { name: '后宫总览' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));

    expect(await screen.findByLabelText('后宫宫殿总览')).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeMapLocation).toBe('后宫');
    const sidebar = screen.getByRole('navigation', { name: '寝殿左侧功能栏' });
    expect(within(sidebar).getByRole('button', { name: '回宫' })).toBeInTheDocument();

    fireEvent.click(within(sidebar).getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBe('后宫');
    await waitFor(() => expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined());
    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();
  });

  it('普通进入养心殿时使用地点背景并直接展示地点行动', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '养心殿',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      pendingYangxinVerdict: undefined,
    }));

    const { container } = render(<App />);

    expect(await screen.findByLabelText('养心殿行动')).toBeInTheDocument();
    expect(screen.queryByText(/行至养心殿前/)).not.toBeInTheDocument();
    expect(container.querySelector('.chamber-main__background--current')?.getAttribute('style')).toContain(
      '/assets/routes/backgrounds/yangxindian_outside_daytime.png',
    );
  });

  it('后宫内左侧工具面板关闭后会回到后宫，而不是空白外景', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: '后宫',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
    }));

    render(<App />);

    expect(await screen.findByLabelText('后宫宫殿总览')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('navigation', { name: '寝殿左侧功能栏' })).getByRole('button', { name: '查看' }));
    expect(await screen.findByLabelText('个人属性面板')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(await screen.findByLabelText('后宫宫殿总览')).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeChamberPanel).toBe('harem');

    fireEvent.click(within(screen.getByRole('navigation', { name: '寝殿左侧功能栏' })).getByRole('button', { name: '查看' }));
    expect(await screen.findByLabelText('个人属性面板')).toBeInTheDocument();
    fireEvent.click(within(screen.getByRole('navigation', { name: '寝殿左侧功能栏' })).getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBe('后宫');
    await waitFor(() => expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined());
    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();
  });

  it('大地图左侧工具面板不会把玩家传回寝殿', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(within(screen.getByRole('navigation', { name: '大地图常驻入口' })).getByRole('button', { name: '查看' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
    expect(await screen.findByLabelText('个人属性面板')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回地图' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(await screen.findByLabelText('宫廷地图')).toBeInTheDocument();
  });

  it('外景左侧面板内点击外出仍返回地图而不是寝殿', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御膳房',
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    const sidebar = screen.getByRole('navigation', { name: '寝殿左侧功能栏' });
    fireEvent.click(within(sidebar).getByRole('button', { name: '查看' }));

    expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    expect(useGameFlowStore.getState().activeMapLocation).toBe('御膳房');
    expect(await screen.findByLabelText('个人属性面板')).toBeInTheDocument();

    fireEvent.click(within(screen.getByRole('navigation', { name: '寝殿左侧功能栏' })).getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBe('御膳房');
    await waitFor(() => expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined());
  });

  it('局内个人属性面板可查看属性说明', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'stats',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
    }));

    render(<App />);

    expect(await screen.findByLabelText('个人属性面板')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看健康说明' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('承受风险');

    fireEvent.click(screen.getByRole('button', { name: '查看健康说明' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '查看声望说明' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('位分');

    fireEvent.click(screen.getByRole('button', { name: '查看家世说明' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('初始资源');

    fireEvent.click(screen.getByRole('button', { name: '查看乐理说明' }));
    expect(await screen.findByRole('dialog')).toHaveTextContent('学谱');
  });

  it('打开寝殿面板时点击外出会先关闭面板并展示出行提示', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'stats',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    expect(useGameFlowStore.getState().activeChamberPanel).toBe('main');
    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(chamberDialogue).getByText(/宫中各处都在眼前/)).toBeInTheDocument();

    await clickDialogueAdvance();

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
  });

  it('寝殿剧情对白未收起时会屏蔽其他寝殿按钮点击', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '诵读经典' }));

    const actionDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(actionDialogue).getByText(/诵读经典告一段落/)).toBeInTheDocument();
    const flowAfterFirstAction = useGameFlowStore.getState();

    fireEvent.click(screen.getByRole('button', { name: '诵读经典' }));
    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));

    const flowAfterBlockedClicks = useGameFlowStore.getState();
    expect(flowAfterBlockedClicks.time.slotIndex).toBe(flowAfterFirstAction.time.slotIndex);
    expect(flowAfterBlockedClicks.state.stamina).toBe(flowAfterFirstAction.state.stamina);
    expect(flowAfterBlockedClicks.activeChamberPanel).toBe('main');
    expect(within(actionDialogue).getByText(/诵读经典告一段落/)).toBeInTheDocument();
  });

  it('地图剧情对白未收起时会屏蔽地图侧栏和热点点击', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      mapEventText: '宫道上有人低声传来一句话，示意你先听完再动身。',
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    const mapDialogue = await screen.findByLabelText('地图引导对话框');
    expect(within(mapDialogue).getByText(/先听完再动身/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '回宫' }));
    fireEvent.click(screen.getByRole('button', { name: '御花园' }));

    const flowAfterBlockedClicks = useGameFlowStore.getState();
    expect(flowAfterBlockedClicks.currentView).toBe('map-main');
    expect(flowAfterBlockedClicks.activeMapLocation).toBeUndefined();
    expect(screen.queryByLabelText('御花园 地点弹窗')).not.toBeInTheDocument();
    expect(within(mapDialogue).getByText(/先听完再动身/)).toBeInTheDocument();
  });

  it('地图上也会显示绑定时间的娇娇通报，并屏蔽地图点击', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      mapEventText: '',
      settlementReports: [
        {
          id: 'settlement-map-1',
          kind: 'xun',
          year: 1,
          month: 1,
          xun: 2,
          title: '1年1月第2旬清晨通报',
          summary: '已入1月第2旬清晨，体力按新旬口径恢复为10。',
          lines: ['已入1月第2旬清晨，体力按新旬口径恢复为10。'],
        },
      ],
      latestSettlementReportId: 'settlement-map-1',
      lastSeenSettlementReportId: undefined,
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    const mapReport = await screen.findByLabelText('娇娇时间通报');
    expect(within(mapReport).getByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '回宫' }));
    fireEvent.click(screen.getByRole('button', { name: '御花园' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(screen.queryByLabelText('御花园 地点弹窗')).not.toBeInTheDocument();

    await clickDialogueAdvance();
    expect(useGameFlowStore.getState().lastSeenSettlementReportId).toBe('settlement-map-1');
  });

  it('普通地点内行动推进到深夜时仍允许进入最后一个行动时段', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      mapEventText: '',
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 5,
        slot: '夜晚',
        slotProgress: 0,
      },
      state: {
        ...state.state,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '妙音堂' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));

    await waitFor(() => {
      const flow = useGameFlowStore.getState();
      expect(flow.currentView).toBe('bedchamber');
      expect(flow.activeChamberPanel).toBe('main');
      expect(flow.activeMapLocation).toBe('妙音堂');
      expect(flow.state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
      expect(flow.time).toMatchObject({
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 5,
        slot: '夜晚',
      });
    });

    fireEvent.click(await screen.findByRole('button', { name: '听曲' }));

    await waitFor(() => {
      const flow = useGameFlowStore.getState();
      expect(flow.time).toMatchObject({
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 6,
        slot: '深夜',
      });
    });
  });

  it('深夜普通外出行动后会由娇娇提醒回宫，再黑屏进入清晨通报', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      mapEventText: '',
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      state: {
        ...state.state,
        stamina: 2,
        favor: 1,
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        favor: 1,
      },
      nightlyService: {
        ...state.nightlyService,
        queuedRolls: {
          alone: 100,
          player: 100,
          pool: 1,
          interest: 60,
          pregnancy: 100,
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '妙音堂' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().activeMapLocation).toBe('妙音堂');
      expect(useGameFlowStore.getState().time.slot).toBe('深夜');
    });

    fireEvent.click(await screen.findByRole('button', { name: '听曲' }));

    expect(await screen.findByLabelText('妙音堂行动结果')).toBeInTheDocument();
    await clickDialogueAdvance();

    const reminder = await screen.findByLabelText('寝殿对白');
    expect(within(reminder).getByText(/夜已经深了/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().time.slot).toBe('深夜');

    await clickDialogueAdvance();
    expect(await screen.findByLabelText('一夜过去')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('1年1月2旬（清晨）')).toBeInTheDocument();
    });

    if (screen.queryAllByLabelText('夜晚侍寝通报').length > 0) {
      await clickDialogueAdvance();
    }

    expect(await screen.findByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
  }, 10000);

  it('体力归零后会先展示行动结果，再由娇娇提醒睡觉', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      time: {
        year: 1,
        month: 2,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
      state: {
        ...state.state,
        stamina: 2,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '诵读经典' }));

    const actionDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(actionDialogue).getByText(/诵读经典告一段落/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stamina).toBe(0);
    expect(useGameFlowStore.getState().time.slot).toBe('中午');

    await clickDialogueAdvance();

    const reminder = await screen.findByLabelText('寝殿对白');
    expect(within(reminder).getByText(/今日体力已经尽了/)).toBeInTheDocument();

    await clickDialogueAdvance();
    expect(await screen.findByLabelText('一夜过去')).toBeInTheDocument();
  });

  it('跨旬行动会先展示本次行动结果，再展示下一旬通报', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      nightlyService: {
        ...state.nightlyService,
        pendingEvent: undefined,
        pendingNotice: undefined,
        pendingMorningLines: ['夜里无事，宫门照例落钥。'],
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '请平安脉' }));

    const actionDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(actionDialogue).getByText(/请平安脉告一段落/)).toBeInTheDocument();
    expect(screen.queryByText(/1年1月第2旬清晨通报/)).not.toBeInTheDocument();

    await clickDialogueAdvance();

    expect(await screen.findByLabelText('寝殿对白')).toHaveTextContent(/已经深夜了/);

    await clickDialogueAdvance();

    const morningNightNotices = await screen.findAllByLabelText('夜晚侍寝通报', {}, { timeout: 1000 }).catch(() => []);
    if (morningNightNotices.length > 0) {
      await clickDialogueAdvance();
    }

    expect(await screen.findByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
  });

  it('玩家数值变化会显示可叠加的具体变化 toast，但不显示体力和宠爱', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          attributeStatsFinalized: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '泼墨作画' }));
    await advanceFirstPaintingWork();

    const toastLayer = await screen.findByLabelText('数值变化提示');
    expect(within(toastLayer).queryByText('体力 -3')).not.toBeInTheDocument();
    expect(within(toastLayer).getAllByText('丹青 +1').length).toBeGreaterThan(0);
    expect(within(toastLayer).getAllByRole('status').map((toast) => toast.textContent?.trim())).toEqual(
      expect.arrayContaining(['丹青 +1']),
    );

    const targetConsort = useGameFlowStore.getState().concubines[0];
    act(() => {
      useGameFlowStore.setState((flow) => ({
        ...flow,
        state: {
          ...flow.state,
          favor: Number(flow.state.favor ?? 0) + 4,
          prestige: Number(flow.state.prestige ?? 0) + 5,
        },
        hiddenStats: {
          ...flow.hiddenStats,
          favor: Number(flow.hiddenStats.favor ?? 0) + 4,
          prestige: Number(flow.hiddenStats.prestige ?? 0) + 5,
        },
        concubines: flow.concubines.map((consort) =>
          consort.id === targetConsort.id
            ? {
                ...consort,
                stats: {
                  ...consort.stats,
                  favor: Number(consort.stats.favor ?? 0) + 4,
                  prestige: Number(consort.stats.prestige ?? 0) + 4,
                },
              }
            : consort,
        ),
      }));
    });

    expect(within(toastLayer).queryByText('宠爱 +4')).not.toBeInTheDocument();
    expect(within(toastLayer).queryByText('声望 +5')).not.toBeInTheDocument();
    expect(within(toastLayer).queryByText(`${targetConsort.rankLabel}${targetConsort.name}宠爱 +4`)).not.toBeInTheDocument();
    expect(within(toastLayer).queryByText(`${targetConsort.rankLabel}${targetConsort.name}声望 +4`)).not.toBeInTheDocument();

    act(() => {
      useGameFlowStore.getState().markNumericFeedbackEvent('chamber-action');
    });

    expect(await within(toastLayer).findByText('声望 +5')).toBeInTheDocument();
    expect(await within(toastLayer).findByText(`${targetConsort.rankLabel}${targetConsort.name}声望 +4`)).toBeInTheDocument();
    expect(within(toastLayer).queryByText('宠爱 +4')).not.toBeInTheDocument();
    expect(within(toastLayer).queryByText(`${targetConsort.rankLabel}${targetConsort.name}宠爱 +4`)).not.toBeInTheDocument();

    act(() => {
      useGameFlowStore.setState((flow) => ({
        ...flow,
        concubines: flow.concubines.map((consort) =>
          consort.id === targetConsort.id
            ? {
                ...consort,
                stats: {
                  ...consort.stats,
                  stress: Number(consort.stats.stress ?? 0) + 3,
                },
              }
            : consort,
        ),
      }));
      useGameFlowStore.getState().markNumericFeedbackEvent('settlement');
    });

    expect(within(toastLayer).queryByText(`${targetConsort.rankLabel}${targetConsort.name}压力 +3`)).not.toBeInTheDocument();

    act(() => {
      useGameFlowStore.getState().grantInventoryItem({
        itemId: 'test-jade-hairpin',
        name: '青玉簪',
        category: 'gift',
        rarity: 'green',
        quantity: 1,
        price: 20,
        favorDelta: 1,
        healthDelta: 0,
        appearanceDelta: 0,
        temperamentDelta: 0,
        description: '测试用赠礼。',
      });
    });
    expect(await within(toastLayer).findByText('青玉簪 +1')).toBeInTheDocument();

    act(() => {
      useGameFlowStore.getState().consumeInventoryItem('test-jade-hairpin');
    });
    expect(await within(toastLayer).findByText('青玉簪 -1')).toBeInTheDocument();
  });

  it('太医院遇到简宁时会进入对话场景', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '太医院',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      medicalProgress: {
        strollCount: 4,
        consultationCount: 0,
        jianNingMet: false,
        jianNingFavor: 0,
        jianNingAffinity: 0,
      },
      time: {
        year: 1,
        month: 2,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '闲逛' }));

    expect(await screen.findByLabelText('太医院对话框')).toBeInTheDocument();
    expect(await screen.findByText(/简宁正替一名宫人按脉/)).toBeInTheDocument();
  });

  it('太医院深夜行动先显示结果，收起后再触发回宫睡觉', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '太医院',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        stats: {
          ...state.state.stats,
          medicine: 5,
        },
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '会诊' }));

    const actionResult = await screen.findByLabelText('太医院行动结果');
    expect(actionResult).toHaveTextContent(/会诊|药理/);
    expect(useGameFlowStore.getState().activeMapLocation).toBe('太医院');

    await clickDialogueAdvance();

    expect(await screen.findByLabelText('寝殿对白')).toHaveTextContent(/夜已经深了/);
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
  });

  it('开场本地剧情已显示时不会被后台 AI loading 锁住', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'opening-dialogue',
      scene: 'briefing',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        family: '镇国公嫡女',
        residenceName: '椒房殿',
        openingTendency: undefined,
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    await clickDialogueAdvance();
    await clickDialogueAdvance();

    await advanceDialoguePages();
    const tendencyButton = (await screen.findByText('节衣缩食')).closest('button');
    expect(tendencyButton).not.toBeNull();
    expect(tendencyButton).not.toBeDisabled();
  });

  it('宫门中的杜娘可购买与回收道具', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 50,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '宫门' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));
    fireEvent.click(await screen.findByRole('button', { name: '杜娘' }));

    expect(await screen.findByLabelText('杜娘 宫门对话')).toBeInTheDocument();
    expect(screen.getByLabelText('杜娘常驻立绘')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '杜娘' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '返回' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '离开' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '购买' })).not.toBeInTheDocument();
    expect(screen.queryByText(/交易即时结算/)).not.toBeInTheDocument();

    await clickDialogueAdvance();
    await clickDialogueAdvance();
    expect(screen.getByRole('button', { name: '购买' })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: '返回' })).toHaveLength(1);
    expect(screen.queryByLabelText('杜娘 宫门对话')).not.toBeInTheDocument();
    expect(screen.getByLabelText('杜娘常驻立绘')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '杜娘' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '购买' }));
    expect(await screen.findByRole('dialog', { name: '杜娘购买弹窗' })).toBeInTheDocument();
    const purchaseButtons = await screen.findAllByRole('button', { name: /^购买 / });
    expect(purchaseButtons.length).toBeGreaterThanOrEqual(7);
    expect(purchaseButtons.length).toBeLessThanOrEqual(9);
    expect(screen.queryByRole('button', { name: '购买 鹤顶红' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '购买 缠枝香囊' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.silver).toBe(930);
      expect(useGameFlowStore.getState().inventory.find((item) => item.itemId === 'embroidered-sachet')?.quantity).toBe(1);
      expect(screen.getByText('当前银两：930')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '售卖' }));
    expect(await screen.findByRole('dialog', { name: '杜娘售卖弹窗' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '售卖 缠枝香囊' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.silver).toBe(986);
      expect(useGameFlowStore.getState().inventory.find((item) => item.itemId === 'embroidered-sachet')).toBeUndefined();
      expect(screen.getByText('当前银两：986')).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByRole('button', { name: '返回' })[0]);
    expect(await screen.findByRole('button', { name: '杜娘' })).toBeInTheDocument();
    expect(screen.queryByLabelText('杜娘 宫门对话')).not.toBeInTheDocument();
  });

  it('杜娘闲谈走随机事件池且不被后台 AI 请求锁住', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockReset();
    fetchMock.mockImplementation(() => new Promise<Response>(() => {}));

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 50,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      permanentNpcRelationships: {
        'du-niang': {
          npcId: 'du-niang',
          npcName: '杜娘',
          met: true,
          affinity: 60,
          xunKey: '1-1-1',
          actionCountThisXun: 0,
        },
      },
      randomEventProgress: {
        triggerCounts: {},
        unlockedEventIds: [],
        pendingUnlocks: [],
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);
    vi.spyOn(Math, 'random').mockReturnValue(0);

    fireEvent.click(await screen.findByRole('button', { name: '宫门' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));
    fireEvent.click(await screen.findByRole('button', { name: '杜娘' }));

    await clickDialogueAdvance();
    const smallTalkButton = await screen.findByRole('button', { name: '闲谈（耗次）' });
    fireEvent.click(smallTalkButton);

    await advanceDialoguePages();
    expect(await screen.findByText(/哟，您闻见没/)).toBeInTheDocument();
    await clickDialogueOnce();
    await clickDialogueOnce();
    await clickDialogueOnce();
    expect(screen.getByRole('button', { name: '闲谈（耗次）' })).not.toBeDisabled();
    expect(useGameFlowStore.getState().permanentNpcRelationships['du-niang']?.affinity).toBe(61);

    fireEvent.click(screen.getByRole('button', { name: '闲谈（耗次）' }));
    await advanceDialoguePages();
    expect(await screen.findByText(/哟，您闻见没/)).toBeInTheDocument();
    await clickDialogueOnce();
    await clickDialogueOnce();
    await clickDialogueOnce();
    expect(useGameFlowStore.getState().permanentNpcRelationships['du-niang']?.affinity).toBe(62);
  });

  it('杜娘随机闲谈轮到玩家发言时会切换为玩家立绘', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      selectedRoute: buildRouteProfiles().find((route) => route.id === 'lanyinxuguo'),
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 50,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      permanentNpcRelationships: {
        'du-niang': {
          npcId: 'du-niang',
          npcName: '杜娘',
          met: true,
          affinity: 80,
          xunKey: '1-1-1',
          actionCountThisXun: 0,
        },
      },
      randomEventProgress: {
        triggerCounts: {},
        unlockedEventIds: [],
        pendingUnlocks: [],
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);
    vi.spyOn(Math, 'random').mockReturnValue(0.67);

    fireEvent.click(await screen.findByRole('button', { name: '宫门' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));
    fireEvent.click(await screen.findByRole('button', { name: '杜娘' }));
    await clickDialogueAdvance();

    fireEvent.click(await screen.findByRole('button', { name: '闲谈（耗次）' }));
    expect(await screen.findByText(/御花园好看/)).toBeInTheDocument();
    await clickDialogueOnce();
    await clickDialogueOnce();
    fireEvent.click(await screen.findByRole('button', { name: '愿意说说' }));

    expect(await screen.findByText(/走快了一盏茶/)).toBeInTheDocument();
    expect(screen.getByLabelText('谢令仪立绘')).toBeInTheDocument();
    expect(screen.getByAltText('谢令仪')).toHaveAttribute('src', '/assets/player/lanyinxuguo-cutout.png');
  });

  it('妙音堂会显示基础按钮，并在结识连翘后开放曲谱报名', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const score = buildMusicScoreItem('score-phoenix-return');
    expect(score).not.toBeNull();

    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '妙音堂',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        favor: 55,
        flags: {
          ...state.state.flags,
          attributeStatsFinalized: true,
          isLianQiaoMet: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 55,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      inventory: [...cloneInitialInventory(), score!],
      musicHallProgress: {
        listenCount: 6,
        strollCount: 0,
        signUpCount: 0,
        lianQiaoFirstMet: true,
        lianQiaoMet: true,
        lianQiaoFavor: 2,
        lianQiaoAffection: 2,
      },
      time: {
        year: 1,
        month: 2,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByRole('button', { name: '报名' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '听曲' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '学谱' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '闲逛' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连翘' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '学谱' }));
    expect(await screen.findByRole('dialog', { name: '连翘学谱' })).toBeInTheDocument();
    const talentBeforePractice = Number(useGameFlowStore.getState().state.stats.talent ?? 0);
    fireEvent.click(screen.getByRole('button', { name: /凤归云阙谱/ }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().musicHallProgress.musicScoreMastery?.['score-phoenix-return']?.masteryPercent).toBeGreaterThan(0);
      expect(useGameFlowStore.getState().state.stats.talent).toBeCloseTo(talentBeforePractice + 2);
    });
    expect(await within(screen.getByLabelText('数值变化提示')).findByText('乐理 +2')).toBeInTheDocument();
    await clickDialogueAdvance();

    fireEvent.click(screen.getByRole('button', { name: '报名' }));
    expect(await screen.findByRole('dialog', { name: '妙音堂曲谱报名' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /凤归云阙谱/ }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().musicHallProgress.signUpCount).toBe(1);
      expect(useGameFlowStore.getState().palaceBanquetProgress.submittedScore?.itemId).toBe('score-phoenix-return');
      expect(useGameFlowStore.getState().palaceBanquetProgress.submittedScore?.difficulty).toBe(85);
      expect(useGameFlowStore.getState().inventory.some((item) => item.itemId === 'score-phoenix-return')).toBe(true);
    });
  });

  it('妙音堂听曲的压力变化会随本次行动显示 toast', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '妙音堂',
      state: {
        ...state.state,
        stress: 30,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        stress: 30,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '听曲' }));

    const toastLayer = await screen.findByLabelText('数值变化提示');
    expect(await within(toastLayer).findByText(/压力 -/)).toBeInTheDocument();
    expect(screen.queryByText(/第2旬清晨通报/)).not.toBeInTheDocument();

    const actionResult = await screen.findByLabelText('妙音堂行动结果');
    await advanceDialoguePages();
    expect(actionResult).toHaveTextContent(/压力-/);

    await clickDialogueAdvance();

    expect(await screen.findByLabelText('寝殿对白')).toHaveTextContent(/夜已经深了/);

    await clickDialogueAdvance();

    const morningNightNotices = await screen.findAllByLabelText('夜晚侍寝通报', {}, { timeout: 1000 }).catch(() => []);
    if (morningNightNotices.length > 0) {
      await clickDialogueAdvance();
    }

    expect(await screen.findByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
  }, 8000);

  it('妙音堂普通听曲会保留行动结果对白，收起后仍停留在妙音堂', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '妙音堂',
      state: {
        ...state.state,
        stress: 30,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        stress: 30,
      },
      musicHallProgress: {
        listenCount: 0,
        strollCount: 0,
        signUpCount: 0,
        lianQiaoFirstMet: false,
        lianQiaoMet: false,
        lianQiaoFavor: 0,
        lianQiaoAffection: 0,
      },
      time: {
        year: 1,
        month: 2,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '听曲' }));

    const actionResult = await screen.findByLabelText('妙音堂行动结果');
    expect(actionResult).toHaveTextContent(/妙音堂|丝竹|余音/);

    await clickDialogueAdvance();

    expect(screen.queryByLabelText('妙音堂行动结果')).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    expect(useGameFlowStore.getState().activeMapLocation).toBe('妙音堂');
  });

  it('位分低于容华时不能进入华清池', async () => {
    const defaultFavorTier = getFavorTierByValue(20);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'fushengrumeng',
      state: {
        ...state.state,
        routeId: 'fushengrumeng',
        name: '沈容儿',
        residenceName: '储秀宫',
        prestige: 300,
        favor: 20,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 300,
        prestige: 300,
        stress: 0,
        favor: 20,
        trueHeart: 20,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '才人',
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '华清池' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));

    expect(await screen.findByText('贴身宫女 · 娇娇')).toBeInTheDocument();
    expect(screen.getByText('小主，华清池乃是容华及以上位分方可享用之地，咱们还是先请回吧。')).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
  });

  it('深夜时华清池双人沐浴邀请列表会出现连翘', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => {
      const nextConcubines = state.concubines.map((consort, index) =>
        index === 0
          ? {
              ...consort,
              stats: {
                ...consort.stats,
                affection: 50,
                relationToPlayer: 45,
              },
            }
          : consort,
      );

      return {
        ...state,
        currentView: 'bedchamber',
        scene: 'activity',
        activeChamberPanel: 'main',
        activeMapLocation: '华清池',
        routeId: 'lanyinxuguo',
        state: {
          ...state.state,
          routeId: 'lanyinxuguo',
          name: '谢令仪',
          residenceName: '椒房殿',
          prestige: 900,
          favor: 50,
          flags: {
            ...state.state.flags,
            isLianQiaoMet: true,
          },
        },
        hiddenStats: {
          silver: 1000,
          prestige: 900,
          stress: 30,
          favor: 50,
          trueHeart: 35,
          favorLabel: defaultFavorTier.label,
          favorColor: defaultFavorTier.color,
          initialRank: '婕好',
        },
        concubines: nextConcubines,
        musicHallProgress: {
          listenCount: 6,
          strollCount: 0,
          signUpCount: 0,
          lianQiaoFirstMet: true,
          lianQiaoMet: true,
          lianQiaoFavor: 5,
          lianQiaoAffection: 40,
        },
        time: {
          year: 1,
          month: 2,
          xun: 1,
          slotIndex: 6,
          slot: '深夜',
          slotProgress: 0,
        },
      };
    });

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '双人沐浴' }));

    expect(await screen.findByRole('dialog', { name: '华清池邀请列表' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /连翘/ })).toBeInTheDocument();
  });

  it('尘缘夙错线的宫门会显示杜娘与阿翎入口', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'chenyuansucuo',
      state: {
        ...state.state,
        routeId: 'chenyuansucuo',
        name: '乌雅明珠',
        residenceName: '玉清宫',
        silver: 1000,
        favor: 50,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '公主',
      },
      bondProfile: buildInitialBondProfile('chenyuansucuo', '1-1-1'),
      concubineRouteId: 'chenyuansucuo',
      concubines: buildInitialConcubineRoster('chenyuansucuo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      time: {
        year: 1,
        month: 3,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '宫门' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));

    expect(await screen.findByRole('button', { name: '杜娘' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '阿翎' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '阿翎' }));

    expect(await screen.findByLabelText('阿翎 宫门对话')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '叙旧' })).not.toBeInTheDocument();
    await clickDialogueAdvance();
    await clickDialogueAdvance();
    expect(screen.getByRole('button', { name: '叙旧' })).toBeInTheDocument();
  });

  it('地图热点可直达现有朝堂事务面板', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      activeAffairsSource: '宫斗事务',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        favor: 50,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '养心殿' }));
    fireEvent.click(screen.getByRole('button', { name: '进入此处' }));
    fireEvent.click(await screen.findByRole('button', { name: '朝堂事务' }));

    expect(await screen.findByText('朝堂事务')).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeAffairsSource).toBe('朝堂事务');
  });

  it('地图后宫与冷宫弹窗不提供宫斗事务发起入口', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      activeAffairsSource: '宫斗事务',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        favor: 50,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '后宫' }));
    expect(screen.queryByRole('button', { name: '后宫总览' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '进入此处' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '宫斗事务' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '留在地图' }));

    fireEvent.click(await screen.findByRole('button', { name: '冷宫' }));
    expect(screen.queryByRole('button', { name: '旧案纪事' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));
    expect(await screen.findByRole('button', { name: '旧案纪事' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '宫斗事务' })).not.toBeInTheDocument();
  });

  it('道具管理将证物类 rare 道具归入关键物件而不是丹药', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      inventory: [
        {
          itemId: 'yingluo-old-testimony',
          name: '老宫人口供残抄',
          category: 'rare',
          rarity: 'purple',
          quantity: 1,
          price: 0,
          favorDelta: 0,
          healthDelta: 0,
          appearanceDelta: 0,
          temperamentDelta: 0,
          description: '冷宫老宫人偷藏的半页口供残抄，只能证明案发夜有异常宫牌借道。',
          canSell: false,
          canRecycle: false,
        },
        {
          itemId: 'hedinghong',
          name: '鹤顶红',
          category: 'medicine',
          rarity: 'red',
          quantity: 1,
          price: 260,
          favorDelta: 0,
          healthDelta: -80,
          appearanceDelta: 0,
          temperamentDelta: 0,
          description: '烈性毒药。',
        },
      ],
    }));

    render(<InventoryPanelView onClose={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: '丹药' }));
    expect(screen.getByText('鹤顶红')).toBeInTheDocument();
    expect(screen.queryByText('老宫人口供残抄')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '关键物件' }));
    expect(screen.getByText('老宫人口供残抄')).toBeInTheDocument();
    expect(screen.queryByText('鹤顶红')).not.toBeInTheDocument();
  });

  it('后宫布局会把玩家当前住所落到对应主殿', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'chenyuansucuo',
      state: {
        ...state.state,
        routeId: 'chenyuansucuo',
        name: '乌兰托娅',
        residenceName: '玉清宫',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 1200,
        stress: 30,
        favor: 50,
        trueHeart: 10,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '和亲入宫',
      },
      bondProfile: buildInitialBondProfile('chenyuansucuo', '1-1-1'),
      concubineRouteId: 'chenyuansucuo',
      concubines: buildInitialConcubineRoster('chenyuansucuo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    const { container } = render(<App />);

    expect((container.querySelector('.chamber-main__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/hougong_outside_daytime.png',
    );

    fireEvent.click(await screen.findByRole('button', { name: '玉清宫' }));

    expect((container.querySelector('.harem-palace-view') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/hougong_daytime.png',
    );
    expect(await screen.findByRole('button', { name: /主殿[\s\S]*和亲入宫 乌兰托娅/ })).toBeInTheDocument();
  });

  it('后宫自己的殿位提供回到寝殿入口', async () => {
    const defaultFavorTier = getFavorTierByValue(12);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: '后宫',
      routeId: 'yingluoyeting',
      state: {
        ...state.state,
        routeId: 'yingluoyeting',
        name: '沈璧',
        residenceName: '储秀宫西偏殿',
        openingTendency: '量入为出',
        stamina: STAMINA_INITIAL_PER_XUN,
        favor: 12,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 50,
        prestige: 120,
        stress: 30,
        favor: 12,
        trueHeart: 0,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '答应',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('yingluoyeting', '1-1-1'),
      concubineRouteId: 'yingluoyeting',
      concubines: buildInitialConcubineRoster('yingluoyeting'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '储秀宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /西偏殿[\s\S]*答应 沈璧/ }));
    fireEvent.click(await screen.findByRole('button', { name: '回到储秀宫西偏殿' }));

    await waitFor(() => {
      const flow = useGameFlowStore.getState();
      expect(flow.currentView).toBe('bedchamber');
      expect(flow.activeChamberPanel).toBe('main');
      expect(flow.activeMapLocation).toBeUndefined();
    });
    expect(await screen.findByRole('button', { name: '诵读经典' })).toBeInTheDocument();
  });

  it('地图不再把椒房殿作为寝殿热点，回宫统一走侧栏入口', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        favor: 50,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
          bedchamberIntroShown: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(screen.queryByRole('button', { name: '椒房殿' })).not.toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '掖庭院' })).toBeInTheDocument();
    const sidebar = await screen.findByLabelText('大地图常驻入口');
    fireEvent.click(within(sidebar).getByRole('button', { name: '回宫' }));

    expect(await screen.findByRole('button', { name: '诵读经典' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '泼墨作画' })).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
    expect(screen.queryByRole('button', { name: '进入此处' })).not.toBeInTheDocument();
  });

  it('后宫宫殿住处不再注入大地图寝殿热点', async () => {
    const defaultFavorTier = getFavorTierByValue(18);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'fushengrumeng',
      state: {
        ...state.state,
        routeId: 'fushengrumeng',
        name: '宁小满',
        residenceName: '储秀宫',
        favor: 18,
        flags: {
          ...state.state.flags,
          mapGuideFinished: true,
          bedchamberIntroShown: true,
        },
      },
      hiddenStats: {
        silver: 520,
        prestige: 300,
        stress: 8,
        favor: 18,
        trueHeart: 12,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '才人',
      },
      bondProfile: buildInitialBondProfile('fushengrumeng', '1-1-1'),
      concubineRouteId: 'fushengrumeng',
      concubines: buildInitialConcubineRoster('fushengrumeng'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByRole('button', { name: '掖庭院' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '储秀宫' })).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().state.residenceName).toBe('储秀宫');
    expect(screen.queryByRole('button', { name: '椒房殿' })).not.toBeInTheDocument();
  });

  it('外景场景左侧保留外出回地图，并提供独立回宫入口', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御膳房',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        favor: 50,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    const sidebar = screen.getByRole('navigation', { name: '寝殿左侧功能栏' });
    expect(within(sidebar).getByRole('button', { name: '外出' })).toBeInTheDocument();
    expect(within(sidebar).getByRole('button', { name: '回宫' })).toBeInTheDocument();

    fireEvent.click(within(sidebar).getByRole('button', { name: '外出' }));

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBe('御膳房');
    await waitFor(() => expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined());

    act(() => {
      useGameFlowStore.getState().enterMainChamber('御膳房');
    });
    fireEvent.click(within(await screen.findByRole('navigation', { name: '寝殿左侧功能栏' })).getByRole('button', { name: '回宫' }));

    expect(await screen.findByRole('button', { name: '诵读经典' })).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
  });

  it('御膳房可购买美食并在第四次闲逛强制触发布自游', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御膳房',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 50,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      kitchenProgress: {
        strollCount: 3,
        buZiyouUnlocked: false,
        buZiyouMet: false,
        buZiyouFavor: 0,
        buZiyouAffinity: 0,
      },
      templeProgress: {
        worshipCount: 0,
        prayerCount: 0,
        strollCount: 0,
        dangYiFavor: 0,
        dangYiAffinity: 0,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 3,
        slot: '下午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByRole('button', { name: '闲逛' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '购买美食' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '购买美食' }));
    expect(await screen.findByRole('dialog', { name: '御膳房购买美食弹窗' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '购买 桂花酥酪' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.silver).toBe(955);
      expect(screen.getByText('当前银两：955')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '闲逛' }));

    expect(await screen.findByLabelText('御膳房对话框')).toBeInTheDocument();
    await advanceDialoguePages();
    expect(screen.getByText('御厨 · 布自游')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^借食单试探他/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^放软语气示好/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^故意留半句玩笑/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回御膳房' }));

    expect(await screen.findByRole('button', { name: '布自游' })).toBeInTheDocument();
    expect(useGameFlowStore.getState().kitchenProgress.buZiyouUnlocked).toBe(true);
    expect(useGameFlowStore.getState().kitchenProgress.buZiyouMet).toBe(true);
  });

  it('NPC 初遇对白使用本地选项，不等待 AI 响应', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockReset();
    fetchMock.mockImplementation((input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (requestUrl.endsWith('/api/v1/ai/consort-dialogue')) {
        return Promise.reject(new DOMException('Aborted', 'AbortError'));
      }

      throw new Error('offline');
    });

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御膳房',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 50,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      kitchenProgress: {
        strollCount: 3,
        buZiyouUnlocked: false,
        buZiyouMet: false,
        buZiyouFavor: 0,
        buZiyouAffinity: 0,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 3,
        slot: '下午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '闲逛' }));

    expect(screen.getByText('炊火声里，对方像是在等你先开口。')).toBeInTheDocument();
    await advanceDialoguePages();

    await waitFor(
      () => {
        expect(screen.getByRole('button', { name: '借食单试探他' })).toBeInTheDocument();
      },
      { timeout: CONSORT_DIALOGUE_TIMEOUT_MS + 1000 },
    );
    expect(screen.getByRole('button', { name: '放软语气示好' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '故意留半句玩笑' })).toBeInTheDocument();
  });

  it('御膳房默认使用本地分支，不进入 AI line 续句', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    let kitchenTurnCount = 0;

    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (requestUrl.endsWith('/api/v1/ai/consort-dialogue')) {
        kitchenTurnCount += 1;

        return {
          ok: true,
          json: async () =>
            kitchenTurnCount === 1
              ? {
                  mode: 'line',
                  phase: 'continue',
                  speakerIdentity: '御厨',
                  speakerName: '布自游',
                  text: '布自游把汤勺轻轻搁回灶边，抬眼时笑意还压在唇角：“娘娘既来了御膳房，总不至于只看一眼火候。若还想往下问，我便听着。”',
                  sceneHint: '他没有立刻表态，还在等你把这句继续说完。',
                  options: [],
                }
              : {
                  mode: 'branch',
                  phase: 'continue',
                  speakerIdentity: '御厨',
                  speakerName: '布自游',
                  text: '他这才把视线真正落到你身上，声音却仍压得不紧不慢：“行，那娘娘就说吧。您想试我的心，还是想借这灶火先暖一暖场面？”',
                  sceneHint: '布自游已经把话口留出来了。',
                  options: [
                    { id: 'probe', label: '借食单试探他', effectHint: '顺着闲话探一探他真正站哪边。', localToneTag: 'neutral' },
                    { id: 'warm', label: '放软语气示好', effectHint: '更容易稳稳攒一点好感。', localToneTag: 'friendly' },
                    { id: 'tease', label: '故意留半句玩笑', effectHint: '若他愿接，最容易牵出暧昧余地。', localToneTag: 'flirt' },
                  ],
                },
        } as Response;
      }

      throw new Error('offline');
    });

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御膳房',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 50,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      kitchenProgress: {
        strollCount: 3,
        buZiyouUnlocked: false,
        buZiyouMet: false,
        buZiyouFavor: 0,
        buZiyouAffinity: 0,
      },
      templeProgress: {
        worshipCount: 0,
        prayerCount: 0,
        strollCount: 0,
        dangYiFavor: 0,
        dangYiAffinity: 0,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 3,
        slot: '下午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '闲逛' }));

    await advanceDialoguePages();
    expect(await screen.findByRole('button', { name: /^借食单试探他/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^放软语气示好/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^故意留半句玩笑/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一句' })).not.toBeInTheDocument();
    expect(kitchenTurnCount).toBe(0);
  });

  it('宝华殿礼佛三次后结识当一，祈福会增加福德', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '宝华殿',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 50,
        stats: {
          ...state.state.stats,
          fortune: 3,
        },
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      merchantLedger: {},
      templeProgress: {
        worshipCount: 0,
        prayerCount: 0,
        strollCount: 0,
        dangYiFavor: 0,
        dangYiAffinity: 0,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByRole('button', { name: '礼佛' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '祈福' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '闲逛' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '当一' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '祈福' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.stats.fortune).toBe(4);
      expect(useGameFlowStore.getState().templeProgress.prayerCount).toBe(1);
    });

    fireEvent.click(screen.getByRole('button', { name: '礼佛' }));
    fireEvent.click(await screen.findByRole('button', { name: '礼佛' }));
    fireEvent.click(await screen.findByRole('button', { name: '礼佛' }));

    expect(await screen.findByLabelText('宝华殿对话框')).toBeInTheDocument();
    await advanceDialoguePages();
    expect(screen.getByText('佛殿执事 · 当一')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^先按礼回话/ })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^先按礼回话/ }));
    await advanceDialoguePages();
    await waitFor(() => expect(screen.getByText(/娘娘心里有数/)).toBeInTheDocument());
    await clickDialogueAdvance();

    expect(await screen.findByRole('button', { name: '当一' })).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.flags.isDangYiMet).toBe(true);
    expect(useGameFlowStore.getState().templeProgress.worshipCount).toBe(3);
  });

  it('寝殿情缘面板默认只显示主线对象的只读心声', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await finishOpeningGuide();
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '诵读经典' })).toBeInTheDocument();
      expect(screen.queryByText(/更换装扮/)).not.toBeInTheDocument();
    });
    useGameFlowStore.setState({ activeChamberPanel: 'bond' });

    expect(await screen.findByText(/容安表面上仍守着皇帝该有的分寸/)).toBeInTheDocument();
    expect(screen.queryByText('含笑试探')).not.toBeInTheDocument();
    expect(screen.queryByText(/最近判定/)).not.toBeInTheDocument();
    expect(screen.queryByText('江晚晚')).not.toBeInTheDocument();
    expect(screen.queryByText('姚铃儿')).not.toBeInTheDocument();
  });

  it('妃嫔倾情达到 60 后才会出现在情缘面板', async () => {
    const roster = buildInitialConcubineRoster('lanyinxuguo').map((consort) =>
      consort.name === '江晚晚'
        ? {
            ...consort,
            stats: {
              ...consort.stats,
              affection: 60,
            },
          }
        : consort,
    );
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'bond',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        openingTendency: '节衣缩食',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: roster,
    }));

    render(<App />);

    fireEvent.click((await screen.findByText('江晚晚')).closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/江晚晚表面上仍守着淑妃该有的分寸/)).toBeInTheDocument();
    });
  });

  it('尘缘夙错线的情缘主对象只显示阿翎', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'bond',
      activeMapLocation: undefined,
      routeId: 'chenyuansucuo',
      state: {
        ...state.state,
        routeId: 'chenyuansucuo',
        openingTendency: '节衣缩食',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      bondProfile: buildInitialBondProfile('chenyuansucuo', '1-1-1'),
      concubineRouteId: 'chenyuansucuo',
      concubines: buildInitialConcubineRoster('chenyuansucuo'),
    }));

    render(<App />);

    expect(await screen.findByText(/阿翎表面上仍守着故国旧识该有的分寸/)).toBeInTheDocument();
    expect(screen.queryByText('容安')).not.toBeInTheDocument();
  });

  it('特殊角色在对应触发旗标生效后会进入情缘面板', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'bond',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        openingTendency: '节衣缩食',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          'bondNpcUnlocked:buziyou': true,
        },
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
    }));

    render(<App />);

    fireEvent.click((await screen.findByText('布自游')).closest('button')!);

    await waitFor(() => {
      expect(screen.getByText(/布自游表面上仍守着御厨该有的分寸/)).toBeInTheDocument();
    });
  });

  it('宫斗事务选择下毒后只显示三味毒物', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));
    fireEvent.click(screen.getByRole('button', { name: '方式' }));
    fireEvent.click(screen.getByRole('button', { name: /下毒/ }));
    fireEvent.click(screen.getByRole('button', { name: '道具' }));

    expect(await screen.findByText('鹤顶红')).toBeInTheDocument();
    expect(screen.getByText('麝香')).toBeInTheDocument();
    expect(screen.getByText('陨颜丹')).toBeInTheDocument();
    expect(screen.queryByText('不使用')).not.toBeInTheDocument();
    expect(screen.queryByText('香囊')).not.toBeInTheDocument();
    expect(screen.queryByText('书信')).not.toBeInTheDocument();
    expect(screen.queryByText('补品')).not.toBeInTheDocument();
  });

  it('宫斗事务对象和嫁祸对象会显示全部存活非冷宫妃嫔', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const roster = buildInitialConcubineRoster('lanyinxuguo');
    const eligibleConsorts = roster.filter((consort) => consort.status === 'live' && !consort.residence.includes('冷宫'));
    const lastGeneratedTarget = eligibleConsorts.at(-1)!;

    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: roster,
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));

    expect(eligibleConsorts.length).toBeGreaterThan(6);
    eligibleConsorts.forEach((consort) => {
      expect(screen.getByText(`${consort.rankLabel} ${consort.name}`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '合谋' }));

    expect(screen.getByText(`${lastGeneratedTarget.rankLabel} ${lastGeneratedTarget.name}`)).toBeInTheDocument();
  });

  it('宫斗事务下毒完成前先进入投放QTE', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: [buildYetingPoisonCatalog()[0]],
      palaceStrifeCases: [],
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));
    fireEvent.click(screen.getByRole('button', { name: '方式' }));
    fireEvent.click(screen.getByRole('button', { name: /下毒/ }));
    fireEvent.click(screen.getByRole('button', { name: '道具' }));
    fireEvent.click(screen.getByRole('button', { name: '完成' }));

    expect(await screen.findByLabelText('下毒时机')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /停止并下毒/ })).toBeInTheDocument();
    expect(screen.getByText(/杯盏已递到近前/)).toBeInTheDocument();
    expect(screen.getByText('正在等待投放时机，尚未登记案件。')).toBeInTheDocument();
    expect(screen.queryByText('本次宫斗事务已登记，待当旬夜晚结算。')).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().palaceStrifeCases).toEqual([]);
  });

  it('宫斗事务下毒必须先持有毒药', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      palaceStrifeCases: [],
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));
    fireEvent.click(screen.getByRole('button', { name: '方式' }));
    fireEvent.click(screen.getByRole('button', { name: /下毒/ }));
    fireEvent.click(screen.getByRole('button', { name: '道具' }));
    expect(await screen.findAllByText(/持有 0 份/)).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: '完成' }));

    expect(await screen.findByText(/可去掖庭院寻月姑姑购买毒药/)).toBeInTheDocument();
    expect(screen.queryByLabelText('下毒时机')).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().palaceStrifeCases).toEqual([]);
  });

  it('宫斗事务下毒投放成功会消耗毒药并登记案件', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    let rafCallback: FrameRequestCallback | null = null;
    const requestAnimationFrameSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((callback) => {
      rafCallback = callback;
      return 1;
    });
    const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => undefined);

    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        stats: {
          ...state.state.stats,
          fortune: 90,
          medicine: 0,
          intrigue: 0,
        },
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          attributeStatsFinalized: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: [buildYetingPoisonCatalog()[0]],
      palaceStrifeCases: [],
    }));

    try {
      render(<App />);

      fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
      fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));
      fireEvent.click(screen.getByRole('button', { name: '方式' }));
      fireEvent.click(screen.getByRole('button', { name: /下毒/ }));
      fireEvent.click(screen.getByRole('button', { name: '道具' }));
      fireEvent.click(screen.getByRole('button', { name: '完成' }));

      expect(await screen.findByLabelText('下毒时机')).toBeInTheDocument();
      expect(rafCallback).not.toBeNull();
      act(() => {
        rafCallback?.(window.performance.now() + 350);
      });
      fireEvent.click(screen.getByRole('button', { name: /停止并下毒/ }));

      await waitFor(() => {
        const flow = useGameFlowStore.getState();
        expect(flow.palaceStrifeCases).toHaveLength(1);
        expect(flow.inventory.find((item) => item.itemId === 'hedandinghong')).toBeUndefined();
      });
      expect(screen.getByText(/投放成功，案件已登记/)).toBeInTheDocument();
      await waitFor(() => {
        expect(screen.getByLabelText('数值变化提示')).toHaveTextContent(/福德 -10/);
      });
    } finally {
      requestAnimationFrameSpy.mockRestore();
      cancelAnimationFrameSpy.mockRestore();
    }
  });

  it('掖庭院月姑姑可购买毒药', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '掖庭院',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        silver: 1000,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
    }));

    render(<App />);

    expect(await screen.findByLabelText('掖庭院场景')).toHaveTextContent('月姑姑');
    fireEvent.click(screen.getByRole('button', { name: '买毒药' }));
    expect(await screen.findByRole('dialog', { name: '月姑姑毒药货单' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '购买 陨颜丹' }));

    await waitFor(() => {
      const flow = useGameFlowStore.getState();
      expect(flow.state.silver).toBe(850);
      expect(flow.inventory.find((item) => item.itemId === 'yunyandan')?.quantity).toBe(1);
    });
    expect(screen.getByText(/将陨颜丹用旧纸包好递来/)).toBeInTheDocument();
  });

  it('宫斗事务完成后先登记待结算，不提前显示进入追查', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));
    fireEvent.click(screen.getByRole('button', { name: '完成' }));

    expect((await screen.findAllByText(/当旬夜晚结算/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/案件已进入追查/)).not.toBeInTheDocument();
  });

  it('养心殿裁断通过对话事件处理牵连玩家的待裁断案', async () => {
    const defaultFavorTier = getFavorTierByValue(80);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        favor: 80,
        trueHeart: 60,
        stats: {
          ...state.state.stats,
          intrigue: 900,
          appearance: 800,
          temperament: 800,
        },
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 80,
        trueHeart: 60,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      palaceStrifeCases: [
        {
          id: 'palace-strife-yangxin-ui',
          xunKey: '1-1-1',
          year: 1,
          month: 1,
          xun: 1,
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
          status: 'pending_verdict',
          outcome: 'pending',
          investigationXunsElapsed: 0,
          convictionRate: 100,
          suspects: [
            {
              id: 'suspect-player',
              subjectType: 'player',
              subjectId: 'player',
              name: '皇后 谢令仪',
              suspicionRate: 100,
              isActualActor: true,
              reason: '行动痕迹与动机最重，内廷优先追查。',
            },
          ],
          pendingVerdictSuspectId: 'suspect-player',
          summary: '内廷已开始追查源头。',
        },
      ],
    }));
    expect(useGameFlowStore.getState().beginPendingYangxinVerdict('palace-strife-yangxin-ui').success).toBe(true);
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();

    const { container } = render(<App />);

    expect(await screen.findByText(/养心殿传旨/)).toBeInTheDocument();
    expect(container.querySelector('.chamber-main__background--current')?.getAttribute('style')).toContain(
      '/assets/routes/home/home_yeting_dawn%20till%20dask.png',
    );
    fireEvent.click(screen.getByLabelText(/对话正文/));
    expect(useGameFlowStore.getState().activeMapLocation).toBe('养心殿');
    await waitFor(() =>
      expect(container.querySelector('.chamber-main__background--current')?.getAttribute('style')).toContain(
        '/assets/routes/backgrounds/yangxin_verdict_daytime.png',
      ),
    );
    expect(await screen.findByText(/内廷已将你推至定罪门槛/)).toBeInTheDocument();
    expect(screen.queryByText(/皇后 谢令仪推至定罪门槛/)).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().activeMapLocation).toBe('养心殿');
    fireEvent.click(screen.getByLabelText(/对话正文/));
    expect(await screen.findByText(/你垂首听裁/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/对话正文/));
    expect(await screen.findByText(/奴婢只敢照实回禀/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/对话正文/));
    expect(await screen.findByRole('button', { name: /据证自辩/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /陈明疑点/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /伏身求宽/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /攀指旁人/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /沉默领罪/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /据理力争/ })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: /据证自辩/ }));

    expect(await screen.findByText(/据证自辩后，皇帝准予处罚按80%落地/)).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/对话正文/));
    expect(useGameFlowStore.getState().pendingYangxinVerdict).toBeUndefined();
    expect(useGameFlowStore.getState().palaceStrifeCases[0]).toMatchObject({
      status: 'resolved',
      outcome: 'convicted',
      convictedSuspectId: 'suspect-player',
      penaltyApplied: true,
    });
    expect(useGameFlowStore.getState().activeMapLocation).toBe('养心殿');
  });

  it('宫斗事务调查页会显示调查案件并可花银两调整嫌疑', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      palaceStrifeCases: [
        {
          id: 'palace-strife-npc-ui',
          xunKey: '1-1-1',
          year: 1,
          month: 1,
          xun: 1,
          actorId: 'npc',
          actorConsortId: 'consort-yao',
          actorName: '贵妃 姚铃儿',
          targetConsortId: 'consort-cui',
          targetName: '贵人 崔令蓉',
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
          investigationXunsElapsed: 1,
          convictionRate: 70,
          suspects: [
            {
              id: 'suspect-yao',
              subjectType: 'consort',
              subjectId: 'consort-yao',
              name: '贵妃 姚铃儿',
              suspicionRate: 40,
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
          summary: '内廷已开始追查源头。',
        },
      ],
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));
    fireEvent.click(screen.getByRole('button', { name: '调查' }));

    expect(await screen.findByText('调查案件')).toBeInTheDocument();
    expect(screen.getAllByText('贵人 崔令蓉').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/定案率 70%/)).toBeInTheDocument();
    fireEvent.click(screen.getAllByRole('button', { name: /花20两压低嫌疑/ })[1]);

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.silver).toBe(980);
      expect(useGameFlowStore.getState().palaceStrifeCases[0].suspects?.find((suspect) => suspect.id === 'suspect-cui')?.suspicionRate).toBe(65);
    });
    expect(screen.getByText(/压低贵人 崔令蓉嫌疑/)).toBeInTheDocument();
  });

  it('寝殿嫔妃面板可切换状态并展示对应名单', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await finishOpeningGuide();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '诵读经典' })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '嫔妃' }));

    expect(await screen.findByLabelText('嫔妃总览面板')).toBeInTheDocument();
    expect(screen.getAllByText(/姚铃儿/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('tab', { name: '冷宫' }));
    expect(await screen.findByRole('listitem', { name: '庶人 杜若蘅' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '已逝' }));
    expect(await screen.findByRole('listitem', { name: '悼嫔 冯妙莲' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    await waitFor(() => {
      expect(screen.queryByLabelText('嫔妃总览面板')).not.toBeInTheDocument();
    });
  });

  it('寝殿嫔妃总览只做查看，不提供拜访入口', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'consorts',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByLabelText('嫔妃总览面板')).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(1);
    expect(screen.queryByRole('button', { name: '拜访' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '人际' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '查看好感说明' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('是否替你说话');
    expect(screen.queryByLabelText(/日常对话/)).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(1);
  });

  it('妃嫔送礼只显示有正向送礼效果的物品并结算既有属性', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const musicScore = buildMusicScoreItem('score-phoenix-return');
    const inertItem = {
      itemId: 'inert-plot-item',
      name: '旧案残页',
      category: 'rare' as const,
      rarity: 'purple' as const,
      quantity: 1,
      price: 0,
      favorDelta: 0,
      healthDelta: 0,
      appearanceDelta: 0,
      temperamentDelta: 0,
      description: '只用于剧情推进的旧案物件，不应进入送礼列表。',
      canSell: false,
      canRecycle: false,
    };
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: [
        { ...buildDuNiangShopCatalog('gift-test').find((item) => item.itemId === 'embroidered-sachet')!, quantity: 2 },
        inertItem,
        ...(musicScore ? [musicScore] : []),
      ],
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));
    expect(await screen.findByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();
    await clickDialogueAdvance();
    fireEvent.click(await screen.findByRole('button', { name: '送礼' }));

    const giftPicker = await screen.findByLabelText('送礼选物');
    expect(within(giftPicker).getByRole('button', { name: /缠枝香囊/ })).toBeInTheDocument();
    expect(within(giftPicker).queryByRole('button', { name: /旧案残页/ })).not.toBeInTheDocument();
    expect(within(giftPicker).queryByRole('button', { name: /凤归云阙谱/ })).not.toBeInTheDocument();

    const beforeGiftRelation =
      useGameFlowStore.getState().concubines.find((item) => item.name === '姚铃儿')?.stats.relationToPlayer ?? 0;
    fireEvent.click(within(giftPicker).getByRole('button', { name: /缠枝香囊/ }));

    await advanceDialoguePages();
    expect(await screen.findByText(/娘娘这份心/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().inventory.find((item) => item.itemId === 'embroidered-sachet')?.quantity).toBe(1);
    expect(useGameFlowStore.getState().concubines.find((item) => item.name === '姚铃儿')?.stats.relationToPlayer).toBe(
      beforeGiftRelation + 5,
    );
  });

  it('后宫宫殿入口体力不足时不能拜访妃嫔', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: 0,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));

    expect(screen.queryByLabelText(/日常对话/)).not.toBeInTheDocument();
    expect(await screen.findByText(/体力不足/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stamina).toBe(0);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(1);
  });

  it('影落掖庭嫔妃总览不触发陈婉宁初见剧情', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'consorts',
      activeMapLocation: undefined,
      routeId: 'yingluoyeting',
      state: {
        ...state.state,
        routeId: 'yingluoyeting',
        name: '沈沉璧',
        residenceName: '储秀宫西偏殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 120,
        favor: 12,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          [YINGLUOYETING_STORY_FLAGS.chenWanningMet]: true,
          [YINGLUOYETING_STORY_FLAGS.evidenceBoxDone]: true,
          [YINGLUOYETING_STORY_FLAGS.chenWanningWatching]: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 120,
        stress: 30,
        favor: 12,
        trueHeart: 20,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '答应',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('yingluoyeting', '1-1-1'),
      concubineRouteId: 'yingluoyeting',
      concubines: buildInitialConcubineRoster('yingluoyeting'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByLabelText('嫔妃总览面板')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('listitem', { name: '妃 陈婉宁' }));

    expect(screen.queryByRole('button', { name: '拜访' })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('陈婉宁初见剧情')).not.toBeInTheDocument();
    expect(screen.queryByText(/你第一次踏进后宫宫道时/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '送礼' })).not.toBeInTheDocument();
  });

  it('影落掖庭从后宫宫殿进入陈婉宁主殿时旧陈线旗标不会吞掉初见剧情', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'yingluoyeting',
      state: {
        ...state.state,
        routeId: 'yingluoyeting',
        name: '沈沉璧',
        residenceName: '储秀宫西偏殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 120,
        favor: 12,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          [YINGLUOYETING_STORY_FLAGS.chenWanningMet]: true,
          [YINGLUOYETING_STORY_FLAGS.evidenceBoxDone]: true,
          [YINGLUOYETING_STORY_FLAGS.chenWanningWatching]: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 120,
        stress: 30,
        favor: 12,
        trueHeart: 20,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '答应',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('yingluoyeting', '1-1-1'),
      concubineRouteId: 'yingluoyeting',
      concubines: buildInitialConcubineRoster('yingluoyeting'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '昭阳宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*陈婉宁/ }));

    expect((await screen.findAllByLabelText('陈婉宁初见剧情')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/你第一次踏进后宫宫道时/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '送礼' })).not.toBeInTheDocument();
  });

  it('后宫宫内可进入妃嫔日常对话并展示固定操作', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    const { container } = render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));

    expect(await screen.findByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();
    expect((container.querySelector('.harem-palace-view') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/zhudian_daytime.png',
    );
    expect(screen.getByLabelText('姚铃儿常驻立绘')).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(1);
    expect(screen.getByRole('button', { name: '送礼' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '试探' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拉拢' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '返回' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '问好' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '口角' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '责罚' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '抹黑' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '先行告退' })).not.toBeInTheDocument();

    await advanceDialoguePages();
    expect(await screen.findByText(/娘娘今日亲来/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '对话分支选项' })).not.toBeInTheDocument();
    expect(screen.queryByText('温声再问一句')).not.toBeInTheDocument();
    expect(screen.queryByText('借话轻轻试探')).not.toBeInTheDocument();
    expect(screen.queryByText('只把礼数做满')).not.toBeInTheDocument();
  });

  it('妃嫔公共外出时不会在自己寝宫被拜访', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const visitor = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'public-visit-away-test': {
            id: 'public-visit-away-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            location: '御花园',
            intent: 'public-visit',
            purpose: 'stroll',
            summary: `${visitor.name}本旬去了御花园。`,
            resolved: false,
          },
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿[\s\S]*外出/ }));

    expect(await screen.findByText(new RegExp(`${visitor.name}本旬不在殿内`))).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(`拜访 .*${visitor.name}`) })).not.toBeInTheDocument();
  });

  it('妃嫔在家中接待他人时会标记为会客中', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const resident = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];
    const visitor = concubines.find((consort) => consort.id !== resident.id) ?? concubines[1];
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'visit-consort-hosting-test': {
            id: 'visit-consort-hosting-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            targetConsortId: resident.id,
            location: 'home',
            intent: 'visit-consort',
            purpose: 'probe',
            summary: `${visitor.name}本旬到${resident.name}殿中试探。`,
            resolved: false,
          },
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿[\s\S]*会客中/ }));

    expect(await screen.findByRole('button', { name: new RegExp(`拜访 .*${resident.name}.*会客中`) })).toBeInTheDocument();
    expect(screen.getByLabelText('主殿同场拜访')).toHaveTextContent(`${visitor.name}正在殿中拜访${resident.rankLabel} ${resident.name}`);
  });

  it('玩家结束会客后来访妃嫔会回到自己的寝宫', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const resident = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];
    const visitor = concubines.find((consort) => consort.name === '江晚晚') ?? concubines.find((consort) => consort.id !== resident.id)!;
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: '后宫',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'visit-consort-return-home-test': {
            id: 'visit-consort-return-home-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            targetConsortId: resident.id,
            location: 'home',
            intent: 'visit-consort',
            purpose: 'probe',
            summary: `${visitor.name}本旬到${resident.name}殿中试探。`,
            resolved: false,
          },
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿[\s\S]*会客中/ }));
    fireEvent.click(await screen.findByRole('button', { name: /拜访 .*姚铃儿.*会客中/ }));

    const audienceActions = await screen.findByLabelText('宫内互动操作');
    fireEvent.click(within(audienceActions).getByRole('button', { name: '返回' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().npcActivity.entries['visit-consort-return-home-test'].resolved).toBe(true);
    });
    expect(screen.queryByLabelText('主殿同场拜访')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回宫苑' }));
    fireEvent.click(await screen.findByRole('button', { name: '钟粹宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*江晚晚/ }));

    expect(await screen.findByLabelText(new RegExp(`${visitor.name} 日常对话`))).toBeInTheDocument();
  });

  it('debug 表中的特殊旧居拜访会落到对应后宫宫殿显示', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const baseConcubines = buildInitialConcubineRoster('lanyinxuguo');
    const resident = {
      ...baseConcubines[0],
      id: 'live-old-residence-consort',
      name: '冯妙莲',
      rankLabel: '嫔',
      status: 'live' as const,
      residence: '旧居披香殿',
      source: 'custom' as const,
      allies: [],
      rivals: [],
    };
    const visitor = baseConcubines.find((consort) => consort.id !== resident.id && consort.status === 'live') ?? baseConcubines[1];
    const concubines = [...baseConcubines, resident];
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'visit-consort-old-residence-test': {
            id: 'visit-consort-old-residence-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            targetConsortId: resident.id,
            location: 'home',
            intent: 'visit-consort',
            purpose: 'probe',
            summary: `${visitor.name}本旬到${resident.name}旧居试探。`,
            resolved: false,
          },
          'stale-public-visit-for-host-test': {
            id: 'stale-public-visit-for-host-test',
            xunKey: '1-1-1',
            actorConsortId: resident.id,
            location: '妙音堂',
            intent: 'public-visit',
            purpose: 'stroll',
            summary: `${resident.name}原本要去妙音堂。`,
            resolved: false,
          },
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '披香殿' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*冯妙莲[\s\S]*会客中/ }));

    expect(await screen.findByRole('button', { name: /拜访 .*冯妙莲.*会客中/ })).toBeInTheDocument();
    expect(screen.getByLabelText('主殿同场拜访')).toHaveTextContent(`${visitor.name}正在殿中拜访${resident.rankLabel} ${resident.name}`);
  });

  it('公共地点排班妃嫔会显示为可点击交互而不是自动抢占对白', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const visitor = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御花园',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      consortInteractionMap: {
        [visitor.id]: {
          consortId: visitor.id,
          xunKey: '1-1-1',
          actionCountThisXun: 2,
          favorDeltaThisXun: 0,
          affectionDeltaThisXun: 0,
        },
      },
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'public-visit-test': {
            id: 'public-visit-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            location: '御花园',
            intent: 'public-visit',
            purpose: 'stroll',
            summary: `${visitor.name}本旬在御花园赏花，像是在避开宫中闲话。`,
            resolved: false,
          },
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();
    expect(screen.queryByLabelText(new RegExp(`${visitor.name} 日常对话`))).not.toBeInTheDocument();

    const visitorsPanel = await screen.findByLabelText('御花园可交互妃嫔');
    fireEvent.click(within(visitorsPanel).getByRole('button', { name: new RegExp(`与.*${visitor.name}交谈`) }));

    expect(await screen.findByLabelText(new RegExp(`${visitor.name} 日常对话`))).toBeInTheDocument();
    expect(useGameFlowStore.getState().npcActivity.entries['public-visit-test'].resolved).toBe(true);
    expect(await screen.findByText(new RegExp(`${visitor.name}本旬在御花园赏花`))).toBeInTheDocument();

    await clickDialogueAdvance();
    await waitFor(() => {
      expect(within(screen.getByLabelText('宫内互动操作')).getByRole('button', { name: '试探' })).not.toBeDisabled();
    });
    fireEvent.click(within(screen.getByLabelText('宫内互动操作')).getByRole('button', { name: '试探' }));
    await waitFor(() => {
      expect(useGameFlowStore.getState().consortInteractionMap[visitor.id]?.actionCountThisXun).toBe(3);
    });
    expect(await screen.findByText(/先向你敛衽请安/)).toBeInTheDocument();
    expect(screen.queryByText(/今日偶遇到此为止/)).not.toBeInTheDocument();
    await clickDialogueAdvance();
    expect(await screen.findByText(/周遭又有宫人往来/)).toBeInTheDocument();
  });

  it('户外偶遇皇帝完成主行动后先显示结果，再触发恭送圣驾收束', async () => {
    const defaultFavorTier = getFavorTierByValue(60);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        favor: 60,
        trueHeart: 40,
        prestige: 2500,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        favor: 60,
        trueHeart: 40,
        prestige: 2500,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      concubines,
      inventory: cloneInitialInventory(),
    }));
    const onLeave = vi.fn();

    render(<EmperorAudiencePanel source="public-encounter" location="御花园" concubines={concubines} onLeave={onLeave} />);

    expect(await screen.findByText(/你在御花园见到容安/)).toBeInTheDocument();
    expect(screen.getByLabelText('容安立绘')).toBeInTheDocument();
    await clickDialogueAdvance();
    fireEvent.click(await screen.findByRole('button', { name: '闲聊' }));

    expect(await screen.findByText(/你拣了几句宫中闲话|你把话题绕得轻巧|你几句话便把殿中沉闷拆开/)).toBeInTheDocument();
    expect(screen.queryByText(/恭送/)).not.toBeInTheDocument();
    await clickDialogueAdvance();

    expect(await screen.findByText(/不能强留圣驾/)).toBeInTheDocument();
    expect(screen.getAllByLabelText('皇帝互动告退').length).toBeGreaterThan(0);
    expect(screen.getByLabelText('容安立绘')).toBeInTheDocument();
    expect(onLeave).not.toHaveBeenCalled();
  });

  it('正阳门等待下朝会推进时辰', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      mapEventText: '',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '正阳门' }));
    fireEvent.click(await screen.findByRole('button', { name: '进入此处' }));
    expect(await screen.findByLabelText('正阳门行动')).toBeInTheDocument();
    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();

    fireEvent.click(await screen.findByRole('button', { name: '等待下朝' }));
    expect(await screen.findByLabelText('皇帝外景事件通报')).toBeInTheDocument();
    await waitFor(() => {
      expect(useGameFlowStore.getState().time.slot).toBe('上午');
      expect(useGameFlowStore.getState().activeMapLocationEntryTime).toBeUndefined();
    });
  });

  it('大地图地点弹窗不展示妃嫔信息，进入宫门后才显示可交互妃嫔', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const visitor = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      mapEventText: '',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'public-visit-gongmen-test': {
            id: 'public-visit-gongmen-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            location: '宫门',
            intent: 'public-visit',
            purpose: 'stroll',
            summary: `${visitor.name}本旬去了宫门，像是在等外头递来的消息。`,
            resolved: false,
          },
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '宫门' }));
    expect(await screen.findByLabelText('宫门 地点弹窗')).not.toHaveTextContent(visitor.name);
    expect(screen.queryByLabelText('宫门本旬妃嫔动向')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: new RegExp(`前去见.*${visitor.name}`) })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '进入此处' }));

    await waitFor(() => {
      expect(screen.getByLabelText('宫门人物入口')).toBeInTheDocument();
    });
    const visitorsPanel = await screen.findByLabelText('宫门可交互妃嫔');
    fireEvent.click(within(visitorsPanel).getByRole('button', { name: new RegExp(`与.*${visitor.name}交谈`) }));

    expect(await screen.findByLabelText(new RegExp(`${visitor.name} 日常对话`))).toBeInTheDocument();
    expect(useGameFlowStore.getState().npcActivity.entries['public-visit-gongmen-test'].resolved).toBe(true);
  });

  it('已交谈的外出妃嫔仍保留在本旬目的地中', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const visitor = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御花园',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'public-visit-resolved-test': {
            id: 'public-visit-resolved-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            location: '御花园',
            intent: 'public-visit',
            purpose: 'stroll',
            summary: `${visitor.name}本旬在御花园赏花。`,
            resolved: true,
          },
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByLabelText('御花园行动')).toBeInTheDocument();
    expect(screen.queryByLabelText('寝殿对白')).not.toBeInTheDocument();

    const visitorsPanel = await screen.findByLabelText('御花园可交互妃嫔');
    const resolvedButton = within(visitorsPanel).getByRole('button', { name: new RegExp(`${visitor.name}仍在此处`) });
    expect(resolvedButton).toBeDisabled();
  });

  it('妃嫔拜访玩家会自动打断寝殿流程并由玩家选择回应', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const visitor = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      npcActivity: {
        xunKey: '1-1-1',
        triggeredVisitIds: [],
        entries: {
          'visit-player-test': {
            id: 'visit-player-test',
            xunKey: '1-1-1',
            actorConsortId: visitor.id,
            location: 'player-residence',
            intent: 'visit-player',
            purpose: 'probe',
            summary: `${visitor.name}来到椒房殿试探你的态度。`,
            resolved: false,
          },
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 2,
        slot: '中午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByLabelText('妃嫔拜访寝殿')).toHaveTextContent(visitor.name);
    fireEvent.click(screen.getByRole('button', { name: /请她入座/ }));

    expect(await screen.findByText(new RegExp(`${visitor.name}入座。她神色稍缓`))).toBeInTheDocument();
    await clickDialogueAdvance();

    await waitFor(() => expect(screen.queryByLabelText('妃嫔拜访寝殿')).not.toBeInTheDocument());
    expect(useGameFlowStore.getState().npcActivity.entries['visit-player-test'].resolved).toBe(true);
    expect(useGameFlowStore.getState().npcActivity.triggeredVisitIds).toContain('visit-player-test');
  });

  it('妃嫔会面对白翻完后点击对话框不会自动退出互动页', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));
    expect(await screen.findByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();

    await advanceDialoguePages();
    const dialogueContent = getDialogueContent();
    expect(dialogueContent).toBeInTheDocument();
    fireEvent.click(dialogueContent!);

    expect(screen.getByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送礼' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '试探' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '拉拢' })).toBeInTheDocument();
  });

  it('妃嫔对话默认不请求 AI，也不展示通用语气分支', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    fetchMock.mockReset();
    fetchMock.mockRejectedValue(new Error('AI should not be requested during local consort audience'));

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));

    await advanceDialoguePages();
    expect(screen.getByText(/娘娘今日亲来/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '对话分支选项' })).not.toBeInTheDocument();
    expect(screen.queryByText('温声再问一句')).not.toBeInTheDocument();
    expect(screen.queryByText('借话轻轻试探')).not.toBeInTheDocument();
    expect(screen.queryByText('只把礼数做满')).not.toBeInTheDocument();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('妃嫔会面不会展示未在本地设定中收口的固定交互', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));

    expect(await screen.findByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(1);

    const actionPanel = screen.getByLabelText('宫内互动操作');
    const actionLabels = within(actionPanel)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(actionLabels).toEqual(['送礼', '试探', '拉拢', '返回']);
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(1);
  });

  it('妃嫔本旬互动次数用尽后会送客并退出会面', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    const concubines = buildInitialConcubineRoster('lanyinxuguo');
    const target = concubines.find((consort) => consort.name === '姚铃儿') ?? concubines[0];

    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines,
      inventory: cloneInitialInventory(),
      consortInteractionMap: {
        [target.id]: {
          consortId: target.id,
          xunKey: '1-1-1',
          actionCountThisXun: 2,
          favorDeltaThisXun: 0,
          affectionDeltaThisXun: 0,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));
    expect(await screen.findByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();
    await clickDialogueAdvance();

    await waitFor(() => {
      expect(within(screen.getByLabelText('宫内互动操作')).getByRole('button', { name: '试探' })).not.toBeDisabled();
    });
    fireEvent.click(within(screen.getByLabelText('宫内互动操作')).getByRole('button', { name: '试探' }));

    expect(await screen.findByText(/先向你敛衽请安/)).toBeInTheDocument();
    expect(screen.queryByText(/余下的话不妨留到下旬再叙/)).not.toBeInTheDocument();
    await clickDialogueAdvance();

    expect(await screen.findByText(/余下的话不妨留到下旬再叙/)).toBeInTheDocument();
    await clickDialogueAdvance();

    await waitFor(() => expect(screen.queryByLabelText('贵妃 姚铃儿 日常对话')).not.toBeInTheDocument());
    const visitButton = await screen.findByRole('button', { name: /拜访 贵妃 姚铃儿（本旬已会）/ });
    expect(visitButton).toBeDisabled();
    expect(screen.getByText(/本旬内不便再扰/)).toBeInTheDocument();
  });

  it('妃嫔对话点击返回会直接离开会面且不请求 AI', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    const requestPayloads: Array<Record<string, unknown>> = [];
    let consortTurnCount = 0;

    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (requestUrl.endsWith('/api/v1/ai/consort-dialogue')) {
        consortTurnCount += 1;
        if (typeof init?.body === 'string') {
          requestPayloads.push(JSON.parse(init.body) as Record<string, unknown>);
        }

        return {
          ok: true,
          json: async () =>
            ({
              mode: 'branch',
              phase: 'continue',
              speakerIdentity: '贵妃',
              speakerName: '姚铃儿',
              text: '姚铃儿将茶盏轻轻一转，笑意浅浅：“娘娘既来了，想来总有一句话要留给妾。”',
              sceneHint: '她等你表态。',
              options: [{ id: 'warm', label: '温声再问一句', effectHint: '先把敌意压下半寸。', localToneTag: 'friendly' }],
            }),
        } as Response;
      }

      throw new Error('offline');
    });

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));
    expect(await screen.findByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回' }));

    await waitFor(() => {
      expect(screen.queryByLabelText('贵妃 姚铃儿 日常对话')).not.toBeInTheDocument();
    });
    expect(consortTurnCount).toBe(0);
    expect(requestPayloads).toEqual([]);
  });

  it('妃嫔对话忽略 AI 分支遗留，只保留本地固定操作', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    let consortTurnCount = 0;

    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (requestUrl.endsWith('/api/v1/ai/consort-dialogue')) {
        consortTurnCount += 1;

        return {
          ok: true,
          json: async () =>
            consortTurnCount === 1
              ? {
                  mode: 'line',
                  phase: 'continue',
                  speakerIdentity: '贵妃',
                  speakerName: '姚铃儿',
                  text: '姚铃儿指尖压着茶盏边沿，眼风却先从你衣襟上一掠而过，慢慢笑道：“娘娘今日肯亲自进殿，想来不是为了看这两枝新换的海棠。妾听着，娘娘不妨再把话往下说。”',
                  sceneHint: '她还在试探你的来意。',
                  options: [],
                }
              : {
                  mode: 'branch',
                  phase: 'continue',
                  speakerIdentity: '贵妃',
                  speakerName: '姚铃儿',
                  text: '她话音落下时，眼尾那点笑意却并不真暖，反倒像是把门只开了半扇：“若娘娘真有心与我说句体己话，便看娘娘打算把这份好意放到什么分寸上。”',
                  sceneHint: '她开始等你表态了。',
                  options: [
                    { id: 'warm', label: '缓声示好', effectHint: '先把敌意压下半寸。', localToneTag: 'friendly' },
                    { id: 'probe', label: '顺势试探', effectHint: '借她的话摸清真实态度。', localToneTag: 'neutral' },
                  ],
                },
        } as Response;
      }

      throw new Error('offline');
    });

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));

    await advanceDialoguePages();
    expect(await screen.findByText(/娘娘今日亲来/)).toBeInTheDocument();
    expect(screen.queryByText('温声再问一句')).not.toBeInTheDocument();
    expect(screen.queryByText('借话轻轻试探')).not.toBeInTheDocument();
    expect(screen.queryByText('只把礼数做满')).not.toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '对话分支选项' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '下一句' })).not.toBeInTheDocument();
    expect(consortTurnCount).toBe(0);
  });

  it('妃嫔对话不会展示通用分支，也不会走关系判定链路', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    let consortTurnCount = 0;
    let judgeTurnCount = 0;
    const consortPayloads: Array<{ selectedOptionId?: string; selectedOptionLabel?: string }> = [];

    fetchMock.mockReset();
    fetchMock.mockImplementation(async (input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (requestUrl.endsWith('/api/v1/ai/relationship-judge')) {
        judgeTurnCount += 1;
        return {
          ok: true,
          json: async () => ({
            toneTag: 'friendly',
            favorDelta: 1,
            affectionDelta: 0,
            reason: '这句语气偏示好。',
            confidence: 0.8,
          }),
        } as Response;
      }

      if (requestUrl.endsWith('/api/v1/ai/consort-dialogue')) {
        consortTurnCount += 1;
        const rawBody =
          input instanceof Request ? await input.clone().text() : typeof init?.body === 'string' ? init.body : '';

        if (rawBody) {
          const parsedBody = JSON.parse(rawBody) as { selectedOptionId?: string; selectedOptionLabel?: string };
          consortPayloads.push({
            selectedOptionId: parsedBody.selectedOptionId,
            selectedOptionLabel: parsedBody.selectedOptionLabel,
          });
        }

        return {
          ok: true,
          json: async () =>
            consortTurnCount === 1
              ? {
                  mode: 'branch',
                  phase: 'continue',
                  speakerIdentity: '贵妃',
                  speakerName: '姚铃儿',
                  text: '姚铃儿将茶盏轻轻一转，笑意浅浅：“娘娘既来了，想来总有一句话要留给妾。”',
                  sceneHint: '她等你表态。',
                  options: [
                    { id: 'warm', label: '缓声示好', effectHint: '先把敌意压下半寸。', localToneTag: 'friendly' },
                    { id: 'probe', label: '顺势试探', effectHint: '借她的话摸清真实态度。', localToneTag: 'neutral' },
                  ],
                }
              : {
                  mode: 'line',
                  phase: 'finish',
                  speakerIdentity: '贵妃',
                  speakerName: '姚铃儿',
                  text: '姚铃儿听完这句，眼底那点锋芒终于收了些：“娘娘肯把话说到这个分寸，妾自然也会记得。”',
                  sceneHint: '这一轮回应已经落定。',
                  options: [],
                },
        } as Response;
      }

      throw new Error('offline');
    });

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'harem',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));

    await advanceDialoguePages();
    expect(await screen.findByText(/娘娘今日亲来/)).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: '对话分支选项' })).not.toBeInTheDocument();
    expect(judgeTurnCount).toBe(0);
    expect(consortTurnCount).toBe(0);
    expect(consortPayloads).toEqual([]);
  });

  it('御膳房选项点击后会保留上一句，直到本地回应返回', async () => {
    const fetchMock = vi.mocked(globalThis.fetch);
    let consortTurnCount = 0;

    fetchMock.mockReset();
    fetchMock.mockImplementation((input, init) => {
      const requestUrl = typeof input === 'string' ? input : input instanceof Request ? input.url : String(input);

      if (requestUrl.endsWith('/api/v1/ai/relationship-judge')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            toneTag: 'friendly',
            favorDelta: 1,
            affectionDelta: 0,
            reason: '这句语气偏示好。',
            confidence: 0.8,
          }),
        } as Response);
      }

      if (requestUrl.endsWith('/api/v1/ai/consort-dialogue')) {
        consortTurnCount += 1;

        if (consortTurnCount === 1) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              mode: 'branch',
              phase: 'continue',
              speakerIdentity: '布掌勺',
              speakerName: '布自游',
              text: '布自游拎着食盒从灶后转出来，低声笑道：“娘娘既肯走到这里，总该给我留一句能记住的话。”',
              sceneHint: '他等你表态。',
              options: [
                { id: 'warm', label: '放软语气示好', effectHint: '先把敌意压下半寸。', localToneTag: 'friendly' },
                { id: 'probe', label: '借食单试探他', effectHint: '借他的话摸清真实态度。', localToneTag: 'neutral' },
              ],
            }),
          } as Response);
        }

        return new Promise<Response>((_, reject) => {
          const signal = init?.signal;
          if (signal instanceof AbortSignal) {
            signal.addEventListener(
              'abort',
              () => {
                reject(new DOMException('Aborted', 'AbortError'));
              },
              { once: true },
            );
          }
        });
      }

      throw new Error('offline');
    });

    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '御膳房',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      consortInteractionMap: {},
      kitchenProgress: {
        strollCount: 3,
        buZiyouUnlocked: false,
        buZiyouMet: false,
        buZiyouFavor: 0,
        buZiyouAffinity: 0,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '闲逛' }));
    await advanceDialoguePages();
    const optionGroup = await screen.findByRole('group', { name: '对话分支选项' });
    fireEvent.click(await within(optionGroup).findByRole('button', { name: /放软语气示好/ }));

    await advanceDialoguePages();
    expect(await screen.findByText(/御膳房里不宜久留，这一轮先收着/)).toBeInTheDocument();
    expect(consortTurnCount).toBe(0);
  });

  it('特殊角色不会进入妃嫔名单', () => {
    const roster = buildInitialConcubineRoster('lanyinxuguo', [
      {
        id: 'custom-taohou',
        routeScope: 'all',
        portraitId: '太后',
        name: '太后',
        rankLabel: '太后',
        status: 'live',
        residence: '慈宁宫',
        stateLabel: '寻常',
        age: 52,
        familyBackground: '皇家',
        personality: '威严沉静',
        summary: '特殊角色，不应进入妃嫔总览名单。',
        source: 'custom',
        stats: {
          prestige: 999,
          favor: 0,
          familyInfluence: 100,
          health: 100,
          appearance: 100,
          relationToPlayer: 0,
          childrenCount: 0,
          ambition: 0,
          stress: 0,
          intrigue: 100,
          temperament: 100,
          affection: 0,
          fortune: 100,
        },
        allies: [],
        rivals: [],
      },
    ]);
    const names = roster.map((consort) => consort.name);

    expect(names).not.toContain('连翘');
    expect(names).not.toContain('杜娘');
    expect(names).not.toContain('娇娇');
    expect(names.some((name) => name.includes('太后'))).toBe(false);
  });

  it('结束本旬后会进入下一旬清晨并弹出娇娇通报，纪事页同步留档', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await finishOpeningGuide();

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '诵读经典' })).toBeInTheDocument();
      expect(screen.getByText(`体力：${STAMINA_INITIAL_PER_XUN}`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '诵读经典' }));

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（上午）')).toBeInTheDocument();
      expect(screen.getByText(`体力：${STAMINA_INITIAL_PER_XUN - 2}`)).toBeInTheDocument();
    });
    await clickDialogueAdvance();

    useGameFlowStore.setState((flow) => ({
      ...flow,
      state: {
        ...flow.state,
        favor: 1,
      },
      nightlyService: {
        ...flow.nightlyService,
        queuedRolls: {
          alone: 100,
          player: 100,
          pool: 1,
          interest: 60,
          pregnancy: 100,
        },
      },
    }));

    fireEvent.click(screen.getByRole('button', { name: '结束本旬' }));

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（夜晚）')).toBeInTheDocument();
      expect(screen.getAllByLabelText('夜晚侍寝通报').length).toBeGreaterThan(0);
    });

    await clickDialogueAdvance();

    expect(await screen.findByLabelText('一夜过去')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('1年1月2旬（清晨）')).toBeInTheDocument();
        expect(screen.getByText(`体力：${STAMINA_INITIAL_PER_XUN}`)).toBeInTheDocument();
        expect(screen.getByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
        expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
      },
      { timeout: 3500 },
    );
    expect(useGameFlowStore.getState().settlementReports.filter((report) => report.title === '1年1月第2旬清晨通报')).toHaveLength(1);

    await clickDialogueAdvance();

    await waitFor(() => {
      expect(screen.queryByText(/1年1月第2旬清晨通报/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
    });
    expect(useGameFlowStore.getState().settlementReports.filter((report) => report.title === '1年1月第2旬清晨通报')).toHaveLength(1);

    fireEvent.click(screen.getByRole('button', { name: '纪事' }));
    fireEvent.click(await screen.findByRole('button', { name: '事件' }));

    expect(await screen.findByText('1年1月第2旬清晨通报')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`体力按新旬口径恢复为${STAMINA_INITIAL_PER_XUN}`))).toBeInTheDocument();
  }, 10000);

  it('普通行动推进到夜晚时，会先展示本次行动结果，再展示非主角侍寝通报', async () => {
    useGameFlowStore.setState((flow) => ({
      ...flow,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      state: {
        ...flow.state,
        favor: 1,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...flow.state.flags,
          bedchamberIntroShown: true,
        },
      },
      hiddenStats: {
        ...flow.hiddenStats,
        favor: 1,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 4,
        slot: '傍晚',
        slotProgress: 0,
      },
      nightlyService: {
        ...flow.nightlyService,
        queuedRolls: {
          alone: 100,
          player: 100,
          pool: 1,
          interest: 60,
          pregnancy: 100,
        },
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '殿内小憩' }));

    const actionDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(actionDialogue).getByText(/殿内小憩告一段落/)).toBeInTheDocument();
    expect(screen.queryByLabelText('夜晚侍寝通报')).not.toBeInTheDocument();

    await clickDialogueAdvance();

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（夜晚）')).toBeInTheDocument();
      expect(screen.getAllByLabelText('夜晚侍寝通报').length).toBeGreaterThan(0);
    });

    await clickDialogueAdvance();

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（夜晚）')).toBeInTheDocument();
      expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '殿内小憩' })).toBeInTheDocument();
    });
  }, 10000);

  it('结束本旬触发主角侍寝时，会先进养心殿互动，侍寝后再黑幕到清晨通报', async () => {
    useGameFlowStore.setState((flow) => ({
      ...flow,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...flow.state,
        favor: 80,
        trueHeart: 35,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...flow.state.flags,
          bedchamberIntroShown: true,
        },
      },
      hiddenStats: {
        ...flow.hiddenStats,
        favor: 80,
        trueHeart: 35,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
      nightlyService: {
        ...flow.nightlyService,
        playerNightFavorGauge: 100,
        queuedRolls: {
          alone: 100,
          player: 1,
          pool: 1,
          interest: 60,
          pregnancy: 100,
        },
      },
    }));

    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '结束本旬' }));

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（夜晚）')).toBeInTheDocument();
      expect(screen.getAllByLabelText('侍寝太监通报').length).toBeGreaterThan(0);
    });

    await clickDialogueAdvance();
    await clickDialogueAdvance();

    const actionPanel = await screen.findByLabelText('养心殿侍寝操作');
    fireEvent.click(within(actionPanel).getByRole('button', { name: /鼓瑟/ }));
    await clickDialogueAdvance();

    fireEvent.click(await screen.findByRole('button', { name: /吟诗/ }));
    await clickDialogueAdvance();

    fireEvent.click(await screen.findByRole('button', { name: /温言/ }));
    fireEvent.click(await screen.findByRole('button', { name: /温柔/ }));
    await clickDialogueAdvance();

    await waitFor(() => {
      expect(screen.getAllByLabelText('正式侍寝剧情').length).toBeGreaterThan(0);
    });
    await clickDialogueAdvance();

    expect(await screen.findByLabelText('一夜过去')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('1年1月2旬（清晨）')).toBeInTheDocument();
        expect(screen.getByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
        expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
        expect((container.querySelector('.chamber-main__background') as HTMLElement).style.backgroundImage).toContain(
          '/assets/routes/home/home_yeting_dawn%20till%20dask.png',
        );
      },
      { timeout: 3500 },
    );
  });

  it('从妙音堂触发主角侍寝后，黑幕结束后再显示清晨通报', async () => {
    useGameFlowStore.setState((flow) => ({
      ...flow,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '妙音堂',
      state: {
        ...flow.state,
        favor: 80,
        trueHeart: 35,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...flow.state.flags,
          bedchamberIntroShown: true,
        },
      },
      hiddenStats: {
        ...flow.hiddenStats,
        favor: 80,
        trueHeart: 35,
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 5,
        slot: '夜晚',
        slotProgress: 0,
      },
      nightlyService: {
        ...flow.nightlyService,
        pendingEvent: {
          id: 'nightly-service-player-miaoyin',
          timeKey: '1-1-1',
          year: 1,
          month: 1,
          xun: 1,
          outcome: 'player-service',
          playerName: flow.state.name,
          rankLabel: flow.hiddenStats.initialRank ?? '宫妃',
          initialInterest: 60,
          currentInterest: 60,
          interactionCount: 0,
          maxInteractions: 3,
          selectedActionIds: [],
          stage: 'notice',
          pregnancyRoll: 100,
        },
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    render(<App />);

    await clickDialogueAdvance();
    await clickDialogueAdvance();

    const actionPanel = await screen.findByLabelText('养心殿侍寝操作');
    fireEvent.click(within(actionPanel).getByRole('button', { name: /鼓瑟/ }));
    await clickDialogueAdvance();

    fireEvent.click(await screen.findByRole('button', { name: /吟诗/ }));
    await clickDialogueAdvance();

    fireEvent.click(await screen.findByRole('button', { name: /温言/ }));
    fireEvent.click(await screen.findByRole('button', { name: /温柔/ }));
    await clickDialogueAdvance();

    await waitFor(() => {
      expect(screen.getAllByLabelText('正式侍寝剧情').length).toBeGreaterThan(0);
    });
    await clickDialogueAdvance();

    expect(await screen.findByLabelText('一夜过去')).toBeInTheDocument();

    await waitFor(
      () => {
        expect(screen.getByText('1年1月2旬（清晨）')).toBeInTheDocument();
        expect(screen.getByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
        expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
      },
      { timeout: 3500 },
    );

    await clickDialogueAdvance();
  }, 8000);

  it.each(['御膳房', '宝华殿', '华清池', '太医院', '建章宫'] as const)(
    '从%s触发主角侍寝后，黑幕结束后再显示清晨通报',
    async (locationName) => {
      useGameFlowStore.setState((flow) => ({
        ...flow,
        currentView: 'bedchamber',
        scene: 'activity',
        activeChamberPanel: 'main',
        activeMapLocation: locationName,
        state: {
          ...flow.state,
          favor: 80,
          trueHeart: 35,
          stamina: STAMINA_INITIAL_PER_XUN,
          flags: {
            ...flow.state.flags,
            bedchamberIntroShown: true,
          },
        },
        hiddenStats: {
          ...flow.hiddenStats,
          favor: 80,
          trueHeart: 35,
        },
        time: {
          year: 1,
          month: 1,
          xun: 1,
          slotIndex: 5,
          slot: '夜晚',
          slotProgress: 0,
        },
        nightlyService: {
          ...flow.nightlyService,
          pendingEvent: {
            id: `nightly-service-player-${locationName}`,
            timeKey: '1-1-1',
            year: 1,
            month: 1,
            xun: 1,
            outcome: 'player-service',
            playerName: flow.state.name,
            rankLabel: flow.hiddenStats.initialRank ?? '宫妃',
            initialInterest: 60,
            currentInterest: 60,
            interactionCount: 0,
            maxInteractions: 3,
            selectedActionIds: [],
            stage: 'notice',
            pregnancyRoll: 100,
          },
        },
        settlementReports: [],
        latestSettlementReportId: undefined,
        lastSeenSettlementReportId: undefined,
      }));

      render(<App />);

      await clickDialogueAdvance();
      await clickDialogueAdvance();

      const actionPanel = await screen.findByLabelText('养心殿侍寝操作');
      fireEvent.click(within(actionPanel).getByRole('button', { name: /鼓瑟/ }));
      await clickDialogueAdvance();

      fireEvent.click(await screen.findByRole('button', { name: /吟诗/ }));
      await clickDialogueAdvance();

      fireEvent.click(await screen.findByRole('button', { name: /温言/ }));
      fireEvent.click(await screen.findByRole('button', { name: /温柔/ }));
      await clickDialogueAdvance();

      await waitFor(() => {
        expect(screen.getAllByLabelText('正式侍寝剧情').length).toBeGreaterThan(0);
      });
      await clickDialogueAdvance();

      expect(await screen.findByLabelText('一夜过去')).toBeInTheDocument();

      await waitFor(
        () => {
          expect(screen.getByText('1年1月2旬（清晨）')).toBeInTheDocument();
          expect(screen.getByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
          expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
        },
        { timeout: 3500 },
      );
    },
  );

  it('跨月时会生成月初通报并按月俸结算银两', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        family: '未知',
        silver: 1000,
        favor: 50,
        prestige: 1000,
        monthlyExpenseStrategy: 'balanced',
        nextMonthlyExpenseStrategy: undefined,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          attributeStatsFinalized: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        favor: 50,
        prestige: 1000,
      },
      time: {
        year: 1,
        month: 1,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(1);
    const flow = useGameFlowStore.getState();
    const latestReport = flow.settlementReports.at(-1);

    expect(flow.time).toMatchObject({
      year: 1,
      month: 2,
      xun: 1,
      slot: '清晨',
    });
    expect(flow.state.silver).toBe(1080);
    expect(flow.hiddenStats.silver).toBe(1080);
    expect(latestReport).toMatchObject({
      kind: 'month',
      title: '1年2月月初通报',
    });
    expect(latestReport?.lines).toContain('本月月俸：160');
    expect(latestReport?.lines).toContain('本月用度：80');
    expect(latestReport?.lines).toContain('当前银两：1080');
  });

  it('跨月时按本月用度策略扣银两并改变声望和健康，下月策略次月生效', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        family: '',
        silver: 1000,
        favor: 50,
        prestige: 1000,
        monthlyExpenseStrategy: 'frugal',
        nextMonthlyExpenseStrategy: 'luxury',
        stats: {
          ...state.state.stats,
          health: 50,
        },
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          attributeStatsFinalized: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        favor: 50,
        prestige: 1000,
      },
      time: {
        year: 1,
        month: 1,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(1);
    const flow = useGameFlowStore.getState();
    const latestReport = flow.settlementReports.at(-1);

    expect(flow.state.silver).toBe(1120);
    expect(flow.state.prestige).toBe(995);
    expect(flow.hiddenStats.prestige).toBe(995);
    expect(flow.state.stats.health).toBe(49);
    expect(flow.state.monthlyExpenseStrategy).toBe('luxury');
    expect(flow.state.nextMonthlyExpenseStrategy).toBeUndefined();
    expect(latestReport?.lines).toContain('当前位份：婕好');
    expect(latestReport?.lines).toContain('当前声望：995 / 1100');
    expect(latestReport?.summary).not.toContain('位分复核');
    expect(latestReport?.summary).not.toContain('下月提点');
  });

  it('跨月时按家世与父亲官职结算自然声望', () => {
    const runMonthlySettlement = (family: string) => {
      resetFlowStore();
      useGameFlowStore.setState((state) => ({
        ...state,
        currentView: 'bedchamber',
        scene: 'activity',
        activeChamberPanel: 'main',
        routeId: 'lanyinxuguo',
        state: {
          ...state.state,
          routeId: 'lanyinxuguo',
          family,
          silver: 1000,
          favor: 50,
          prestige: 1000,
          monthlyExpenseStrategy: 'balanced',
          nextMonthlyExpenseStrategy: undefined,
          flags: {
            ...state.state.flags,
            bedchamberIntroShown: true,
          },
        },
        hiddenStats: {
          ...state.hiddenStats,
          silver: 1000,
          favor: 50,
          prestige: 1000,
        },
        time: {
          year: 1,
          month: 1,
          xun: 3,
          slotIndex: 6,
          slot: '深夜',
          slotProgress: 0,
        },
        settlementReports: [],
        latestSettlementReportId: undefined,
        lastSeenSettlementReportId: undefined,
      }));

      useGameFlowStore.getState().advanceTime(1);
      return useGameFlowStore.getState();
    };

    expect(runMonthlySettlement('镇国公嫡女').state.prestige).toBe(1013);
    expect(runMonthlySettlement('罪臣之后').state.prestige).toBe(995);
  });

  it('家族接济花费银两并在季度结算额外声望', () => {
    const defaultFavorTier = getFavorTierByValue(50);
    resetFlowStore();
    useGameFlowStore.setState((state) => ({
      ...state,
      state: {
        ...state.state,
        family: '未知',
        silver: 1000,
        prestige: 1000,
        monthlyExpenseStrategy: 'balanced',
        nextMonthlyExpenseStrategy: undefined,
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        prestige: 1000,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '婕好',
      },
      time: {
        year: 1,
        month: 6,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
    }));

    const reliefResult = (useGameFlowStore.getState() as any).spendFamilyAid();

    expect(reliefResult).toEqual({ success: true, message: '已送出家族接济。' });
    expect(useGameFlowStore.getState().state.silver).toBe(880);
    expect(useGameFlowStore.getState().state.familyAidBonus).toBe(10);

    useGameFlowStore.getState().advanceTime(1);

    expect(useGameFlowStore.getState().state.prestige).toBe(1012);
    expect(useGameFlowStore.getState().hiddenStats.prestige).toBe(1012);
    expect(useGameFlowStore.getState().state.familyAidBonus).toBe(0);
  });

  it('寝殿家族事务显示设定内的家族接济而非占位方案', async () => {
    resetFlowStore();
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeAffairsSource: '宫斗事务',
      state: {
        ...state.state,
        silver: 1000,
        prestige: 1000,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        prestige: 1000,
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(await screen.findByRole('button', { name: '家族事务' }));

    expect(await screen.findByText('家族事务')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送出接济' })).toBeInTheDocument();
    expect(screen.getByText('120 银两')).toBeInTheDocument();
    expect(screen.queryByText('父族旧部')).not.toBeInTheDocument();
    expect(screen.queryByText(/当前仅保留计划/)).not.toBeInTheDocument();
  });

  it('寝殿调整用度会登记为下月策略', () => {
    const lanyinRoute = buildRouteProfiles().find((route) => route.id === 'lanyinxuguo')!;
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      routeId: 'lanyinxuguo',
      selectedRoute: {
        ...lanyinRoute,
        defaultName: state.state.name,
        familyDisplay: state.state.family,
        residenceDisplay: state.state.residenceName,
        baseState: {},
        hiddenStats: state.hiddenStats,
      },
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        monthlyExpenseStrategy: 'balanced',
        nextMonthlyExpenseStrategy: undefined,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
        },
      },
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
      nightlyService: {
        playerNightFavorGauge: 0,
        emperorMood: 40,
        reports: [],
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '调整用度' }));
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).toBeInTheDocument();
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).toHaveClass('global-dialogue-stage__options');
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).toHaveClass('palace-dialogue-box__options');
    expect(screen.getByText('节衣缩食').closest('button')).toHaveClass('palace-dialogue-box__option');
    expect(screen.getByText('量入为出').closest('button')).toHaveClass('palace-dialogue-box__option');
    expect(screen.getByText('先问清用度').closest('button')).toHaveClass('palace-dialogue-box__option');
    const luxuryStrategyButton = screen.getByRole('button', { name: '锦衣玉食' });
    expect(luxuryStrategyButton).toHaveClass('palace-dialogue-box__option');
    fireEvent.click(luxuryStrategyButton);

    expect(useGameFlowStore.getState().state.nextMonthlyExpenseStrategy).toBe('luxury');
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).not.toBeInTheDocument();
  });

  it('寝殿调整用度说明由娇娇解释三档含义后返回选择', async () => {
    const lanyinRoute = buildRouteProfiles().find((route) => route.id === 'lanyinxuguo')!;
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      routeId: 'lanyinxuguo',
      selectedRoute: {
        ...lanyinRoute,
        defaultName: state.state.name,
        familyDisplay: state.state.family,
        residenceDisplay: state.state.residenceName,
        baseState: {},
        hiddenStats: state.hiddenStats,
      },
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        monthlyExpenseStrategy: 'balanced',
        nextMonthlyExpenseStrategy: undefined,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '吩咐娇娇' }));
    fireEvent.click(screen.getByRole('button', { name: '调整用度' }));
    fireEvent.click(screen.getByRole('button', { name: '先问清用度' }));

    const expenseExplanationDialogue = await screen.findByLabelText('寝殿对白');
    expect(expenseExplanationDialogue).toBeInTheDocument();
    expect(within(expenseExplanationDialogue).getByText(/这三档说的是每月固定用度/)).toBeInTheDocument();
    expect(within(expenseExplanationDialogue).getByText(/· 娇娇/)).toBeInTheDocument();
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).not.toBeInTheDocument();

    await clickDialogueAdvance();

    expect(document.querySelector('.chamber-main__expense-choice-overlay')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '节衣缩食' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '先问清用度' })).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.nextMonthlyExpenseStrategy).toBeUndefined();
  });

  it('跨月时会按位分推进更新住处，并在月报里留下迁宫记录', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        family: '未知',
        residenceName: '椒房殿',
        silver: 1000,
        favor: 45,
        prestige: 1800,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        favor: 45,
        prestige: 1800,
        initialRank: '皇后',
      },
      time: {
        year: 1,
        month: 1,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    useGameFlowStore.getState().advanceTime(1);
    const flow = useGameFlowStore.getState();
    const latestReport = flow.settlementReports.at(-1);

    expect(flow.hiddenStats.initialRank).toBe('德妃 / 淑妃 / 贤妃');
    expect(flow.state.residenceName).toBe('长春宫');
    expect(latestReport?.summary).toContain('当前位份：德妃 / 淑妃 / 贤妃');
    expect(latestReport?.summary).toContain('当前声望：1800 / 2100');
  });

  it('跨月晋升会先显示太监晋升通报，再显示普通月初通报', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        family: '未知',
        residenceName: '储秀宫西偏殿',
        silver: 1000,
        favor: 45,
        prestige: 650,
        monthlyExpenseStrategy: 'balanced',
        nextMonthlyExpenseStrategy: undefined,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          attributeStatsFinalized: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        favor: 45,
        prestige: 650,
        initialRank: '官女子',
      },
      time: {
        year: 1,
        month: 1,
        xun: 3,
        slotIndex: 6,
        slot: '深夜',
        slotProgress: 0,
      },
      settlementReports: [],
      latestSettlementReportId: undefined,
      lastSeenSettlementReportId: undefined,
    }));

    render(<App />);

    act(() => {
      useGameFlowStore.getState().advanceTime(1);
    });

    const flow = useGameFlowStore.getState();
    expect(flow.hiddenStats.initialRank).not.toBe('官女子');
    expect(flow.settlementReports[0]).toMatchObject({
      kind: 'promotion',
      title: '晋封旨意',
    });
    expect(flow.settlementReports[1]).toMatchObject({
      kind: 'month',
      title: '1年2月月初通报',
    });

    const summonNotice = await screen.findByLabelText('晋升太监通报');
    expect(within(summonNotice).getByText(/圣旨到/)).toBeInTheDocument();
    expect(screen.queryByLabelText('娇娇旬月通报')).not.toBeInTheDocument();

    await clickDialogueAdvance();

    const promotionNotice = await screen.findByLabelText('晋升太监通报');
    expect(within(promotionNotice).getByLabelText('圣旨题签')).toBeInTheDocument();
    expect(within(promotionNotice).getByText('宫历元年二月上旬')).toBeInTheDocument();
    expect(within(promotionNotice).getByText(/由官女子晋为/)).toBeInTheDocument();
    expect(within(promotionNotice).getByText(new RegExp(flow.hiddenStats.initialRank ?? ''))).toBeInTheDocument();
    fireEvent.animationEnd(within(promotionNotice).getByLabelText('晋封圣旨'), { animationName: 'promotion-edict-unfold' });
    expect(screen.queryByLabelText('娇娇旬月通报')).not.toBeInTheDocument();

    fireEvent.click(promotionNotice);
    if (!screen.queryByLabelText('娇娇旬月通报')) {
      await waitFor(() => expect(screen.getAllByLabelText('夜晚侍寝通报').length).toBeGreaterThan(0));
      await clickDialogueAdvance();
    }

    expect(await screen.findByLabelText('娇娇旬月通报')).toBeInTheDocument();
  });

  it('纪事诏令页会分条展示月结算明细', () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'chronicle',
      state: {
        ...state.state,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
        },
      },
      settlementReports: [
        {
          id: 'month-report-1',
          kind: 'month',
          year: 1,
          month: 2,
          xun: 1,
          title: '1年2月月初通报',
          summary: '本月月俸：160 本月用度：80 当前银两：1080 当前位份：婕好 当前声望：1000 / 1100 宫斗案件：本月暂无结案或新调查。',
          lines: [
            '本月月俸：160',
            '本月用度：80',
            '当前银两：1080',
            '当前位份：婕好',
            '当前声望：1000 / 1100',
            '宫斗案件：本月暂无结案或新调查。',
          ],
        },
      ],
    }));

    render(<App />);

    const reportList = screen.getByRole('list', { name: '月报明细' });
    expect(within(reportList).getByText('当前位份：婕好')).toBeInTheDocument();
    expect(within(reportList).getByText('当前声望：1000 / 1100')).toBeInTheDocument();
    expect(within(reportList).getByText('宫斗案件：本月暂无结案或新调查。')).toBeInTheDocument();
  });

  it('请平安脉不消耗体力且每旬限一次，殿内小憩可恢复体力', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        name: '谢令仪',
        residenceName: '椒房殿',
        openingTendency: '节衣缩食',
        stamina: STAMINA_INITIAL_PER_XUN,
        prestige: 2500,
        favor: 50,
        flags: {
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        silver: 1000,
        prestige: 2500,
        stress: 30,
        favor: 50,
        trueHeart: 35,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
        initialRank: '皇后',
      },
      selectedRoute: undefined,
      bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
      concubineRouteId: 'lanyinxuguo',
      concubines: buildInitialConcubineRoster('lanyinxuguo'),
      inventory: cloneInitialInventory(),
      time: {
        year: 1,
        month: 1,
        xun: 1,
        slotIndex: 0,
        slot: '清晨',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByRole('button', { name: '诵读经典' })).toBeInTheDocument();
    const healthBeforePulse = Number(useGameFlowStore.getState().state.stats.health ?? 0);

    fireEvent.click(screen.getByRole('button', { name: '请平安脉' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
      expect(useGameFlowStore.getState().state.stats.health).toBe(healthBeforePulse + 5);
      expect(screen.getByText('1年1月1旬（上午）')).toBeInTheDocument();
    });
    await clickDialogueAdvance();

    fireEvent.click(screen.getByRole('button', { name: '请平安脉' }));
    expect(await screen.findByText(/今日已经请过平安脉/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().time.slot).toBe('上午');
    await clickDialogueAdvance();

    fireEvent.click(screen.getByRole('button', { name: '习舞奏乐' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN - 2);
    });
    await clickDialogueAdvance();

    fireEvent.click(screen.getByRole('button', { name: '殿内小憩' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN + 1);
      expect(screen.getByText('1年1月1旬（下午）')).toBeInTheDocument();
    });
  });

  it('寝殿日常行动会显示对应剧情反馈', async () => {
    render(<App />);

    await clickStartNewGame();
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));
    await finishOpeningGuide();

    fireEvent.click(await screen.findByRole('button', { name: '泼墨作画' }));
    await advanceFirstPaintingWork();

    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(chamberDialogue).getByText(/砚/)).toBeInTheDocument();
    expect(within(chamberDialogue).getByText(/泼墨作画/)).toBeInTheDocument();
    expect(within(chamberDialogue).queryByText(/丹青 \+1/)).not.toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(screen.getByText('场景旁白 · 椒房殿')).toBeInTheDocument();
  });

  it('字画作品只能通过泼墨作画进入对应制作面板', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        stamina: STAMINA_INITIAL_PER_XUN,
        stats: {
          ...state.state.stats,
          painting: 80,
          poetry: 70,
        },
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          attributeStatsFinalized: true,
        },
      },
      craftWorksProgress: {
        activeWorks: {},
      },
    }));

    render(<App />);

    expect(screen.queryByRole('button', { name: '作品管理' })).not.toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '泼墨作画' }));

    const craftPanel = await screen.findByLabelText('字画制作面板');
    expect(within(craftPanel).getByRole('heading', { name: '字画制作' })).toBeInTheDocument();
    expect(within(craftPanel).queryByRole('button', { name: /绣花/ })).not.toBeInTheDocument();
    expect(within(craftPanel).getByRole('button', { name: /练习/ })).toBeInTheDocument();
    expect(within(craftPanel).queryByRole('heading', { name: '已完成库存' })).not.toBeInTheDocument();

    fireEvent.click(within(craftPanel).getByRole('button', { name: /才思泉涌/ }));
    await waitFor(() => expect(useGameFlowStore.getState().craftWorksProgress.activeWorks).not.toEqual({}));
    const inspiredWork = Object.values(useGameFlowStore.getState().craftWorksProgress.activeWorks)[0];
    expect(inspiredWork).toBeDefined();
    const inspirationDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(inspirationDialogue).getByText(new RegExp(`《${inspiredWork?.name ?? ''}》`))).toBeInTheDocument();

    await clickDialogueAdvance();
    fireEvent.click(await screen.findByRole('button', { name: '泼墨作画' }));
    const reopenedCraftPanel = await screen.findByLabelText('字画制作面板');

    await waitFor(() => {
      expect(within(reopenedCraftPanel).getByText(/完成度 0%/)).toBeInTheDocument();
    });
    fireEvent.click(within(reopenedCraftPanel).getByRole('button', { name: new RegExp(inspiredWork?.name ?? '') }));
    expect(Object.values(useGameFlowStore.getState().craftWorksProgress.activeWorks)[0]?.actionCount).toBe(1);
    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    fireEvent.click(within(chamberDialogue).getByLabelText('对话正文，点击翻页'));
    expect(within(chamberDialogue).getByText(new RegExp(`${inspiredWork?.name ?? ''}完成度`))).toBeInTheDocument();
  });

  it('调香练习显示调香行动剧情而不是只剩数值 toast', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...state.state,
        stamina: STAMINA_INITIAL_PER_XUN,
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
          attributeStatsFinalized: true,
        },
      },
    }));

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '调制香薰' }));
    const craftPanel = await screen.findByLabelText('调香制作面板');
    fireEvent.click(within(craftPanel).getByRole('button', { name: '练习' }));

    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(chamberDialogue).getByText(/香材分列小案/)).toBeInTheDocument();
    expect(within(chamberDialogue).getByText(/调制香薰/)).toBeInTheDocument();
    expect(within(chamberDialogue).queryByText(/容貌 \+1/)).not.toBeInTheDocument();
  });

  it('回宫反馈收起后不会覆盖后续寝殿行动剧情', async () => {
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      mapEventText: '宫道绕过一重影壁，你扶着娇娇的手回到椒房殿，殿内茶炉还温着。',
      state: {
        ...state.state,
        name: '谢令仪',
        residenceName: '椒房殿',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
    }));

    render(<App />);

    expect(await screen.findByText(/回到椒房殿/)).toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(screen.getByText('场景旁白 · 椒房殿')).toBeInTheDocument();
    await clickDialogueAdvance();
    fireEvent.click(await screen.findByRole('button', { name: '泼墨作画' }));
    await advanceFirstPaintingWork();

    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(chamberDialogue).getByText(/砚/)).toBeInTheDocument();
    expect(within(chamberDialogue).queryByText(/回到椒房殿/)).not.toBeInTheDocument();
  });

  it('进入建章宫后先显示空闲入口，选择拜见太后后进入太后交互', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      activeMapLocation: '建章宫',
      routeId: 'lanyinxuguo',
      state: {
        ...state.state,
        routeId: 'lanyinxuguo',
        openingTendency: '节衣缩食',
        flags: {
          ...state.state.flags,
          bedchamberIntroShown: true,
          mapGuideFinished: true,
        },
      },
      hiddenStats: {
        ...state.hiddenStats,
        favor: 50,
        favorLabel: defaultFavorTier.label,
        favorColor: defaultFavorTier.color,
      },
    }));

    const { container } = render(<App />);

    expect(await screen.findByLabelText('建章宫场景')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '拜见太后' }));

    expect(await screen.findByText('建章宫 · 拜见太后')).toBeInTheDocument();
    expect((container.querySelector('.chamber-main__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/jianzhanggong_daytime.png',
    );
    expect(screen.getByRole('button', { name: '送礼问安' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '起身告辞' })).toBeInTheDocument();
    expect(screen.getByLabelText('太后常驻立绘')).toBeInTheDocument();
    expect(screen.getByText(/你需先依礼问安/)).toBeInTheDocument();
    expect(screen.queryByLabelText('建章宫太后对话框')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '送礼问安' }));

    const dowagerDialogue = await screen.findByLabelText('建章宫太后对话框');
    expect(dowagerDialogue).toBeInTheDocument();
    expect(screen.getByLabelText('太后常驻立绘')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送礼问安' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '起身告辞' })).toBeDisabled();
    await screen.findByText(/你上前奉礼问安后/);
    await clickDialogueOnce();
    await waitFor(() => {
      expect(screen.getByText(/肯记得来建章宫尽礼，是好事/)).toBeInTheDocument();
    });
  });
});
