import {
  RARITY_COLOR_COMMON,
  RARITY_COLOR_EPIC,
  RARITY_COLOR_LEGENDARY,
  RARITY_COLOR_NEUTRAL,
  RARITY_COLOR_RARE,
} from '../../config/constants';
import type { ChamberActionConfig } from '../../config/bedchamber';
import type { PalaceTimeState } from '../types';

interface JiaojiaoGreetingContext {
  family: string;
  rank: string;
  favorLabel: string;
  time: PalaceTimeState;
}

export const canRunChamberAction = (action: ChamberActionConfig, stamina: number): boolean => {
  if (!action.requiresStamina) {
    return true;
  }
  return stamina >= action.staminaCost;
};

export const formatPalaceTime = (time: PalaceTimeState): string =>
  `第${time.year}年 · ${time.month}月 · 第${time.xun}旬 · ${time.slot}`;

export const getRarityColor = (value: number, max: number): string => {
  const safeMax = Math.max(1, max);
  const ratio = Math.max(0, value) / safeMax;

  if (ratio >= 0.8) return RARITY_COLOR_LEGENDARY;
  if (ratio >= 0.6) return RARITY_COLOR_EPIC;
  if (ratio >= 0.35) return RARITY_COLOR_RARE;
  if (ratio > 0) return RARITY_COLOR_COMMON;
  return RARITY_COLOR_NEUTRAL;
};

export const buildJiaojiaoGreeting = ({ family, rank, favorLabel, time }: JiaojiaoGreetingContext): string => {
  const timeHint =
    time.slot === '清晨'
      ? '清晨正适合先理一理今日宫中要紧事。'
      : time.slot === '夜晚'
        ? '夜色一沉，宫里的人心也最容易起波澜。'
        : '娘娘做事还要看时辰，宫里一日有一日的规矩。';

  return `娘娘如今以${rank}之身立于宫中，出身${family}，眼下在后宫里算是${favorLabel}。${timeHint}`;
};
