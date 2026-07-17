/* @vitest-environment jsdom */

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { ConsortAudiencePanel } from '../components/consorts/ConsortAudiencePanel';
import { getFavorTierByValue, STAMINA_INITIAL_PER_XUN } from '../config/constants';
import { buildInitialBondProfile } from '../game/data/bondPresets';
import { buildInitialConcubineRoster } from '../game/data/concubineRoster';
import { cloneInitialInventory } from '../game/data/inventoryPresets';
import { useGameFlowStore } from '../game/store/gameFlowStore';
import {
  YINGLUOYETING_PRESTIGE_MAP_GUIDE_SCRIPT_ID,
  buildYingluoyetingPrestigeMapGuideSteps,
} from '../game/lib/yingluoyetingPrestigeMapGuideRuntime';
import {
  YINGLUOYETING_EVIDENCE_ITEM_IDS,
  YINGLUOYETING_STORY_FLAGS,
} from '../game/lib/yingluoyetingStoryRuntime';

const resetToYingluoyetingMap = () => {
  const favorTier = getFavorTierByValue(10);
  useGameFlowStore.setState((current) => ({
    ...current,
    currentView: 'map-main',
    scene: 'map',
    activeChamberPanel: 'main',
    activeMapLocation: undefined,
    activeAffairsSource: '宫斗事务',
    routeId: 'yingluoyeting',
    selectedRoute: undefined,
    briefing: '',
    dialogue: undefined,
    mapEventText: '',
    save: undefined,
    state: {
      ...current.state,
      name: '沉璧',
      family: '沈氏',
      routeId: 'yingluoyeting',
      residenceName: '储秀宫西偏殿',
      openingTendency: undefined,
      stamina: STAMINA_INITIAL_PER_XUN,
      silver: 50,
      prestige: 50,
      stress: 30,
      favor: 10,
      trueHeart: 0,
      flags: {
        mapGuideFinished: true,
      },
    },
    hiddenStats: {
      silver: 50,
      prestige: 50,
      stress: 30,
      favor: 10,
      trueHeart: 0,
      favorLabel: favorTier.label,
      favorColor: favorTier.color,
      initialRank: undefined,
    },
    time: {
      year: 1,
      month: 2,
      xun: 1,
      slotIndex: 0,
      slot: '清晨',
      slotProgress: 0,
    },
    bondProfile: buildInitialBondProfile('yingluoyeting', '1-2-1'),
    concubineRouteId: 'yingluoyeting',
    concubines: buildInitialConcubineRoster('yingluoyeting'),
    customConsorts: [],
    inventory: cloneInitialInventory(),
    merchantLedger: {},
    consortInteractionMap: {},
    settlementReports: [],
    palaceStrifeCases: [],
    latestSettlementReportId: undefined,
    lastSeenSettlementReportId: undefined,
    yingluoyetingPrestigeMapGuide: undefined,
  }));
};

const advanceDialoguePages = () => {
  let dialogueContent = document.querySelector<HTMLElement>('[data-dialogue-page-state="more"]');
  while (dialogueContent) {
    fireEvent.click(dialogueContent);
    dialogueContent = document.querySelector<HTMLElement>('[data-dialogue-page-state="more"]');
  }
};

describe('影落掖庭地图主线体验', () => {
  beforeEach(() => {
    resetToYingluoyetingMap();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows only the outside sidebar target during the prestige map guide chamber handoff', async () => {
    const guideSteps = buildYingluoyetingPrestigeMapGuideSteps({
      playerName: '沉璧',
      rankLabel: '官女子',
      age: 17,
    });
    const forceMapExitStepIndex = guideSteps.findIndex((step) => step.phase === 'force-map-exit');

    useGameFlowStore.setState((current) => ({
      ...current,
      currentView: 'bedchamber',
      scene: 'activity',
      activeChamberPanel: 'main',
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          openingGuideFinished: true,
          mapGuideFinished: true,
          yingluoyetingFirstMorningGuideFinished: true,
          [YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideStarted]: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideFinished]: false,
        },
      },
      yingluoyetingPrestigeMapGuide: {
        scriptId: YINGLUOYETING_PRESTIGE_MAP_GUIDE_SCRIPT_ID,
        active: true,
        stepIndex: forceMapExitStepIndex,
        prestigeAwarded: true,
      },
    }));

    const { container } = render(<App />);

    const outsideButton = screen.getByRole('button', { name: '外出' });
    expect(outsideButton).toHaveClass('is-guide-target');
    expect(container.querySelector('.chamber-main__prestige-guide-mask')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '殿内小憩' })).not.toBeInTheDocument();

    fireEvent.click(outsideButton);

    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().yingluoyetingPrestigeMapGuide?.stepIndex).toBe(forceMapExitStepIndex + 1);
    expect(await screen.findByLabelText('声望与大地图引导')).toBeInTheDocument();
    expect(screen.queryByLabelText('后宫主线剧情')).not.toBeInTheDocument();
    expect(screen.queryByText(/陈婉宁/)).not.toBeInTheDocument();
  });

  it('keeps Jianzhang Palace above the mask and the map sidebar below it during the prestige map guide', () => {
    const guideSteps = buildYingluoyetingPrestigeMapGuideSteps({
      playerName: '沉璧',
      rankLabel: '官女子',
      age: 17,
    });
    const forceJianzhanggongStepIndex = guideSteps.findIndex((step) => step.phase === 'force-jianzhanggong');

    useGameFlowStore.setState((current) => ({
      ...current,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapUtilityPanel: null,
      activeMapLocation: undefined,
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          mapGuideFinished: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideStarted]: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideFinished]: false,
        },
      },
      yingluoyetingPrestigeMapGuide: {
        scriptId: YINGLUOYETING_PRESTIGE_MAP_GUIDE_SCRIPT_ID,
        active: true,
        stepIndex: forceJianzhanggongStepIndex,
        prestigeAwarded: true,
      },
    }));

    const { container } = render(<App />);

    expect(container.querySelector('.map-main__prestige-guide-mask')).toBeInTheDocument();
    expect(container.querySelector('.palace-sidebar--map')).toHaveClass('is-prestige-guide-obscured');
    expect(container.querySelector('.map-main__hotspot-layer')).toHaveClass('is-prestige-guide-active');
    expect(screen.getByRole('button', { name: '建章宫' })).toHaveClass('is-guide-target');
  });

  it('does not auto-play the deprecated Chen Wanning meet after the prestige map guide has started', async () => {
    useGameFlowStore.setState((current) => ({
      ...current,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          mapGuideFinished: true,
          [YINGLUOYETING_STORY_FLAGS.openingHaremFirstMeetPending]: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideStarted]: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideFinished]: true,
        },
      },
      yingluoyetingPrestigeMapGuide: undefined,
    }));

    render(<App />);

    await waitFor(() => {
      expect(screen.queryByLabelText('后宫主线剧情')).not.toBeInTheDocument();
    });
    expect(screen.queryByText(/陈婉宁/)).not.toBeInTheDocument();
    expect(useGameFlowStore.getState().currentView).toBe('map-main');
  });

  it('keeps the chamber sidebar visible after returning home once the prestige map guide is finished', async () => {
    useGameFlowStore.setState((current) => ({
      ...current,
      currentView: 'map-main',
      scene: 'map',
      activeChamberPanel: 'main',
      activeMapLocation: undefined,
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          openingGuideFinished: true,
          mapGuideFinished: true,
          yingluoyetingFirstMorningGuideFinished: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideStarted]: true,
          [YINGLUOYETING_STORY_FLAGS.prestigeMapGuideFinished]: true,
        },
      },
      yingluoyetingPrestigeMapGuide: undefined,
    }));

    const { container } = render(<App />);

    const returnButton = container.querySelector<HTMLButtonElement>('.palace-sidebar--map [data-menu-id="return"]');
    expect(returnButton).not.toBeNull();
    fireEvent.click(returnButton as HTMLButtonElement);

    expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    await waitFor(() => {
      expect(container.querySelector('.chamber-main')).toBeInTheDocument();
    });
    expect(container.querySelector('[data-view-transition-key="bedchamber"]')).toBeInTheDocument();
    expect(container.querySelector('.palace-sidebar--chamber')).toBeInTheDocument();
    expect(container.querySelector('.palace-sidebar--chamber [data-menu-id="map-main"]')).toBeInTheDocument();
  });

  it('renders the time-matched spring map and keeps Yeting as a normal location', () => {
    useGameFlowStore.setState((current) => ({
      ...current,
      time: {
        ...current.time,
        slotIndex: 4,
        slot: '傍晚',
      },
    }));
    const { container } = render(<App />);

    const mapBackground = container.querySelector('.map-main__background') as HTMLElement;
    expect(mapBackground).not.toHaveClass('is-location-scene');
    expect(mapBackground.style.backgroundImage).toContain('map_spring_dusk.png');
    expect(screen.getByRole('button', { name: '掖庭' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '椒房殿' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '掖庭院' })).not.toBeInTheDocument();
  });

  it('shows the locked toast for unopened map locations without entering the subscene', async () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '冷宫' }));

    expect(await screen.findByRole('status')).toHaveTextContent('暂未解锁');
    const mapBackground = container.querySelector('.map-main__background') as HTMLElement;
    expect(mapBackground).not.toHaveClass('is-location-scene');
    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();
    expect(screen.queryByLabelText('冷宫主线剧情')).not.toBeInTheDocument();
  });

  it('keeps Yeting locked while allowing the kitchen subscene from the map', async () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '掖庭' }));

    expect(await screen.findByRole('status')).toHaveTextContent('暂未解锁');
    expect(useGameFlowStore.getState().currentView).toBe('map-main');
    expect(useGameFlowStore.getState().activeMapLocation).toBeUndefined();

    fireEvent.click(screen.getByRole('button', { name: '御膳房' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().activeMapLocation).toBe('御膳房');
      expect(useGameFlowStore.getState().currentView).toBe('bedchamber');
    });
    const mapBackground = container.querySelector('.map-main__background') as HTMLElement | null;
    expect(mapBackground?.classList.contains('is-location-scene') ?? false).toBe(false);
  });

  it.skip('enters cold palace story from the map and grants old testimony evidence through existing state and inventory', async () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '冷宫' }));
    fireEvent.click(screen.getByRole('button', { name: '进入此处' }));

    const mapBackground = container.querySelector('.map-main__background') as HTMLElement;
    expect(mapBackground).toHaveClass('is-location-scene');
    expect(mapBackground.style.backgroundImage).toContain('/assets/routes/backgrounds/lenggong_daytime.png');
    expect(await screen.findByLabelText('冷宫主线剧情')).toBeInTheDocument();
    expect(await screen.findByText(/冷宫门前的铜锁早已生锈/)).toBeInTheDocument();
    expect(screen.getByAltText('老宫人')).toHaveAttribute('src', '/assets/characters/women/laogongren.png');
    expect(screen.queryByText(/姑娘又来了/)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '承诺替她遮掩此事' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '继续' })).not.toBeInTheDocument();

    advanceDialoguePages();
    fireEvent.click(screen.getByRole('button', { name: '承诺替她遮掩此事' }));

    expect(await screen.findByText(/这半页残抄不能替沈家翻案/)).toBeInTheDocument();
    const itemHint = await screen.findByText('获得证物：老宫人口供残抄');
    expect(itemHint).toHaveClass('palace-dialogue-box__highlight');
    const store = useGameFlowStore.getState();
    expect(store.state.flags[YINGLUOYETING_STORY_FLAGS.coldPalaceClueDone]).toBe(true);
    expect(store.state.flags[YINGLUOYETING_STORY_FLAGS.hasOldTestimony]).toBe(true);
    expect(store.state.stress).toBe(31);
    expect(store.inventory.some((item) => item.itemId === YINGLUOYETING_EVIDENCE_ITEM_IDS.oldTestimony)).toBe(true);
  });

  it.skip('enters Tai Hospital old prescription story after cold palace evidence and grants original prescription', async () => {
    useGameFlowStore.setState((current) => ({
      ...current,
      time: {
        ...current.time,
        month: 3,
      },
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          [YINGLUOYETING_STORY_FLAGS.coldPalaceClueDone]: true,
          [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
        },
      },
    }));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '太医院' }));
    fireEvent.click(screen.getByRole('button', { name: '进入此处' }));

    expect(await screen.findByText(/太医院旧档室里药气很沉/)).toBeInTheDocument();
    advanceDialoguePages();
    fireEvent.click(screen.getByRole('button', { name: '抄录原方' }));

    expect(await screen.findByText(/沈氏旧案里至少有一页纸说了假话/)).toBeInTheDocument();
    const store = useGameFlowStore.getState();
    expect(store.state.flags[YINGLUOYETING_STORY_FLAGS.taiyiPrescriptionDone]).toBe(true);
    expect(store.state.flags[YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]).toBe(true);
    expect(store.inventory.some((item) => item.itemId === YINGLUOYETING_EVIDENCE_ITEM_IDS.originalPrescription)).toBe(true);
  });

  it.skip('enters kitchen storage story after prescription mismatch and grants storage transfer list', async () => {
    useGameFlowStore.setState((current) => ({
      ...current,
      time: {
        ...current.time,
        month: 4,
      },
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          [YINGLUOYETING_STORY_FLAGS.taiyiPrescriptionDone]: true,
          [YINGLUOYETING_STORY_FLAGS.prescriptionMismatchNoted]: true,
        },
      },
    }));
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '御膳房' }));
    fireEvent.click(screen.getByRole('button', { name: '进入此处' }));

    expect(await screen.findByText(/旧库的账册压在最底层/)).toBeInTheDocument();
    advanceDialoguePages();
    fireEvent.click(screen.getByRole('button', { name: '抄下调出日期' }));

    expect(await screen.findByText(/沈氏案卷并非结案后再无人碰过/)).toBeInTheDocument();
    const store = useGameFlowStore.getState();
    expect(store.state.flags[YINGLUOYETING_STORY_FLAGS.storageTransferDone]).toBe(true);
    expect(store.state.flags[YINGLUOYETING_STORY_FLAGS.hasStorageTransferList]).toBe(true);
    expect(store.inventory.some((item) => item.itemId === YINGLUOYETING_EVIDENCE_ITEM_IDS.storageTransferList)).toBe(true);
  });

  it('does not expose Changchun Palace as a main-map entrance after the evidence chain', async () => {
    useGameFlowStore.setState((current) => ({
      ...current,
      time: {
        ...current.time,
        month: 5,
      },
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
          [YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]: true,
          [YINGLUOYETING_STORY_FLAGS.storageTransferDone]: true,
          [YINGLUOYETING_STORY_FLAGS.hasStorageTransferList]: true,
          [YINGLUOYETING_STORY_FLAGS.chenFirstMeetPlayed]: true,
          [YINGLUOYETING_STORY_FLAGS.chenFirstMeetDone]: true,
          [YINGLUOYETING_STORY_FLAGS.chenWanningMet]: true,
        },
      },
    }));
    render(<App />);

    expect(screen.queryByRole('button', { name: '长春宫' })).not.toBeInTheDocument();
  });

  it.skip('keeps Chen Wanning first meet on the harem entrance without exposing Changchun Palace', async () => {
    useGameFlowStore.setState((current) => ({
      ...current,
      time: {
        ...current.time,
        month: 5,
      },
      state: {
        ...current.state,
        flags: {
          ...current.state.flags,
          [YINGLUOYETING_STORY_FLAGS.hasOldTestimony]: true,
          [YINGLUOYETING_STORY_FLAGS.hasOriginalPrescription]: true,
          [YINGLUOYETING_STORY_FLAGS.storageTransferDone]: true,
          [YINGLUOYETING_STORY_FLAGS.hasStorageTransferList]: true,
        },
      },
    }));
    render(<App />);

    expect(screen.queryByRole('button', { name: '长春宫' })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '进入此处' }));

    expect(await screen.findByText(/你第一次踏进后宫宫道时/)).toBeInTheDocument();
    expect(screen.getByAltText('陈婉宁')).toHaveAttribute('src', '/assets/characters/women/chenwanning.png');
    advanceDialoguePages();
    expect(screen.getByAltText('陈婉宁')).toHaveAttribute('src', '/assets/characters/women/chenwanning.png');
    fireEvent.click(screen.getByRole('button', { name: '谢她照拂，只字不提旧案' }));
    expect(await screen.findByText(/陈婉宁笑意未改/)).toBeInTheDocument();
    expect(screen.getByAltText('陈婉宁')).toHaveAttribute('src', '/assets/characters/women/chenwanning.png');
  });

  it.skip('enters harem palace overview after Chen Wanning first meet is completed from the harem map entrance', async () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole('button', { name: '后宫' }));
    fireEvent.click(screen.getByRole('button', { name: '进入此处' }));

    expect((container.querySelector('.map-main__background') as HTMLElement).style.backgroundImage).toContain(
      '/assets/routes/backgrounds/hougong_outside_daytime.png',
    );
    expect(await screen.findByText(/你第一次踏进后宫宫道时/)).toBeInTheDocument();
    advanceDialoguePages();
    fireEvent.click(screen.getByRole('button', { name: '谢她照拂，只字不提旧案' }));
    expect(await screen.findByText(/陈婉宁笑意未改/)).toBeInTheDocument();

    advanceDialoguePages();
    fireEvent.click(document.querySelector<HTMLElement>('[data-dialogue-page-state="last"]')!);

    expect(await screen.findByLabelText('后宫宫殿总览')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '昭阳宫' })).toBeInTheDocument();
    expect(screen.queryByLabelText('后宫主线剧情')).not.toBeInTheDocument();
  });

  it('plays Chen Wanning first meet before the player directly enters her harem audience', async () => {
    const chenWanning = buildInitialConcubineRoster('yingluoyeting').find((consort) => consort.name === '陈婉宁');
    expect(chenWanning).toBeDefined();

    render(
      <ConsortAudiencePanel
        consort={chenWanning!}
        palaceLabel="昭阳宫"
        hallLabel="主殿"
        concubines={buildInitialConcubineRoster('yingluoyeting')}
        onBack={() => undefined}
      />,
    );

    expect((await screen.findAllByLabelText('陈婉宁初见剧情')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/你第一次踏进后宫宫道时/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '送礼' })).not.toBeInTheDocument();

    advanceDialoguePages();
    fireEvent.click(screen.getByRole('button', { name: '谢她照拂，只字不提旧案' }));

    await waitFor(() => {
      expect(useGameFlowStore.getState().state.flags[YINGLUOYETING_STORY_FLAGS.chenWanningMet]).toBe(true);
    });
    expect(useGameFlowStore.getState().concubines.find((consort) => consort.name === '陈婉宁')?.stats.relationToPlayer).toBe(5);
    expect(await screen.findByText(/陈婉宁笑意未改/)).toBeInTheDocument();

    fireEvent.click(document.querySelector<HTMLElement>('[data-dialogue-page-state="last"]')!);

    expect(await screen.findByLabelText('妃 陈婉宁 日常对话')).toBeInTheDocument();
    expect(await screen.findByRole('button', { name: '送礼' })).toBeInTheDocument();
  });

  it('recognizes Chen Wanning first meet by character name when portrait id changes', async () => {
    const chenWanning = buildInitialConcubineRoster('yingluoyeting').find((consort) => consort.name === '陈婉宁');
    expect(chenWanning).toBeDefined();

    render(
      <ConsortAudiencePanel
        consort={{ ...chenWanning!, portraitId: '姚铃儿' }}
        palaceLabel="昭阳宫"
        hallLabel="主殿"
        concubines={buildInitialConcubineRoster('yingluoyeting')}
        onBack={() => undefined}
      />,
    );

    expect((await screen.findAllByLabelText('陈婉宁初见剧情')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/你第一次踏进后宫宫道时/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '送礼' })).not.toBeInTheDocument();
  });

  it('plays Chen Wanning first meet from harem audience when the store route fields are not fully synced', async () => {
    const chenWanning = buildInitialConcubineRoster('yingluoyeting').find((consort) => consort.name === '陈婉宁');
    expect(chenWanning).toBeDefined();
    useGameFlowStore.setState((current) => ({
      ...current,
      routeId: 'yingluoyeting',
      concubineRouteId: 'yingluoyeting',
      state: {
        ...current.state,
        routeId: 'lanyinxuguo',
        flags: {
          mapGuideFinished: true,
        },
      },
    }));

    render(
      <ConsortAudiencePanel
        consort={chenWanning!}
        palaceLabel="昭阳宫"
        hallLabel="主殿"
        concubines={buildInitialConcubineRoster('yingluoyeting')}
        onBack={() => undefined}
      />,
    );

    expect((await screen.findAllByLabelText('陈婉宁初见剧情')).length).toBeGreaterThan(0);
    expect(await screen.findByText(/你第一次踏进后宫宫道时/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '送礼' })).not.toBeInTheDocument();
  });
});
