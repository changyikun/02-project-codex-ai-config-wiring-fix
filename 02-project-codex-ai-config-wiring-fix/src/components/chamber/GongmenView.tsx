import { useMemo, useState } from 'react';
import { ConsortAudiencePanel } from '../consorts/ConsortAudiencePanel';
import { AudienceInteractionShell, type AudienceMetaRow } from '../consorts/AudienceInteractionShell';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { buildDuNiangShopCatalog, getInventoryRecyclePrice, type DuNiangShopEntry } from '../../game/data/inventoryPresets';
import { getConcubineDisplayRankText, getConcubinePortraitPath, getConcubineRankWeightByLabel } from '../../game/data/concubineRoster';
import { getRouteProfileById } from '../../game/data/routeProfiles';
import { isConsortGiftItem } from '../../game/lib/consortVisitRuntime';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import {
  DU_NIANG_FRIENDSHIP_PRICE_AFFINITY,
  DU_NIANG_NPC_ID,
  DU_NIANG_NPC_NAME,
  PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN,
  createPermanentNpcRelationship,
  resolveDuNiangBuyPrice,
  resolveDuNiangSellPrice,
} from '../../game/lib/permanentNpcRuntime';
import { narrativeEntryToDialogueFields } from '../../game/narrative/narrativeDialogueAdapter';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';
import { requireNonConsortNpcProfile } from '../../game/npcs/npcCatalog';
import {
  advanceRandomEventLine,
  beginRandomEventSession,
  getRandomEventCurrentLine,
  getRandomEventCurrentOptions,
  pickRandomEventFromPoolsBySeed,
  selectRandomEventOption,
  type RandomEventSession,
} from '../../game/random-events/randomEventRuntime';
import type { RandomEventLine } from '../../game/random-events/randomEventCatalog';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConcubineProfile } from '../../game/types';
import { MapSubsceneView, type SubsceneNpcEntry } from './MapSubsceneView';
import { useBlockingNarrativeLock } from './useBlockingNarrativeLock';
import { useLocationActionFlow } from './useLocationActionFlow';

type GongmenNpcId = 'du-niang' | 'aling';
type GongmenTradeMode = 'buy' | 'sell' | 'gift';

interface GongmenViewProps {
  concubines: ConcubineProfile[];
}

const duNiangLine1 = renderNarrativeEntry('gongmen.duniang.line1');
const duNiangFirstMeetLine1 = renderNarrativeEntry('gongmen.duniang.first-meet.line1');
const duNiangFirstMeetLine2 = renderNarrativeEntry('gongmen.duniang.first-meet.line2');
const alingLine1 = renderNarrativeEntry('gongmen.aling.line1');
const alingLine2 = renderNarrativeEntry('gongmen.aling.line2');
const duNiangLine1Fields = narrativeEntryToDialogueFields(duNiangLine1);
const duNiangFirstMeetLine1Fields = narrativeEntryToDialogueFields(duNiangFirstMeetLine1);
const duNiangFirstMeetLine2Fields = narrativeEntryToDialogueFields(duNiangFirstMeetLine2);
const alingLine1Fields = narrativeEntryToDialogueFields(alingLine1);
const alingLine2Fields = narrativeEntryToDialogueFields(alingLine2);
const duNiangCatalogProfile = requireNonConsortNpcProfile(DU_NIANG_NPC_ID);
const alingCatalogProfile = requireNonConsortNpcProfile('aling');
const npcProfiles: Record<
  GongmenNpcId,
  {
    identity: string;
    name: string;
    portrait: string;
    dialogueLines: string[];
  }
> = {
  'du-niang': {
    identity: duNiangCatalogProfile.identityLabel || duNiangLine1Fields.speakerIdentity,
    name: duNiangCatalogProfile.displayName || duNiangLine1Fields.speakerName,
    portrait: duNiangCatalogProfile.portraitSrc ?? '',
    dialogueLines: [duNiangLine1Fields.text],
  },
  aling: {
    identity: alingCatalogProfile.identityLabel || alingLine1Fields.speakerIdentity,
    name: alingCatalogProfile.displayName || alingLine1Fields.speakerName,
    portrait: alingCatalogProfile.portraitSrc ?? '',
    dialogueLines: [alingLine1Fields.text, alingLine2Fields.text],
  },
};
const duNiangFirstMeetLines = [duNiangFirstMeetLine1Fields.text, duNiangFirstMeetLine2Fields.text] as const;

const buildPermanentNpcRelationLabel = (affinity: number): string => {
  if (affinity >= DU_NIANG_FRIENDSHIP_PRICE_AFFINITY) {
    return '熟客';
  }
  if (affinity >= 30) {
    return '相熟';
  }
  if (affinity > 0) {
    return '认得';
  }
  return '生客';
};

export function GongmenView({ concubines }: GongmenViewProps) {
  const {
    state,
    hiddenStats,
    time,
    inventory,
    merchantLedger,
    customConsorts,
    selectedRoute,
    buyInventoryItem,
    sellInventoryItem,
    consumeInventoryItem,
    permanentNpcRelationships,
    randomEventProgress,
    ensurePermanentNpcRelationship,
    markPermanentNpcMet,
    recordPermanentNpcInteractionAction,
    applyPermanentNpcAffinityDelta,
    applyRandomEventEffectForPermanentNpc,
    queueRandomEventUnlocks,
    completeRandomEventById,
    npcActivity,
    resolveNpcActivityEntry,
    enterMapMain,
  } = useGameFlowStore();
  const { beginTimedLocationAction, finishTimedLocationAction } = useLocationActionFlow();
  const [activeNpc, setActiveNpc] = useState<GongmenNpcId | null>(null);
  const [activeTradeMode, setActiveTradeMode] = useState<GongmenTradeMode | null>(null);
  const [dialogueStep, setDialogueStep] = useState(0);
  const [activeRandomSession, setActiveRandomSession] = useState<RandomEventSession | null>(null);
  const [activeRandomLine, setActiveRandomLine] = useState<RandomEventLine | null>(null);
  useBlockingNarrativeLock('gongmen:random-event', Boolean(activeRandomSession));
  const [activeNpcConsumedInteraction, setActiveNpcConsumedInteraction] = useState(false);
  const [activeConsortAudience, setActiveConsortAudience] = useState<{
    entryId: string;
    consortId: string;
    summary: string;
  } | null>(null);

  const allConsorts = useMemo(() => [...concubines, ...customConsorts], [concubines, customConsorts]);
  const gongmenSeed = `${state.routeId}:${time.year}-${time.month}-${time.xun}`;
  const duNiangRelationship =
    permanentNpcRelationships[DU_NIANG_NPC_ID] ??
    createPermanentNpcRelationship(DU_NIANG_NPC_ID, DU_NIANG_NPC_NAME, `${time.year}-${time.month}-${time.xun}`);
  const tradeCatalog = useMemo(() => buildDuNiangShopCatalog(gongmenSeed), [gongmenSeed]);
  const resolvedTradeCatalog = useMemo(
    () =>
      tradeCatalog
        .map((entry) => {
          const ledgerKey = `${time.year}-${time.month}-${time.xun}:${entry.itemId}`;
          const boughtCount = merchantLedger[ledgerKey] ?? 0;
          const remainingStock = entry.stock == null ? null : Math.max(0, entry.stock - boughtCount);
          return {
            ...entry,
            price: resolveDuNiangBuyPrice(entry.price, duNiangRelationship),
            remainingStock,
          };
        })
        .filter((entry) => entry.remainingStock == null || entry.remainingStock > 0),
    [duNiangRelationship, merchantLedger, time.month, time.xun, time.year, tradeCatalog],
  );
  const sellableInventory = useMemo(
    () =>
      inventory
        .filter((item) => item.quantity > 0 && item.canRecycle !== false && !item.isQuestItem)
        .sort((left, right) => left.price - right.price),
    [inventory],
  );
  const giftableInventory = useMemo(
    () => inventory.filter((item) => isConsortGiftItem(item) && !item.isQuestItem).sort((left, right) => left.price - right.price),
    [inventory],
  );
  const npcButtons = state.routeId === 'chenyuansucuo'
    ? [
        { id: 'du-niang' as const, label: '杜娘' },
        { id: 'aling' as const, label: '阿翎' },
      ]
    : [{ id: 'du-niang' as const, label: '杜娘' }];
  const publicConsortEntries = useMemo(
    () =>
      getNpcActivitiesAtLocation(npcActivity, '宫门', { includeResolved: true })
        .map((entry) => {
          const consort = allConsorts.find((candidate) => candidate.id === entry.actorConsortId);
          return consort ? { entry, consort } : null;
        })
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry)),
    [allConsorts, npcActivity],
  );
  const activeProfile = activeNpc ? npcProfiles[activeNpc] : null;
  const activeAudienceConsort = useMemo(
    () => allConsorts.find((consort) => consort.id === activeConsortAudience?.consortId) ?? null,
    [activeConsortAudience, allConsorts],
  );
  const isDuNiangFirstMeet = activeNpc === 'du-niang' && !duNiangRelationship.met;
  const activeDialogueLines = isDuNiangFirstMeet ? duNiangFirstMeetLines : activeProfile?.dialogueLines ?? [];
  const activeRandomOptions = activeRandomSession ? getRandomEventCurrentOptions(activeRandomSession) : [];
  const playerRankLabel =
    hiddenStats.initialRank && getConcubineRankWeightByLabel(hiddenStats.initialRank) > 0 ? hiddenStats.initialRank : '宫妃';
  const entryDialogueActive = Boolean(activeProfile && dialogueStep < activeDialogueLines.length);
  const randomDialogueActive = Boolean(activeRandomSession);
  const dialogueActive = entryDialogueActive || randomDialogueActive;
  const dialogueText =
    activeRandomLine?.text ||
    (activeDialogueLines[Math.min(dialogueStep, activeDialogueLines.length - 1)] ?? '');
  const dialogueIdentity = activeRandomLine?.speakerIdentity ?? activeProfile?.identity ?? '';
  const dialogueName = activeRandomLine?.speakerName ?? activeProfile?.name ?? '';
  const playerPortraitSrc = selectedRoute?.portrait ?? getRouteProfileById(state.routeId)?.portrait;
  const isPlayerRandomLine = Boolean(
    activeRandomLine &&
      (activeRandomLine.portraitKey === 'player' ||
        activeRandomLine.speakerName === state.name ||
        activeRandomLine.speakerIdentity === playerRankLabel),
  );
  const showNpcActions = Boolean(activeProfile && !dialogueActive);
  const duNiangRemainingInteractionCount = Math.max(
    0,
    PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN - Number(duNiangRelationship.actionCountThisXun ?? 0),
  );

  const handleOpenNpc = (npcId: GongmenNpcId) => {
    if (npcId === 'du-niang') {
      ensurePermanentNpcRelationship(DU_NIANG_NPC_ID, DU_NIANG_NPC_NAME);
    }
    setActiveNpc(npcId);
    setActiveTradeMode(null);
    setDialogueStep(0);
    setActiveRandomSession(null);
    setActiveRandomLine(null);
    setActiveNpcConsumedInteraction(false);
  };

  const handleCloseNpc = () => {
    if (activeNpcConsumedInteraction) {
      finishTimedLocationAction(beginTimedLocationAction());
    }
    setActiveNpc(null);
    setActiveTradeMode(null);
    setDialogueStep(0);
    setActiveRandomSession(null);
    setActiveRandomLine(null);
    setActiveNpcConsumedInteraction(false);
  };

  const applyRandomEventOutcome = (effect: Parameters<typeof applyRandomEventEffectForPermanentNpc>[2], unlockEventIds: readonly string[]) => {
    applyRandomEventEffectForPermanentNpc(DU_NIANG_NPC_ID, DU_NIANG_NPC_NAME, effect);
    if (unlockEventIds.length > 0) {
      queueRandomEventUnlocks(unlockEventIds);
    }
  };

  const finishRandomEvent = (eventId: string) => {
    completeRandomEventById(eventId);
    setActiveRandomSession(null);
    setActiveRandomLine(null);
  };

  const handleDialogueNext = () => {
    if (activeRandomSession) {
      if (activeRandomSession.stage !== 'lines') {
        return;
      }
      const advanceResult = advanceRandomEventLine(activeRandomSession);
      applyRandomEventOutcome(advanceResult.effect, advanceResult.unlockEventIds);
      if (advanceResult.completed) {
        finishRandomEvent(activeRandomSession.eventId);
        return;
      }
      setActiveRandomSession(advanceResult.session);
      const nextLine = getRandomEventCurrentLine(advanceResult.session);
      if (nextLine) {
        setActiveRandomLine(nextLine);
      }
      return;
    }
    if (!activeProfile) {
      return;
    }
    if (dialogueStep < activeDialogueLines.length - 1) {
      setDialogueStep((current) => current + 1);
      return;
    }
    if (isDuNiangFirstMeet) {
      markPermanentNpcMet(DU_NIANG_NPC_ID, DU_NIANG_NPC_NAME);
    }
    setDialogueStep(activeDialogueLines.length);
  };

  const handleSmallTalk = () => {
    const actionResult = recordPermanentNpcInteractionAction(DU_NIANG_NPC_ID, DU_NIANG_NPC_NAME, 'talk');
    if (!actionResult.success) {
      return;
    }
    setActiveNpcConsumedInteraction(true);
    const pools = [
      'npc.du-niang.common',
      duNiangRelationship.affinity >= DU_NIANG_FRIENDSHIP_PRICE_AFFINITY
        ? 'npc.du-niang.high-affinity'
        : 'npc.du-niang.low-affinity',
    ];
    const nextTalkCount = Number(duNiangRelationship.actionCountThisXun ?? 0) + 1;
    const pickedEvent = pickRandomEventFromPoolsBySeed({
      poolIds: pools,
      progress: randomEventProgress,
      seed: `${gongmenSeed}:du-niang:talk:${nextTalkCount}:${duNiangRelationship.affinity}`,
    });
    if (!pickedEvent) {
      return;
    }
    const session = beginRandomEventSession({
      eventId: pickedEvent.eventId,
      variables: {
        playerName: state.name,
        playerSurname: state.name.slice(0, 1),
        playerRank: playerRankLabel,
        playerResidence: state.residenceName,
        playerAddress: state.name,
        targetName: DU_NIANG_NPC_NAME,
        targetSurname: '杜',
        targetRank: '宫门商贩',
        targetResidence: '宫门',
        targetAddress: DU_NIANG_NPC_NAME,
        locationName: '宫门',
        timeLabel: time.slot,
      },
    });
    setActiveTradeMode(null);
    setActiveRandomSession(session);
    setActiveRandomLine(getRandomEventCurrentLine(session) ?? null);
  };

  const handleSelectRandomOption = (optionId: string) => {
    if (!activeRandomSession) {
      return;
    }
    const optionResult = selectRandomEventOption(activeRandomSession, optionId);
    applyRandomEventOutcome(optionResult.effect, optionResult.unlockEventIds);
    if (optionResult.completed) {
      finishRandomEvent(activeRandomSession.eventId);
      return;
    }
    setActiveRandomSession(optionResult.session);
    setActiveRandomLine(getRandomEventCurrentLine(optionResult.session) ?? activeRandomLine);
  };

  const handleTradeModeChange = (mode: GongmenTradeMode) => {
    setActiveTradeMode(mode);
  };

  const handleBuy = (entry: DuNiangShopEntry & { remainingStock: number | null }) => {
    buyInventoryItem(entry, entry.stock);
  };

  const handleSell = (itemId: string, recyclePrice: number) => {
    sellInventoryItem(itemId, recyclePrice);
  };

  const handleGift = (itemId: string) => {
    const item = giftableInventory.find((candidate) => candidate.itemId === itemId);
    if (!item) {
      return;
    }
    const actionResult = recordPermanentNpcInteractionAction(DU_NIANG_NPC_ID, DU_NIANG_NPC_NAME, 'gift');
    if (!actionResult.success) {
      return;
    }
    setActiveNpcConsumedInteraction(true);
    if (!consumeInventoryItem(item.itemId)) {
      return;
    }
    applyPermanentNpcAffinityDelta(DU_NIANG_NPC_ID, DU_NIANG_NPC_NAME, item.favorDelta);
  };

  const handleStartConsortAudience = (entryId: string) => {
    const activity = publicConsortEntries.find((item) => item.entry.id === entryId);
    if (!activity || activity.entry.resolved) {
      return;
    }
    setActiveNpc(null);
    setActiveTradeMode(null);
    setDialogueStep(0);
    setActiveConsortAudience({
      entryId,
      consortId: activity.consort.id,
      summary: activity.entry.summary,
    });
    resolveNpcActivityEntry(entryId);
  };
  const subsceneNpcEntries = useMemo<SubsceneNpcEntry[]>(
    () => [
      ...npcButtons.map((npc) => {
        const profile = npcProfiles[npc.id];
        return {
          id: `fixed:${npc.id}`,
          kind: 'fixed' as const,
          name: profile.name,
          identityLabel: profile.identity,
          portraitSrc: profile.portrait,
          onClick: () => handleOpenNpc(npc.id),
        };
      }),
      ...publicConsortEntries.map(({ entry, consort }) => ({
        id: `consort:${entry.id}`,
        kind: 'consort' as const,
        name: consort.name,
        identityLabel: getConcubineDisplayRankText(consort),
        ariaLabel: entry.resolved
          ? `${getConcubineDisplayRankText(consort)} ${consort.name}仍在此处`
          : `与${getConcubineDisplayRankText(consort)} ${consort.name}交谈`,
        portraitSrc: getConcubinePortraitPath(consort.portraitId),
        interactableState: entry.resolved ? ('spent' as const) : ('available' as const),
        disabledReason: entry.resolved ? '本旬已交谈过' : undefined,
        onClick: entry.resolved ? undefined : () => handleStartConsortAudience(entry.id),
      })),
    ],
    [npcButtons, publicConsortEntries],
  );

  if (activeConsortAudience && activeAudienceConsort) {
    return (
      <section className="map-main__gongmen-scene" aria-label={`${activeAudienceConsort.name} 宫门偶遇场景`}>
        <ConsortAudiencePanel
          consort={activeAudienceConsort}
          palaceLabel="宫门"
          hallLabel="偶遇"
          concubines={concubines}
          backLabel="返回"
          initialActionLabel="宫门偶遇"
          encounterPlace="public"
          initialActionResult={`宫门处风声嘈杂，内外消息都在此地转手。${activeConsortAudience.summary}你看见${getConcubineDisplayRankText(
            activeAudienceConsort,
          )} ${activeAudienceConsort.name}正在此处，便主动上前搭话。`}
          onBack={(result) => {
            if (result?.shouldAdvanceTime) {
              finishTimedLocationAction(beginTimedLocationAction());
            }
            setActiveConsortAudience(null);
          }}
        />
      </section>
    );
  }

  if (activeProfile) {
    const npcMetaRows: AudienceMetaRow[] =
      activeNpc === 'du-niang'
        ? [
            { label: '当前状态', value: duNiangRelationship.met ? '已见过' : '初见' },
            { label: '对你态度', value: duNiangRelationship.affinity },
            { label: '关系', value: buildPermanentNpcRelationLabel(duNiangRelationship.affinity) },
          ]
        : [
            { label: '当前状态', value: '旧识' },
            { label: '对你态度', value: '平稳' },
            { label: '关系', value: '可叙旧' },
          ];
    const npcPortrait = (
      <div
        className="harem-palace-view__audience-portrait-stage"
        aria-label={isPlayerRandomLine ? `${state.name}立绘` : `${activeProfile.name}常驻立绘`}
      >
        <div className="harem-palace-view__audience-portrait-frame">
          {isPlayerRandomLine ? (
            playerPortraitSrc ? (
              <img
                src={playerPortraitSrc}
                alt={state.name}
                className="harem-palace-view__audience-portrait global-dialogue-stage__portrait-media--player"
              />
            ) : (
              <div className="harem-palace-view__audience-portrait harem-palace-view__audience-portrait--placeholder">
                {state.name}
              </div>
            )
          ) : (
            <img src={activeProfile.portrait} alt={activeProfile.name} className="harem-palace-view__audience-portrait" />
          )}
        </div>
      </div>
    );
    const npcActions = showNpcActions ? (
      <aside className="harem-palace-view__audience-actions" aria-label="宫内互动操作">
        {activeNpc === 'du-niang' ? (
          <>
            <span className="harem-palace-view__audience-action-note">
              {`本旬可互动 ${duNiangRemainingInteractionCount}/${PERMANENT_NPC_INTERACTION_ACTION_LIMIT_PER_XUN}`}
            </span>
            <button type="button" onClick={handleSmallTalk}>
              闲谈（耗次）
            </button>
            <button type="button" className={activeTradeMode === 'gift' ? 'is-active' : ''} onClick={() => setActiveTradeMode('gift')}>
              送礼（耗次）
            </button>
            <button type="button" className={activeTradeMode === 'buy' ? 'is-active' : ''} onClick={() => handleTradeModeChange('buy')}>
              购买
            </button>
            <button type="button" className={activeTradeMode === 'sell' ? 'is-active' : ''} onClick={() => handleTradeModeChange('sell')}>
              售卖
            </button>
            <button type="button" onClick={handleCloseNpc}>
              返回
            </button>
          </>
        ) : (
          <>
            <button type="button" disabled>
              叙旧
            </button>
            <button type="button" onClick={handleCloseNpc}>
              返回
            </button>
          </>
        )}
      </aside>
    ) : null;
    const npcDialogue = dialogueActive ? (
      <GlobalDialogueStage
        sceneLabel={`${activeProfile.name} 宫门对话场景`}
        portraitLabel={`${activeProfile.name}常驻立绘`}
        ariaLabel={`${activeProfile.name} 宫门对话`}
        className="global-dialogue-stage--consort global-dialogue-stage--with-side-panel"
        dialogueClassName="palace-dialogue-box--consort-audience"
        suppressPortrait
        characterIdentity={dialogueIdentity}
        characterName={dialogueName}
        content={dialogueText}
        onNextAction={handleDialogueNext}
        options={activeRandomOptions.map((option) => ({ id: option.optionId, label: option.optionLabel }))}
        onSelectOption={handleSelectRandomOption}
        splitQuotedDialogue={false}
      />
    ) : undefined;
    const tradePicker =
      activeNpc === 'du-niang' && activeTradeMode ? (
        <section
          className="harem-palace-view__audience-picker harem-palace-view__audience-picker--gift"
          role="dialog"
          aria-label={activeTradeMode === 'buy' ? '杜娘购买弹窗' : activeTradeMode === 'sell' ? '杜娘售卖弹窗' : '杜娘送礼弹窗'}
        >
          <header>
            <strong>{activeTradeMode === 'buy' ? '杜娘货单' : activeTradeMode === 'sell' ? '背包回收' : '赠予杜娘'}</strong>
            <span>{`当前银两：${state.silver}`}</span>
            <button type="button" onClick={() => setActiveTradeMode(null)}>
              收起
            </button>
          </header>
          <div className="harem-palace-view__audience-picker-list">
            {activeTradeMode === 'buy' ? (
              resolvedTradeCatalog.length > 0 ? (
                resolvedTradeCatalog.map((entry) => (
                  <button
                    key={entry.itemId}
                    type="button"
                    aria-label={`购买 ${entry.name}`}
                    disabled={state.silver < entry.price || entry.remainingStock === 0}
                    onClick={() => handleBuy(entry)}
                  >
                    <strong>{`${entry.name} · ${entry.price}两`}</strong>
                    <span>{entry.remainingStock == null ? '常备货' : `本旬余量：${entry.remainingStock}`}</span>
                    <span>{entry.description}</span>
                  </button>
                ))
              ) : (
                <p>杜娘这一旬货箱里暂时没有可挑的物件。</p>
              )
            ) : activeTradeMode === 'sell' ? (
              sellableInventory.length > 0 ? (
                sellableInventory.map((item) => (
                  <button
                    key={item.itemId}
                    type="button"
                    aria-label={`售卖 ${item.name}`}
                    onClick={() => handleSell(item.itemId, resolveDuNiangSellPrice(getInventoryRecyclePrice(item), duNiangRelationship))}
                  >
                    <strong>{`${item.name} ×${item.quantity}`}</strong>
                    <span>{`回收价：${resolveDuNiangSellPrice(getInventoryRecyclePrice(item), duNiangRelationship)}两 / 份`}</span>
                    <span>{item.description}</span>
                  </button>
                ))
              ) : (
                <p>背包里暂时没有可回收的物件。</p>
              )
            ) : giftableInventory.length > 0 ? (
              giftableInventory.map((item) => (
                <button key={item.itemId} type="button" aria-label={`赠予杜娘 ${item.name}`} onClick={() => handleGift(item.itemId)}>
                  <strong>{`${item.name} ×${item.quantity}`}</strong>
                  <span>{item.description}</span>
                </button>
              ))
            ) : (
              <p>背包里暂时没有合适的礼物。</p>
            )}
          </div>
        </section>
      ) : undefined;

    return (
      <AudienceInteractionShell
        ariaLabel={`${activeProfile.identity} ${activeProfile.name} 日常对话`}
        heading={`宫门 · ${activeProfile.name}`}
        metaRows={npcMetaRows}
        portrait={npcPortrait}
        actions={npcActions}
        picker={tradePicker}
        dialogue={npcDialogue}
      />
    );
  }

  return (
    <MapSubsceneView
      locationId="宫门"
      ariaLabel="宫门人物入口"
      npcStageLabel="宫门可交互妃嫔"
      npcs={subsceneNpcEntries}
      actions={[]}
      onLeave={enterMapMain}
    />
  );
}
