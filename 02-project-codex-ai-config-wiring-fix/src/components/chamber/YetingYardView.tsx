import { useMemo, useState } from 'react';
import { buildYetingPoisonCatalog } from '../../game/data/inventoryPresets';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { InventoryItem } from '../../game/types';
import { GlobalDialogueStage } from '../dialogue/GlobalDialogueStage';
import { MapSubsceneView, type SubsceneActionEntry, type SubsceneNpcEntry } from './MapSubsceneView';

export const YUE_GUGU_PORTRAIT_SRC = '/assets/characters/women/duyaoshangren.png';

export function YetingYardView() {
  const state = useGameFlowStore((store) => store.state);
  const inventory = useGameFlowStore((store) => store.inventory);
  const buyInventoryItem = useGameFlowStore((store) => store.buyInventoryItem);
  const enterMapMain = useGameFlowStore((store) => store.enterMapMain);
  const [shopOpen, setShopOpen] = useState(false);
  const [systemMessage, setSystemMessage] = useState(
    '掖庭院里差役往来，旧档、杂役和不能摆到明面上的交易都藏在墙根阴影里。',
  );
  const [npcIntroText, setNpcIntroText] = useState('');
  const poisonCatalog = useMemo(() => buildYetingPoisonCatalog(), []);

  const getOwnedQuantity = (itemId: string): number =>
    inventory.find((item) => item.itemId === itemId)?.quantity ?? 0;

  const handleBuyPoison = (item: InventoryItem) => {
    const result = buyInventoryItem(item);
    const nextMessage = result.success
      ? `月姑姑收下银两，将${item.name}用旧纸包好递来。${result.message}`
      : `月姑姑把药包按回匣底。${result.message}`;
    setSystemMessage(nextMessage);
    setNpcIntroText(nextMessage);
  };

  const npcEntries = useMemo<SubsceneNpcEntry[]>(
    () => [
      {
        id: 'fixed:yue-gugu',
        kind: 'fixed',
        name: '月姑姑',
        identityLabel: '掖庭掌事',
        portraitSrc: YUE_GUGU_PORTRAIT_SRC,
        onClick: () =>
          setNpcIntroText(
            '月姑姑把手里一串旧钥匙慢慢拢进袖中，抬眼只问你一句：“娘娘来此，是问旧档，还是问那些不该摆上台面的东西？”',
          ),
      },
    ],
    [],
  );
  const actionEntries = useMemo<SubsceneActionEntry[]>(
    () => [
      {
        id: 'buy-poison',
        label: '买毒药',
        onClick: () => {
          setNpcIntroText('月姑姑听见你点明来意，便转身从暗格里取出一只旧匣。');
          setShopOpen(true);
        },
      },
    ],
    [],
  );

  return (
    <section className="yeting-yard-view" aria-label="掖庭院场景">
      <MapSubsceneView
        locationId="掖庭院"
        ariaLabel="掖庭院互动"
        npcs={npcEntries}
        actions={actionEntries}
        onLeave={enterMapMain}
      />

      {npcIntroText ? (
        <GlobalDialogueStage
          sceneLabel="月姑姑掖庭院对话场景"
          portraitLabel="月姑姑立绘"
          ariaLabel="掖庭院行动结果"
          className="global-dialogue-stage--chamber"
          dialogueClassName="palace-dialogue-box--chamber"
          portrait={
            <img
              src={YUE_GUGU_PORTRAIT_SRC}
              alt="月姑姑"
              className="global-dialogue-stage__portrait-media global-dialogue-stage__portrait-media--consort"
            />
          }
          characterIdentity="掖庭掌事"
          characterName="月姑姑"
          content={npcIntroText}
          onNextAction={() => setNpcIntroText('')}
        />
      ) : null}

      {shopOpen ? (
        <section className="yeting-yard-view__shop-modal" role="dialog" aria-label="月姑姑毒药货单">
          <header className="yeting-yard-view__shop-header">
            <div>
              <strong>月姑姑的暗匣</strong>
              <span>{`当前银两：${state.silver}`}</span>
            </div>
            <button type="button" onClick={() => setShopOpen(false)}>
              收起
            </button>
          </header>
          <div className="yeting-yard-view__shop-list">
            {poisonCatalog.map((item) => (
              <article key={item.itemId} className="yeting-yard-view__shop-card">
                <div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <span>{`售价：${item.price}两 · 持有：${getOwnedQuantity(item.itemId)}份`}</span>
                </div>
                <button
                  type="button"
                  aria-label={`购买 ${item.name}`}
                  disabled={state.silver < item.price}
                  onClick={() => handleBuyPoison(item)}
                >
                  购买
                </button>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </section>
  );
}
