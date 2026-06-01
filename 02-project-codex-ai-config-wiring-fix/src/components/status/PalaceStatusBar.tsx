import { useMemo } from 'react';
import { useGameFlowStore } from '../../game/store/gameFlowStore';

export function PalaceStatusBar() {
  const time = useGameFlowStore((store) => store.time);
  const state = useGameFlowStore((store) => store.state);

  const timeLabel = useMemo(() => `${time.year}年${time.month}月${time.xun}旬（${time.slot}）`, [time]);

  return (
    <section className="palace-status" aria-label="时间状态">
      <div className="palace-status__text">
        <p>{timeLabel}</p>
        <p>{`银两：${state.silver}`}</p>
        <p>{`体力：${state.stamina}`}</p>
      </div>
    </section>
  );
}
