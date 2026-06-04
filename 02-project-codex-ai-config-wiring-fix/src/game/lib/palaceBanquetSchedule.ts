import { SYSTEM_EVENT_RULES } from '../../config/constants';
import type { PalaceTimeState, TimeSlot } from '../types';

export const PALACE_BANQUET_TIME_SLOTS: readonly TimeSlot[] = ['清晨', '上午', '中午', '下午', '傍晚', '夜晚', '深夜'];

const SLOT_COUNT_PER_XUN = PALACE_BANQUET_TIME_SLOTS.length;
const XUN_COUNT_PER_MONTH = 3;
const MONTH_COUNT_PER_YEAR = 12;

export const toPalaceBanquetAbsoluteSlot = (time: Pick<PalaceTimeState, 'year' | 'month' | 'xun' | 'slotIndex'>): number =>
  (((time.year * MONTH_COUNT_PER_YEAR + (time.month - 1)) * XUN_COUNT_PER_MONTH + (time.xun - 1)) * SLOT_COUNT_PER_XUN) +
  time.slotIndex;

export const getPalaceBanquetSeasonKey = (banquetYear: number): string => `${banquetYear}-3-1-palace-banquet`;

export const getPalaceBanquetEventTime = (banquetYear: number): PalaceTimeState => {
  const slotIndex = PALACE_BANQUET_TIME_SLOTS.indexOf(SYSTEM_EVENT_RULES.palaceBanquet.timeSlots[0]);
  return {
    year: banquetYear,
    month: SYSTEM_EVENT_RULES.palaceBanquet.month,
    xun: SYSTEM_EVENT_RULES.palaceBanquet.xun,
    slotIndex,
    slot: PALACE_BANQUET_TIME_SLOTS[slotIndex],
    slotProgress: 0,
  };
};

export const getPalaceBanquetRegistrationStartTime = (banquetYear: number): PalaceTimeState => ({
  year: banquetYear,
  month: 2,
  xun: 1,
  slotIndex: 0,
  slot: PALACE_BANQUET_TIME_SLOTS[0],
  slotProgress: 0,
});

export const resolvePalaceBanquetYearForTime = (time: PalaceTimeState): number => {
  const eventThisYear = getPalaceBanquetEventTime(time.year);
  return toPalaceBanquetAbsoluteSlot(time) < toPalaceBanquetAbsoluteSlot(eventThisYear) ? time.year : time.year + 1;
};

export const resolvePalaceBanquetSeasonKeyForTime = (time: PalaceTimeState): string =>
  getPalaceBanquetSeasonKey(resolvePalaceBanquetYearForTime(time));

export const isPalaceBanquetRegistrationOpen = (time: PalaceTimeState): boolean => {
  const banquetYear = resolvePalaceBanquetYearForTime(time);
  const currentSlot = toPalaceBanquetAbsoluteSlot(time);
  const registrationStart = toPalaceBanquetAbsoluteSlot(getPalaceBanquetRegistrationStartTime(banquetYear));
  const eventStart = toPalaceBanquetAbsoluteSlot(getPalaceBanquetEventTime(banquetYear));
  return currentSlot >= registrationStart && currentSlot < eventStart;
};

export const didCrossPalaceBanquetEvent = (previousTime: PalaceTimeState, nextTime: PalaceTimeState): { crossed: boolean; seasonKey: string } => {
  const banquetYear = resolvePalaceBanquetYearForTime(previousTime);
  const eventSlot = toPalaceBanquetAbsoluteSlot(getPalaceBanquetEventTime(banquetYear));
  const previousSlot = toPalaceBanquetAbsoluteSlot(previousTime);
  const nextSlot = toPalaceBanquetAbsoluteSlot(nextTime);
  return {
    crossed: (previousSlot < eventSlot && nextSlot >= eventSlot) || (previousSlot === eventSlot && nextSlot > eventSlot),
    seasonKey: getPalaceBanquetSeasonKey(banquetYear),
  };
};

export const didCrossPalaceBanquetRegistrationStart = (
  previousTime: PalaceTimeState,
  nextTime: PalaceTimeState,
): { crossed: boolean; seasonKey: string; eventTime: PalaceTimeState } => {
  const banquetYear = resolvePalaceBanquetYearForTime(nextTime);
  const registrationStart = toPalaceBanquetAbsoluteSlot(getPalaceBanquetRegistrationStartTime(banquetYear));
  const previousSlot = toPalaceBanquetAbsoluteSlot(previousTime);
  const nextSlot = toPalaceBanquetAbsoluteSlot(nextTime);
  return {
    crossed:
      (previousSlot < registrationStart && nextSlot >= registrationStart) ||
      (previousSlot === registrationStart && nextSlot > registrationStart),
    seasonKey: getPalaceBanquetSeasonKey(banquetYear),
    eventTime: getPalaceBanquetEventTime(banquetYear),
  };
};

export const shouldShowPalaceBanquetRegistrationNotice = (
  previousTime: PalaceTimeState,
  nextTime: PalaceTimeState,
  lastRegistrationNoticeSeasonKey?: string,
  lastResolvedSeasonKey?: string,
): { shouldShow: boolean; seasonKey: string; eventTime: PalaceTimeState } => {
  const registrationStart = didCrossPalaceBanquetRegistrationStart(previousTime, nextTime);
  return {
    shouldShow:
      registrationStart.crossed &&
      lastRegistrationNoticeSeasonKey !== registrationStart.seasonKey &&
      lastResolvedSeasonKey !== registrationStart.seasonKey,
    seasonKey: registrationStart.seasonKey,
    eventTime: registrationStart.eventTime,
  };
};
