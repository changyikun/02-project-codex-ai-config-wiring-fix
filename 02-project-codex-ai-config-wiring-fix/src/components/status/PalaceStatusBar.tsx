import { useGameFlowStore } from '../../game/store/gameFlowStore';

const CHINESE_DIGITS = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'] as const;

const toChineseNumber = (value: number) => {
  if (!Number.isFinite(value)) {
    return String(value);
  }

  const normalized = Math.trunc(Math.abs(value));

  if (normalized < 10) {
    return CHINESE_DIGITS[normalized];
  }

  if (normalized < 100) {
    const tens = Math.floor(normalized / 10);
    const ones = normalized % 10;
    const tensLabel = tens === 1 ? '十' : `${CHINESE_DIGITS[tens]}十`;
    return ones === 0 ? tensLabel : `${tensLabel}${CHINESE_DIGITS[ones]}`;
  }

  return String(normalized)
    .split('')
    .map((digit) => CHINESE_DIGITS[Number(digit)] ?? digit)
    .join('');
};

const renderVerticalChars = (label: string) =>
  Array.from(label).map((char, index) => (
    <span key={`${char}-${index}`} className="palace-status__time-char" aria-hidden="true">
      {char}
    </span>
  ));

export function PalaceStatusBar() {
  const time = useGameFlowStore((store) => store.time);
  const state = useGameFlowStore((store) => store.state);

  const timeDateLabel = `${toChineseNumber(time.year)}年${toChineseNumber(time.month)}月${toChineseNumber(time.xun)}旬`;

  return (
    <section className="palace-status" aria-label="时间状态">
      <ul className="palace-status__list">
        <li className="palace-status__item palace-status__item--time">
          <span className="palace-status__time-date" aria-label={timeDateLabel}>
            {renderVerticalChars(timeDateLabel)}
          </span>
          <span className="palace-status__time-slot" aria-label={time.slot}>
            {renderVerticalChars(time.slot)}
          </span>
        </li>
        <li className="palace-status__item palace-status__item--silver">
          <span>{`银两：${state.silver}`}</span>
        </li>
        <li className="palace-status__item palace-status__item--stamina">
          <span>{`体力：${state.stamina}`}</span>
        </li>
      </ul>
    </section>
  );
}
