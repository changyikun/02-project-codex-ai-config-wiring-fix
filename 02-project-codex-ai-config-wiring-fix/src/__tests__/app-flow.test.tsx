/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { CONSORT_DIALOGUE_TIMEOUT_MS } from '../ai/consortDialogueAgent';
import { InventoryPanelView } from '../components/chamber/ChamberUtilityViews';
import { GlobalDialogueStage } from '../components/dialogue/GlobalDialogueStage';
import { GlobalDialogue } from '../components/dialogue/PalaceDialogueBox';
import { getFavorTierByValue, STAMINA_INITIAL_PER_XUN } from '../config/constants';
import { GUIDE_TENDENCY_OPTIONS } from '../config/palaceUi';
import { buildInitialBondProfile } from '../game/data/bondPresets';
import { buildInitialConcubineRoster } from '../game/data/concubineRoster';
import { buildMusicScoreItem, cloneInitialInventory } from '../game/data/inventoryPresets';
import { buildRouteProfiles } from '../game/data/routeProfiles';
import { YINGLUOYETING_STORY_FLAGS } from '../game/lib/yingluoyetingStoryRuntime';
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
    bondProfile: buildInitialBondProfile('lanyinxuguo', '1-1-1'),
    concubineRouteId: 'lanyinxuguo',
    concubines: buildInitialConcubineRoster('lanyinxuguo'),
    customConsorts: [],
    inventory: cloneInitialInventory(),
    merchantLedger: {},
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

    expect(await screen.findByText('通关要求')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '确定' })).toBeInTheDocument();
  });

  it('开局三选项是用度策略，不再是一次性性格加成', () => {
    expect(GUIDE_TENDENCY_OPTIONS.map((option) => option.label)).toEqual(['节衣缩食', '量入为出', '锦衣玉食']);
    expect(GUIDE_TENDENCY_OPTIONS.map((option) => option.id)).toEqual(['frugal', 'balanced', 'luxury']);
    expect(GUIDE_TENDENCY_OPTIONS.every((option) => option.effects === undefined)).toBe(true);
  });

  it('对话正文逐字显示时点击文本框会立即补全', () => {
    const fullText = '她将手中茶盏轻轻搁下，抬眼望向你，像是终于肯把这一句话说完。';
    const onNextAction = vi.fn();

    const { container } = render(
      <GlobalDialogue
        characterIdentity="贵妃"
        characterName="姚铃儿"
        content={fullText}
        nextActionLabel="下一句"
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
        onSelectOption={vi.fn()}
        typewriter={false}
      />,
    );

    expect(screen.getByText(/冷宫门前的铜锁早已生锈/)).toBeInTheDocument();
    expect(screen.queryByText(/姑娘又来了/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '只收下残抄' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '继续' })).not.toBeInTheDocument();

    fireEvent.click(getDialoguePageTarget()!);

    expect(screen.getByText(/姑娘又来了/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '只收下残抄' })).toBeInTheDocument();
  });

  it('全局对话舞台按当前对白说话人切换立绘，不把原角色立绘误用于拆出的其他角色对白', () => {
    render(
      <GlobalDialogueStage
        sceneLabel="测试剧情舞台"
        portraitLabel="娇娇立绘"
        portrait={<img src="/assets/dialogue/jiaojiao-final.png" alt="娇娇" />}
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
            portrait: <img src="/assets/routes/portraits/yingluoyeting.png" alt="沉璧" />,
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
        portrait={<img src="/assets/dialogue/jiaojiao-final.png" alt="娇娇" />}
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
        nextActionLabel="下一句"
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

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
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
        residenceName: '掖庭院',
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

    render(<App />);

    expect(screen.getByText(/掖庭掌事/)).toBeInTheDocument();
    expect(screen.queryByText(/真正改命/)).not.toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();

    await clickDialogueAdvance();

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
    expect(await screen.findByText(/娇娇把木匣收进柜中/)).toBeInTheDocument();
    expect(screen.queryByText(/今日要先读书、休养/)).not.toBeInTheDocument();

    await clickDialogueOnce();

    expect(await screen.findByAltText('娇娇')).toBeInTheDocument();
    expect(await screen.findByText(/今日要先读书、休养/)).toBeInTheDocument();
    expect(screen.queryByText(/娇娇把木匣收进柜中/)).not.toBeInTheDocument();
    expect(screen.getByText('节衣缩食')).toBeInTheDocument();
    expect(screen.getByText('量入为出')).toBeInTheDocument();
    expect(screen.getByText('锦衣玉食')).toBeInTheDocument();
  });

  it('可从开场引导进入地图，再进入寝殿', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
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
      expect(screen.getByText(/诵读经典/)).toBeInTheDocument();
      expect(screen.queryByText(/更换装扮/)).not.toBeInTheDocument();
    });
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
        month: 1,
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

  it('开场本地 fallback 已显示时不会被后台 AI loading 锁住', async () => {
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
    expect(screen.queryByRole('button', { name: '杜娘' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '购买' }));
    expect(await screen.findByRole('dialog', { name: '杜娘购买弹窗' })).toBeInTheDocument();
    const purchaseButtons = await screen.findAllByRole('button', { name: /^购买 / });
    expect(purchaseButtons.length).toBeGreaterThanOrEqual(8);
    expect(purchaseButtons.length).toBeLessThanOrEqual(10);

    fireEvent.click(screen.getByRole('button', { name: '购买 缠枝香囊' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.silver).toBe(930);
      expect(useGameFlowStore.getState().inventory.find((item) => item.itemId === 'embroidered-sachet')?.quantity).toBe(3);
      expect(screen.getByText('当前银两：930')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '售卖' }));
    expect(await screen.findByRole('dialog', { name: '杜娘售卖弹窗' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '售卖 缠枝香囊' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.silver).toBe(986);
      expect(useGameFlowStore.getState().inventory.find((item) => item.itemId === 'embroidered-sachet')?.quantity).toBe(2);
      expect(screen.getByText('当前银两：986')).toBeInTheDocument();
    });
  });

  it('杜娘闲谈先显示本地回应，不被后台 AI 请求锁住', async () => {
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

    const smallTalkButton = await screen.findByRole('button', { name: '闲谈' });
    fireEvent.click(smallTalkButton);

    await advanceDialoguePages();
    expect(await screen.findByText(/买卖归买卖，闲话归闲话/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '闲谈' })).not.toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '闲谈' }));
    await advanceDialoguePages();
    expect(await screen.findByText(/闲谈不入账|热闹|买卖归买卖/)).toBeInTheDocument();
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
        month: 1,
        xun: 1,
        slotIndex: 1,
        slot: '上午',
        slotProgress: 0,
      },
    }));

    render(<App />);

    expect(await screen.findByRole('button', { name: '报名' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '听曲' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '闲逛' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '连翘' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '报名' }));
    expect(await screen.findByRole('dialog', { name: '妙音堂曲谱报名' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /凤归云阙谱/ }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().musicHallProgress.signUpCount).toBe(1);
      expect(useGameFlowStore.getState().inventory.some((item) => item.itemId === 'score-phoenix-return')).toBe(false);
    });
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

    fireEvent.click(await screen.findByRole('button', { name: '御书房' }));
    fireEvent.click(screen.getByRole('button', { name: '朝堂事务' }));

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
    expect(await screen.findByRole('button', { name: '后宫总览' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '宫斗事务' })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '留在地图' }));

    fireEvent.click(await screen.findByRole('button', { name: '冷宫' }));
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

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '玉清宫' }));

    expect(await screen.findByRole('button', { name: /主殿[\s\S]*和亲入宫 乌兰托娅/ })).toBeInTheDocument();
  });

  it('点击地图上的当前宫殿会直接等同回宫，不再弹进入确认', async () => {
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

    fireEvent.click(await screen.findByRole('button', { name: '椒房殿' }));

    expect(await screen.findByText('诵读经典')).toBeInTheDocument();
    expect(screen.getByText('泼墨作画')).toBeInTheDocument();
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
    expect(screen.queryByRole('button', { name: '进入此处' })).not.toBeInTheDocument();
  });

  it('地图中的寝殿热点会随玩家当前住处动态变化', async () => {
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

    fireEvent.click(await screen.findByRole('button', { name: '储秀宫' }));

    expect(await screen.findByText('诵读经典')).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.residenceName).toBe('储秀宫');
    expect(screen.queryByRole('button', { name: '椒房殿' })).not.toBeInTheDocument();
  });

  it('外景场景左侧会保留外出并额外显示回宫按钮', async () => {
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

    expect(await screen.findByRole('button', { name: '外出' })).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '回宫' }));

    expect(await screen.findByText('诵读经典')).toBeInTheDocument();
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

  it('NPC 初遇对白 AI 长时间无响应时会回退到本地选项', async () => {
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
                  nextActionLabel: '下一句',
                  sceneHint: '他没有立刻表态，还在等你把这句继续说完。',
                  options: [],
                }
              : {
                  mode: 'branch',
                  phase: 'continue',
                  speakerIdentity: '御厨',
                  speakerName: '布自游',
                  text: '他这才把视线真正落到你身上，声音却仍压得不紧不慢：“行，那娘娘就说吧。您想试我的心，还是想借这灶火先暖一暖场面？”',
                  nextActionLabel: '收起',
                  sceneHint: '布自游已经把话口留出来了。',
                  options: [
                    { id: 'probe', label: '借食单试探他', effectHint: '顺着闲话探一探他真正站哪边。', fallbackToneTag: 'neutral' },
                    { id: 'warm', label: '放软语气示好', effectHint: '更容易稳稳攒一点好感。', fallbackToneTag: 'friendly' },
                    { id: 'tease', label: '故意留半句玩笑', effectHint: '若他愿接，最容易牵出暧昧余地。', fallbackToneTag: 'flirt' },
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

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await finishOpeningGuide();
    await waitFor(() => {
      expect(screen.getByText(/诵读经典/)).toBeInTheDocument();
      expect(screen.queryByText(/更换装扮/)).not.toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: '情缘' }));

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
      activeChamberPanel: 'main',
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

    fireEvent.click(screen.getByRole('button', { name: '情缘' }));

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
      activeChamberPanel: 'main',
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

    fireEvent.click(screen.getByRole('button', { name: '情缘' }));

    expect(await screen.findByText(/阿翎表面上仍守着故国旧识该有的分寸/)).toBeInTheDocument();
    expect(screen.queryByText('容安')).not.toBeInTheDocument();
  });

  it('特殊角色在对应触发旗标生效后会进入情缘面板', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: '情缘' }));

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

    fireEvent.click(screen.getByRole('button', { name: '宫斗事务' }));
    fireEvent.click(screen.getByRole('button', { name: '完成' }));

    expect((await screen.findAllByText(/当旬夜晚结算/)).length).toBeGreaterThan(0);
    expect(screen.queryByText(/案件已进入追查/)).not.toBeInTheDocument();
  });

  it('养心殿裁断面板可处理牵连玩家的调查案', async () => {
    const defaultFavorTier = getFavorTierByValue(80);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'yangxin',
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
          status: 'investigating',
          outcome: 'pending',
          investigationXunsElapsed: 0,
          convictionRate: 60,
          yangxinHearingRequired: true,
          summary: '内廷已开始追查源头。',
        },
      ],
    }));

    render(<App />);

    expect(await screen.findByLabelText('养心殿裁断面板')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /据理力争/ }));

    expect(await screen.findByText(/据理力争后自证有力/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().palaceStrifeCases[0].convictionRate).toBe(30);
  });

  it('纪事事件页会显示 NPC 宫斗案的发起者和目标', async () => {
    const defaultFavorTier = getFavorTierByValue(50);
    useGameFlowStore.setState((state) => ({
      ...state,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'chronicle',
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
          convictionRate: 64,
          summary: '内廷已开始追查源头。',
        },
      ],
    }));

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '事件' }));

    expect(await screen.findByText('贵妃 姚铃儿 -> 贵人 崔令蓉')).toBeInTheDocument();
    expect(screen.getByText(/散布流言：与人偷情/)).toBeInTheDocument();
  });

  it('寝殿嫔妃面板可切换状态并展示对应名单', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await finishOpeningGuide();

    await waitFor(() => {
      expect(screen.getByText(/诵读经典/)).toBeInTheDocument();
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
        ...cloneInitialInventory().filter((item) => item.itemId === 'embroidered-sachet'),
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
    fireEvent.click(await screen.findByRole('button', { name: '送礼' }));

    const giftPicker = await screen.findByLabelText('送礼选物');
    expect(within(giftPicker).getByRole('button', { name: /缠枝香囊/ })).toBeInTheDocument();
    expect(within(giftPicker).queryByRole('button', { name: /旧案残页/ })).not.toBeInTheDocument();
    expect(within(giftPicker).queryByRole('button', { name: /凤归云阙谱/ })).not.toBeInTheDocument();

    fireEvent.click(within(giftPicker).getByRole('button', { name: /缠枝香囊/ }));

    await advanceDialoguePages();
    expect(await screen.findByText(/娘娘这份心/)).toBeInTheDocument();
    expect(useGameFlowStore.getState().inventory.find((item) => item.itemId === 'embroidered-sachet')?.quantity).toBe(1);
    expect(useGameFlowStore.getState().concubines.find((item) => item.name === '姚铃儿')?.stats.relationToPlayer).toBe(-15);
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
        residenceName: '掖庭院',
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
        residenceName: '掖庭院',
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

    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: '长春宫' }));
    fireEvent.click(await screen.findByRole('button', { name: /主殿[\s\S]*姚铃儿/ }));

    expect(await screen.findByLabelText('贵妃 姚铃儿 日常对话')).toBeInTheDocument();
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN - 1);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(2);
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
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN - 1);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(2);

    const actionPanel = screen.getByLabelText('宫内互动操作');
    const actionLabels = within(actionPanel)
      .getAllByRole('button')
      .map((button) => button.textContent);

    expect(actionLabels).toEqual(['送礼', '试探', '拉拢', '返回']);
    expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN - 1);
    expect(useGameFlowStore.getState().time.slotIndex).toBe(2);
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
              nextActionLabel: '收起',
              sceneHint: '她等你表态。',
              options: [{ id: 'warm', label: '温声再问一句', effectHint: '先把敌意压下半寸。', fallbackToneTag: 'friendly' }],
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
                  nextActionLabel: '下一句',
                  sceneHint: '她还在试探你的来意。',
                  options: [],
                }
              : {
                  mode: 'branch',
                  phase: 'continue',
                  speakerIdentity: '贵妃',
                  speakerName: '姚铃儿',
                  text: '她话音落下时，眼尾那点笑意却并不真暖，反倒像是把门只开了半扇：“若娘娘真有心与我说句体己话，便看娘娘打算把这份好意放到什么分寸上。”',
                  nextActionLabel: '收起',
                  sceneHint: '她开始等你表态了。',
                  options: [
                    { id: 'warm', label: '缓声示好', effectHint: '先把敌意压下半寸。', fallbackToneTag: 'friendly' },
                    { id: 'probe', label: '顺势试探', effectHint: '借她的话摸清真实态度。', fallbackToneTag: 'neutral' },
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
                  nextActionLabel: '收起',
                  sceneHint: '她等你表态。',
                  options: [
                    { id: 'warm', label: '缓声示好', effectHint: '先把敌意压下半寸。', fallbackToneTag: 'friendly' },
                    { id: 'probe', label: '顺势试探', effectHint: '借她的话摸清真实态度。', fallbackToneTag: 'neutral' },
                  ],
                }
              : {
                  mode: 'line',
                  phase: 'finish',
                  speakerIdentity: '贵妃',
                  speakerName: '姚铃儿',
                  text: '姚铃儿听完这句，眼底那点锋芒终于收了些：“娘娘肯把话说到这个分寸，妾自然也会记得。”',
                  nextActionLabel: '收起',
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

  it('御膳房选项点击后会保留上一句，直到真实回应或 fallback 返回', async () => {
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
              nextActionLabel: '收起',
              sceneHint: '他等你表态。',
              options: [
                { id: 'warm', label: '放软语气示好', effectHint: '先把敌意压下半寸。', fallbackToneTag: 'friendly' },
                { id: 'probe', label: '借食单试探他', effectHint: '借他的话摸清真实态度。', fallbackToneTag: 'neutral' },
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

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await finishOpeningGuide();

    await waitFor(() => {
      expect(screen.getByText(/诵读经典/)).toBeInTheDocument();
      expect(screen.getByText(`体力：${STAMINA_INITIAL_PER_XUN}`)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '诵读经典' }));

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（上午）')).toBeInTheDocument();
      expect(screen.getByText(`体力：${STAMINA_INITIAL_PER_XUN - 1}`)).toBeInTheDocument();
    });

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

    await waitFor(() => {
      expect(screen.getByText('1年1月2旬（清晨）')).toBeInTheDocument();
      expect(screen.getByText(`体力：${STAMINA_INITIAL_PER_XUN}`)).toBeInTheDocument();
      expect(screen.getByText(/1年1月第2旬清晨通报/)).toBeInTheDocument();
    });
    expect(screen.getByLabelText('一夜过去')).toBeInTheDocument();

    await clickDialogueAdvance();

    await waitFor(() => {
      expect(screen.queryByText(/1年1月第2旬清晨通报/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '纪事' }));
    fireEvent.click(await screen.findByRole('button', { name: '事件' }));

    expect(await screen.findByText('1年1月第2旬清晨通报')).toBeInTheDocument();
    expect(screen.getByText(new RegExp(`体力按新旬口径恢复为${STAMINA_INITIAL_PER_XUN}`))).toBeInTheDocument();
  });

  it('普通行动推进到夜晚时，非主角侍寝通报后仍保留夜晚行动回合', async () => {
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

    fireEvent.click(screen.getByRole('button', { name: '殿内小酣' }));

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（夜晚）')).toBeInTheDocument();
      expect(screen.getAllByLabelText('夜晚侍寝通报').length).toBeGreaterThan(0);
    });

    await clickDialogueAdvance();

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（夜晚）')).toBeInTheDocument();
      expect(screen.queryByLabelText('一夜过去')).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: '殿内小酣' })).toBeInTheDocument();
    });
  });

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

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '结束本旬' }));

    await waitFor(() => {
      expect(screen.getByText('1年1月1旬（夜晚）')).toBeInTheDocument();
      expect(screen.getAllByLabelText('侍寝太监通报').length).toBeGreaterThan(0);
    });

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
      },
      { timeout: 2000 },
    );
  });

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
      },
      hiddenStats: {
        ...state.hiddenStats,
        silver: 1000,
        prestige: 1000,
      },
    }));

    render(<App />);

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

    fireEvent.click(screen.getByRole('button', { name: '调整用度' }));
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).toBeInTheDocument();
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).toHaveClass('global-dialogue-stage__options');
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).toHaveClass('palace-dialogue-box__options');
    expect(screen.getByText('节衣缩食').closest('button')).toHaveClass('palace-dialogue-box__option');
    expect(screen.getByText('量入为出').closest('button')).toHaveClass('palace-dialogue-box__option');
    const luxuryStrategyButton = screen.getByRole('button', { name: '锦衣玉食' });
    expect(luxuryStrategyButton).toHaveClass('palace-dialogue-box__option');
    fireEvent.click(luxuryStrategyButton);

    expect(useGameFlowStore.getState().state.nextMonthlyExpenseStrategy).toBe('luxury');
    expect(document.querySelector('.chamber-main__expense-choice-overlay')).not.toBeInTheDocument();
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

  it('请平安脉不消耗体力，殿内小酣可恢复体力', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));

    await finishOpeningGuide();

    await waitFor(() => {
      expect(screen.getByText(/诵读经典/)).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '请平安脉' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN);
      expect(screen.getByText('1年1月1旬（上午）')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '习舞奏乐' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN - 2);
    });

    fireEvent.click(screen.getByRole('button', { name: '殿内小酣' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.stamina).toBe(STAMINA_INITIAL_PER_XUN + 1);
      expect(screen.getByText('1年1月1旬（下午）')).toBeInTheDocument();
    });
  });

  it('寝殿日常行动会显示对应剧情反馈', async () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '开始新游戏' }));
    fireEvent.click(await screen.findByRole('button', { name: '确定' }));
    fireEvent.click(await screen.findByRole('button', { name: '确认进入剧情' }));
    await finishOpeningGuide();

    fireEvent.click(await screen.findByRole('button', { name: '泼墨作画' }));

    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(chamberDialogue).getByText(/砚/)).toBeInTheDocument();
    expect(within(chamberDialogue).getByText(/泼墨作画/)).toBeInTheDocument();
    expect(within(chamberDialogue).getByText(/丹青 \+2/)).toBeInTheDocument();
    expect(screen.queryByAltText('娇娇')).not.toBeInTheDocument();
    expect(screen.getByText('场景旁白 · 椒房殿')).toBeInTheDocument();
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

    const chamberDialogue = await screen.findByLabelText('寝殿对白');
    expect(within(chamberDialogue).getByText(/砚/)).toBeInTheDocument();
    expect(within(chamberDialogue).queryByText(/回到椒房殿/)).not.toBeInTheDocument();
  });

  it('进入建章宫后会显示太后对话场景与两项固定交互', async () => {
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

    render(<App />);

    expect(await screen.findByText('建章宫 · 拜见太后')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '送礼问安' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '起身告辞' })).toBeInTheDocument();
    expect(screen.getByText(/你需先依礼问安/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '送礼问安' }));

    await screen.findByText(/你上前奉礼问安后/);
    await clickDialogueOnce();
    await waitFor(() => {
      expect(screen.getByText(/肯记得来建章宫尽礼，是好事/)).toBeInTheDocument();
    });
  });
});
