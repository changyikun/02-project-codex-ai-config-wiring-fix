import {
  MUSIC_SCORE_COMPLETION_REQUIRED_PERCENT,
  MUSIC_SCORE_PERFECT_PRESTIGE_REWARD,
  MUSIC_SCORE_PERFECT_THRESHOLD_PERCENT,
} from '../../config/constants';
import type {
  GameNumericsState,
  MusicHallProgressState,
  PalaceBanquetProgressState,
  PalaceBanquetResultState,
  PalaceTimeState,
} from '../types';

const getScoreQualityBase = (color?: string, rarity?: string): number => {
  const quality = color ?? rarity;
  if (quality === 'red') {
    return 90;
  }
  if (quality === 'purple') {
    return 70;
  }
  return 45;
};

const clampPercent = (value: number): number => Math.max(0, Math.min(200, Math.round(value)));

const resolveScoreLabel = (color?: string, rarity?: string): string => {
  const quality = color ?? rarity;
  if (quality === 'red') {
    return '红色曲谱';
  }
  if (quality === 'purple') {
    return '紫色曲谱';
  }
  return '寻常曲谱';
};

export interface PalaceBanquetResolutionInput {
  state: GameNumericsState;
  musicHallProgress: MusicHallProgressState;
  palaceBanquetProgress: PalaceBanquetProgressState;
  seasonKey: string;
  completedAt: PalaceTimeState;
}

export interface PalaceBanquetResolution {
  result: PalaceBanquetResultState;
  lines: string[];
}

export const resolvePalaceBanquet = ({
  state,
  musicHallProgress,
  palaceBanquetProgress,
  seasonKey,
  completedAt,
}: PalaceBanquetResolutionInput): PalaceBanquetResolution => {
  const submittedScore =
    palaceBanquetProgress.submittedScore?.seasonKey === seasonKey ? palaceBanquetProgress.submittedScore : undefined;
  const talentBonus = Math.round(Number(state.stats.talent ?? 0) * 6);
  const listenBonus = Math.min(20, musicHallProgress.listenCount * 2);
  const lianQiaoBonus = musicHallProgress.lianQiaoMet
    ? Math.min(20, Math.floor((musicHallProgress.lianQiaoFavor + musicHallProgress.lianQiaoAffection) / 10))
    : 0;
  const completionPercent = submittedScore
    ? clampPercent(getScoreQualityBase(submittedScore.color, submittedScore.rarity) + talentBonus + listenBonus + lianQiaoBonus)
    : clampPercent(35 + talentBonus + Math.floor(listenBonus / 2));
  const prestigeDelta = submittedScore
    ? completionPercent >= MUSIC_SCORE_PERFECT_THRESHOLD_PERCENT
      ? MUSIC_SCORE_PERFECT_PRESTIGE_REWARD
      : completionPercent >= MUSIC_SCORE_COMPLETION_REQUIRED_PERCENT
        ? submittedScore.color === 'red' || submittedScore.rarity === 'red'
          ? 18
          : 12
        : -5
    : 0;

  const performanceLine = submittedScore
    ? `你以《${submittedScore.name}》应宫宴献艺，${resolveScoreLabel(
        submittedScore.color,
        submittedScore.rarity,
      )}的声势与平日练习一并落到席间。`
    : '你未向妙音堂递交曲谱，本届宫宴只按常例随班入席，并无单独献艺。';
  const judgementLine =
    completionPercent >= MUSIC_SCORE_PERFECT_THRESHOLD_PERCENT
      ? '一曲既终，席间片刻无声，随后赞声才低低漫开。'
      : completionPercent >= MUSIC_SCORE_COMPLETION_REQUIRED_PERCENT
        ? '曲意稳稳收住，虽未压尽满堂锋芒，却也足够教人记下。'
        : submittedScore
          ? '曲谱虽已递上，临场仍显生涩，司乐女官只按常例记名。'
          : '宫宴灯火如昼，你这一席没有额外出挑，也没有招来错处。';
  const prestigeLine =
    prestigeDelta > 0
      ? `本届宫宴使你的声望提升${prestigeDelta}。`
      : prestigeDelta < 0
        ? `本届宫宴失了分寸，你的声望降低${Math.abs(prestigeDelta)}。`
        : '本届宫宴没有带来额外声望变化。';
  const summary = `${performanceLine}${judgementLine}${prestigeLine}`;

  return {
    result: {
      seasonKey,
      completedAt,
      scoreName: submittedScore?.name,
      completionPercent,
      prestigeDelta,
      summary,
    },
    lines: [performanceLine, `完成度：${completionPercent}%。`, judgementLine, prestigeLine],
  };
};
