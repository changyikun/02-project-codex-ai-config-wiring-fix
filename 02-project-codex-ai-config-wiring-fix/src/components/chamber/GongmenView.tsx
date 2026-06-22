import { useMemo, useState } from 'react';
import { ConsortAudiencePanel } from '../consorts/ConsortAudiencePanel';
import { AutoCutoutPortrait } from '../visual/AutoCutoutPortrait';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { buildDuNiangShopCatalog, getInventoryRecyclePrice, type DuNiangShopEntry } from '../../game/data/inventoryPresets';
import { getConcubineDisplayRankText } from '../../game/data/concubineRoster';
import { getNpcActivitiesAtLocation } from '../../game/lib/npcActivityRuntime';
import { narrativeEntryToDialogueFields } from '../../game/narrative/narrativeDialogueAdapter';
import { renderNarrativeEntry } from '../../game/narrative/narrativeCatalog';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { ConcubineProfile } from '../../game/types';
import { LocationConsortVisitorsPanel } from './LocationConsortVisitorsPanel';

type GongmenNpcId = 'du-niang' | 'aling';
type GongmenTradeMode = 'buy' | 'sell';

interface GongmenViewProps {
  concubines: ConcubineProfile[];
}

const duNiangLine1 = renderNarrativeEntry('gongmen.duniang.line1');
const duNiangLine2 = renderNarrativeEntry('gongmen.duniang.line2');
const alingLine1 = renderNarrativeEntry('gongmen.aling.line1');
const alingLine2 = renderNarrativeEntry('gongmen.aling.line2');
const alingIdleLine = renderNarrativeEntry('gongmen.aling.idle');
const duNiangLine1Fields = narrativeEntryToDialogueFields(duNiangLine1);
const duNiangLine2Fields = narrativeEntryToDialogueFields(duNiangLine2);
const alingLine1Fields = narrativeEntryToDialogueFields(alingLine1);
const alingLine2Fields = narrativeEntryToDialogueFields(alingLine2);
const alingIdleFields = narrativeEntryToDialogueFields(alingIdleLine);
const duNiangSmallTalkEntries = [
  renderNarrativeEntry('gongmen.duniang.line2'),
  renderNarrativeEntry('gongmen.duniang.line3'),
  renderNarrativeEntry('gongmen.duniang.line4'),
] as const;

const npcProfiles: Record<
  GongmenNpcId,
  {
    identity: string;
    name: string;
    portrait: string;
    dialogueLines: string[];
    alreadyCutout?: boolean;
    portraitThreshold?: number;
    portraitSampleInset?: number;
  }
> = {
  'du-niang': {
    identity: duNiangLine1Fields.speakerIdentity,
    name: duNiangLine1Fields.speakerName,
    portrait: '/assets/characters/women/duniang.png',
    dialogueLines: [duNiangLine1Fields.text, duNiangLine2Fields.text],
    alreadyCutout: true,
  },
  aling: {
    identity: alingLine1Fields.speakerIdentity,
    name: alingLine1Fields.speakerName,
    portrait: '/assets/characters/women/feizi1.png',
    dialogueLines: [alingLine1Fields.text, alingLine2Fields.text],
    portraitThreshold: 42,
  },
};

const buildDuNiangLocalSmallTalkText = (historyLength: number): string => {
  const entry = duNiangSmallTalkEntries[Math.max(0, historyLength - 1) % duNiangSmallTalkEntries.length];
  return narrativeEntryToDialogueFields(entry).text;
};

export function GongmenView({ concubines }: GongmenViewProps) {
  const {
    state,
    time,
    inventory,
    merchantLedger,
    customConsorts,
    buyInventoryItem,
    sellInventoryItem,
    npcActivity,
    resolveNpcActivityEntry,
  } = useGameFlowStore();
  const [activeNpc, setActiveNpc] = useState<GongmenNpcId | null>(null);
  const [activeTradeMode, setActiveTradeMode] = useState<GongmenTradeMode | null>(null);
  const [feedback, setFeedback] = useState('');
  const [dialogueStep, setDialogueStep] = useState(0);
  const [smallTalkCount, setSmallTalkCount] = useState(0);
  const [activeConsortAudience, setActiveConsortAudience] = useState<{
    entryId: string;
    consortId: string;
    summary: string;
  } | null>(null);

  const allConsorts = useMemo(() => [...concubines, ...customConsorts], [concubines, customConsorts]);
  const gongmenSeed = `${state.routeId}:${time.year}-${time.month}-${time.xun}`;
  const tradeCatalog = useMemo(() => buildDuNiangShopCatalog(gongmenSeed), [gongmenSeed]);
  const resolvedTradeCatalog = useMemo(
    () =>
      tradeCatalog
        .map((entry) => {
          const ledgerKey = `${time.year}-${time.month}-${time.xun}:${entry.itemId}`;
          const boughtCount = merchantLedger[ledgerKey] ?? 0;
          const remainingStock = entry.stock == null ? null : Math.max(0, entry.stock - boughtCount);
          return { ...entry, remainingStock };
        })
        .filter((entry) => entry.remainingStock == null || entry.remainingStock > 0),
    [merchantLedger, time.month, time.xun, time.year, tradeCatalog],
  );
  const sellableInventory = useMemo(
    () =>
      inventory
        .filter((item) => item.quantity > 0 && item.canRecycle !== false)
        .sort((left, right) => left.price - right.price),
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
  const dialogueText = feedback || (activeProfile ? activeProfile.dialogueLines[Math.min(dialogueStep, activeProfile.dialogueLines.length - 1)] ?? '' : '');
  const showNpcActions = Boolean(activeProfile && (feedback || dialogueStep >= activeProfile.dialogueLines.length));

  const handleOpenNpc = (npcId: GongmenNpcId) => {
    setActiveNpc(npcId);
    setActiveTradeMode(null);
    setFeedback('');
    setDialogueStep(0);
  };

  const handleCloseNpc = () => {
    setActiveNpc(null);
    setActiveTradeMode(null);
    setFeedback('');
    setDialogueStep(0);
  };

  const handleDialogueNext = () => {
    if (feedback) {
      setFeedback('');
      return;
    }
    if (!activeProfile) {
      return;
    }
    if (dialogueStep < activeProfile.dialogueLines.length - 1) {
      setDialogueStep((current) => current + 1);
      return;
    }
    setDialogueStep(activeProfile.dialogueLines.length);
  };

  const handleSmallTalk = () => {
    const nextCount = smallTalkCount + 1;
    setSmallTalkCount(nextCount);
    setFeedback(buildDuNiangLocalSmallTalkText(nextCount));
  };

  const handleTradeModeChange = (mode: GongmenTradeMode) => {
    setActiveTradeMode(mode);
    setFeedback(narrativeEntryToDialogueFields(renderNarrativeEntry(mode === 'buy' ? 'gongmen.duniang.buy' : 'gongmen.duniang.sell')).text);
  };

  const handleBuy = (entry: DuNiangShopEntry & { remainingStock: number | null }) => {
    const result = buyInventoryItem(entry);
    setFeedback(result.message);
  };

  const handleSell = (itemId: string) => {
    const result = sellInventoryItem(itemId);
    setFeedback(result.message);
  };

  const handleStartConsortAudience = (entryId: string) => {
    const activity = publicConsortEntries.find((item) => item.entry.id === entryId);
    if (!activity || activity.entry.resolved) {
      return;
    }
    setActiveNpc(null);
    setActiveTradeMode(null);
    setFeedback('');
    setDialogueStep(0);
    setActiveConsortAudience({
      entryId,
      consortId: activity.consort.id,
      summary: activity.entry.summary,
    });
    resolveNpcActivityEntry(entryId);
  };

  if (activeConsortAudience && activeAudienceConsort) {
    return (
      <section className="map-main__gongmen-scene" aria-label={`${activeAudienceConsort.name} 宫门偶遇场景`}>
        <ConsortAudiencePanel
          consort={activeAudienceConsort}
          palaceLabel="宫门"
          hallLabel="偶遇"
          concubines={concubines}
          backLabel="返回宫门"
          initialActionLabel="宫门偶遇"
          encounterPlace="public"
          initialActionResult={`宫门处风声嘈杂，内外消息都在此地转手。${activeConsortAudience.summary}你看见${getConcubineDisplayRankText(
            activeAudienceConsort,
          )} ${activeAudienceConsort.name}正在此处，便主动上前搭话。`}
          onBack={() => setActiveConsortAudience(null)}
        />
      </section>
    );
  }

  if (activeProfile) {
    return (
      <>
        <section className="map-main__gongmen-scene" aria-label={`${activeProfile.name} 宫门场景`}>
          <div className="map-main__gongmen-portrait-stage" aria-label={`${activeProfile.name}常驻立绘`}>
            <div className="map-main__gongmen-portrait-frame">
              {activeProfile.alreadyCutout ? (
                <img
                  src={activeProfile.portrait}
                  alt={activeProfile.name}
                  className="map-main__gongmen-portrait-media global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--gongmen"
                />
              ) : (
                <AutoCutoutPortrait
                  src={activeProfile.portrait}
                  alt={activeProfile.name}
                  className="map-main__gongmen-portrait-media global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--gongmen"
                  threshold={activeProfile.portraitThreshold}
                  sampleInset={activeProfile.portraitSampleInset ?? 10}
                />
              )}
            </div>
          </div>
          <GlobalDialogueStage
            sceneLabel={`${activeProfile.name} 宫门对话场景`}
            portraitLabel={`${activeProfile.name}常驻立绘`}
            ariaLabel={`${activeProfile.name} 宫门对话`}
            className="global-dialogue-stage--gongmen global-dialogue-stage--with-side-panel"
            dialogueClassName="palace-dialogue-box--gongmen-npc"
            suppressPortrait
            characterIdentity={activeProfile.identity}
            characterName={activeProfile.name}
            content={dialogueText}
            onNextAction={handleDialogueNext}
          />
        </section>

        {showNpcActions ? (
          <aside className="map-main__gongmen-actions" aria-label={`${activeProfile.name} 操作栏`}>
            {activeNpc === 'du-niang' ? (
              <>
                <button type="button" onClick={handleSmallTalk}>
                  闲谈
                </button>
                <button type="button" className={activeTradeMode === 'buy' ? 'is-active' : ''} onClick={() => handleTradeModeChange('buy')}>
                  购买
                </button>
                <button type="button" className={activeTradeMode === 'sell' ? 'is-active' : ''} onClick={() => handleTradeModeChange('sell')}>
                  售卖
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setFeedback(alingIdleFields.text)}>
                叙旧
              </button>
            )}
            <button type="button" onClick={handleCloseNpc}>
              返回宫门
            </button>
          </aside>
        ) : null}

        {activeNpc === 'du-niang' && activeTradeMode ? (
          <section className="map-main__trade-modal" role="dialog" aria-label={activeTradeMode === 'buy' ? '杜娘购买弹窗' : '杜娘售卖弹窗'}>
            <header className="map-main__trade-header">
              <div>
                <strong>{activeTradeMode === 'buy' ? '杜娘货单' : '背包回收'}</strong>
                <span>{`当前银两：${state.silver}`}</span>
              </div>
              <button type="button" onClick={() => setActiveTradeMode(null)}>
                收起
              </button>
            </header>

            <div className="map-main__trade-list">
              {activeTradeMode === 'buy' ? (
                resolvedTradeCatalog.length > 0 ? (
                  resolvedTradeCatalog.map((entry) => (
                    <article key={entry.itemId} className="map-main__trade-card">
                      <div>
                        <h3>{entry.name}</h3>
                        <p>{entry.description}</p>
                        <span>{`售价：${entry.price}两`}</span>
                        <span>{entry.remainingStock == null ? '常备货' : `本旬余量：${entry.remainingStock}`}</span>
                      </div>
                      <button
                        type="button"
                        aria-label={`购买 ${entry.name}`}
                        disabled={state.silver < entry.price || entry.remainingStock === 0}
                        onClick={() => handleBuy(entry)}
                      >
                        购买
                      </button>
                    </article>
                  ))
                ) : (
                  <div className="map-main__trade-empty-state">杜娘这一旬没带出新的稀有货色，剩下的常备物件你已经看过了。</div>
                )
              ) : sellableInventory.length > 0 ? (
                sellableInventory.map((item) => (
                  <article key={item.itemId} className="map-main__trade-card">
                    <div>
                      <h3>{item.name}</h3>
                      <p>{item.description}</p>
                      <span>{`持有：${item.quantity}`}</span>
                      <span>{`回收价：${getInventoryRecyclePrice(item)}两 / 份`}</span>
                    </div>
                    <button type="button" aria-label={`售卖 ${item.name}`} onClick={() => handleSell(item.itemId)}>
                      售卖
                    </button>
                  </article>
                ))
              ) : (
                <div className="map-main__trade-empty-state">背包里暂时没有可回收的物件。</div>
              )}
            </div>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <section className="map-main__gongmen-selector" aria-label="宫门人物入口">
      <div className="map-main__gongmen-entry-buttons">
        {npcButtons.map((npc) => (
          <button key={npc.id} type="button" onClick={() => handleOpenNpc(npc.id)}>
            {npc.label}
          </button>
        ))}
      </div>
      <LocationConsortVisitorsPanel
        locationName="宫门"
        entries={publicConsortEntries}
        onStartAudience={handleStartConsortAudience}
      />
    </section>
  );
}
