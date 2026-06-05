import { useMemo, useState } from 'react';
import { buildYetingPoisonCatalog } from '../../game/data/inventoryPresets';
import { useGameFlowStore } from '../../game/store/gameFlowStore';
import type { InventoryItem } from '../../game/types';

export function YetingYardView() {
  const state = useGameFlowStore((store) => store.state);
  const inventory = useGameFlowStore((store) => store.inventory);
  const buyInventoryItem = useGameFlowStore((store) => store.buyInventoryItem);
  const [shopOpen, setShopOpen] = useState(false);
  const [systemMessage, setSystemMessage] = useState(
    '掖庭院里差役往来，旧档、杂役和不能摆到明面上的交易都藏在墙根阴影里。',
  );
  const poisonCatalog = useMemo(() => buildYetingPoisonCatalog(), []);

  const getOwnedQuantity = (itemId: string): number =>
    inventory.find((item) => item.itemId === itemId)?.quantity ?? 0;

  const handleBuyPoison = (item: InventoryItem) => {
    const result = buyInventoryItem(item);
    setSystemMessage(
      result.success
        ? `月姑姑收下银两，将${item.name}用旧纸包好递来。${result.message}`
        : `月姑姑把药包按回匣底。${result.message}`,
    );
  };

  return (
    <section className="yeting-yard-view" aria-label="掖庭院场景">
      <header className="yeting-yard-view__header">
        <span>掖庭院 · 旧役暗巷</span>
        <p>这里不掌体面，只掌活路。想找见不得光的东西，往往要先认得见不得光的人。</p>
      </header>

      <section className="yeting-yard-view__npc-card" aria-label="掖庭院 NPC">
        <div>
          <strong>掖庭掌事 · 月姑姑</strong>
          <p>{systemMessage}</p>
        </div>
        <button type="button" onClick={() => setShopOpen(true)}>
          买毒药
        </button>
      </section>

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
