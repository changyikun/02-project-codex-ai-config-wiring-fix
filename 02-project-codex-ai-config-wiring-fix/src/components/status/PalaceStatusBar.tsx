import { useEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { useGameFlowStore } from '../../game/store/gameFlowStore';

const CALENDAR_FLIP_DURATION_MS = 640;

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

interface CalendarTimePage {
  key: string;
  dateLabel: string;
  slotLabel: string;
}

const renderCalendarPage = (
  page: CalendarTimePage,
  className: string,
  ariaHidden = false,
  pageKey?: string,
) => (
  <div key={pageKey} className={className} aria-hidden={ariaHidden}>
    <span className="palace-status__time-date" aria-label={page.dateLabel}>
      {renderVerticalChars(page.dateLabel)}
    </span>
    <span className="palace-status__time-slot" aria-label={page.slotLabel}>
      {renderVerticalChars(page.slotLabel)}
    </span>
  </div>
);

interface PalaceStatusBarProps {
  className?: string;
  style?: CSSProperties;
}

export function PalaceStatusBar({ className, style }: PalaceStatusBarProps = {}) {
  const time = useGameFlowStore((store) => store.time);
  const state = useGameFlowStore((store) => store.state);

  const timeDateLabel = `${toChineseNumber(time.year)}年${toChineseNumber(time.month)}月${toChineseNumber(time.xun)}旬`;
  const liveTimePage = useMemo<CalendarTimePage>(
    () => ({
      key: `${time.year}-${time.month}-${time.xun}-${time.slot}`,
      dateLabel: timeDateLabel,
      slotLabel: time.slot,
    }),
    [time.month, time.slot, time.xun, time.year, timeDateLabel],
  );
  const [displayedTimePage, setDisplayedTimePage] = useState(liveTimePage);
  const [flippingTimePage, setFlippingTimePage] = useState<CalendarTimePage | null>(null);
  const mountedRef = useRef(false);
  const latestTimeKeyRef = useRef(liveTimePage.key);
  const flipTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      latestTimeKeyRef.current = liveTimePage.key;
      setDisplayedTimePage(liveTimePage);
      return undefined;
    }

    if (liveTimePage.key === latestTimeKeyRef.current) {
      return undefined;
    }

    latestTimeKeyRef.current = liveTimePage.key;

    if (flipTimerRef.current) {
      window.clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }

    const shouldReduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (shouldReduceMotion) {
      setDisplayedTimePage(liveTimePage);
      setFlippingTimePage(null);
      return undefined;
    }

    setFlippingTimePage(liveTimePage);
    flipTimerRef.current = window.setTimeout(() => {
      setDisplayedTimePage(liveTimePage);
      setFlippingTimePage(null);
      flipTimerRef.current = null;
    }, CALENDAR_FLIP_DURATION_MS);

    return undefined;
  }, [liveTimePage]);

  useEffect(
    () => () => {
      if (flipTimerRef.current) {
        window.clearTimeout(flipTimerRef.current);
      }
    },
    [],
  );

  return (
    <section className={`palace-status${className ? ` ${className}` : ''}`} style={style} aria-label="时间状态">
      <ul className="palace-status__list">
        <li
          className={`palace-status__item palace-status__item--time${
            flippingTimePage ? ' is-flipping' : ''
          }`}
        >
          {renderCalendarPage(
            displayedTimePage,
            'palace-status__time-page palace-status__time-page--base',
          )}
          {flippingTimePage
            ? renderCalendarPage(
                flippingTimePage,
                'palace-status__time-page palace-status__time-page--flip',
                true,
                flippingTimePage.key,
              )
            : null}
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
