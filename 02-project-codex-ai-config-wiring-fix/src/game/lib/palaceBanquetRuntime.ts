import {
  MUSIC_SCORE_COMPLETION_REQUIRED_PERCENT,
  MUSIC_SCORE_PERFECT_PRESTIGE_REWARD,
  MUSIC_SCORE_PERFECT_THRESHOLD_PERCENT,
} from '../../config/constants';
import {
  resolveMusicScoreDifficulty,
  resolveMusicScorePerformanceCap,
  resolveMusicScorePerformanceScore,
  resolveMusicScoreQualityLabel,
} from './musicScoreRuntime';
import type {
  GameNumericsState,
  MusicHallProgressState,
  PalaceBanquetProgressState,
  PalaceBanquetResultState,
  PalaceTimeState,
} from '../types';

const clampPercent = (value: number): number => Math.max(0, Math.min(200, Math.round(value)));

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
  const submittedMastery = submittedScore ? musicHallProgress.musicScoreMastery?.[submittedScore.itemId] : undefined;
  const difficulty = submittedScore
    ? submittedMastery?.difficulty ?? submittedScore.difficulty ?? resolveMusicScoreDifficulty(submittedScore.color, submittedScore.rarity)
    : undefined;
  const completionPercent = submittedScore ? clampPercent(submittedMastery?.masteryPercent ?? 0) : 0;
  const performanceCap =
    submittedScore && difficulty
      ? resolveMusicScorePerformanceCap({
          masteryPercent: completionPercent,
          difficulty,
          state,
          musicHallProgress,
        })
      : 0;
  const performanceScore = submittedScore
    ? resolveMusicScorePerformanceScore({
        performanceCap,
        seed: `${seasonKey}:${submittedScore.itemId}:${completionPercent}:${difficulty ?? 0}:banquet-performance`,
      })
    : 0;
  const prestigeDelta = submittedScore
    ? performanceScore >= MUSIC_SCORE_PERFECT_THRESHOLD_PERCENT
      ? MUSIC_SCORE_PERFECT_PRESTIGE_REWARD
      : performanceScore >= MUSIC_SCORE_COMPLETION_REQUIRED_PERCENT
        ? submittedScore.color === 'red' || submittedScore.rarity === 'red'
          ? 18
          : 12
        : -5
    : 0;

  const performanceLine = submittedScore
    ? `你以《${submittedScore.name}》应宫宴献艺，${resolveMusicScoreQualityLabel(
        submittedScore.color,
        submittedScore.rarity,
      )}的难度与平日练习一并落到席间。`
    : '你未向妙音堂登记曲谱，本届宫宴只按常例随班入席，并无单独献艺。';
  const scoreLine = submittedScore
    ? `曲谱完成度：${completionPercent}%，难度：${difficulty ?? 0}，表现上限：${performanceCap}，本场表现分：${performanceScore}。`
    : '本届没有登记曲谱，未计算单独献艺表现。';
  const judgementLine =
    performanceScore >= MUSIC_SCORE_PERFECT_THRESHOLD_PERCENT
      ? '一曲既终，席间片刻无声，随后赞声才低低漫开。'
      : performanceScore >= MUSIC_SCORE_COMPLETION_REQUIRED_PERCENT
        ? '曲意稳稳收住，虽未压尽满堂锋芒，却也足够教人记下。'
        : submittedScore
          ? '曲谱虽已登记，临场仍显生涩，司乐女官只按常例记名。'
          : '宫宴灯火如昼，你这一席没有额外出挑，也没有招来错处。';
  const prestigeLine =
    prestigeDelta > 0
      ? `本届宫宴使你的声望提升${prestigeDelta}。`
      : prestigeDelta < 0
        ? `本届宫宴失了分寸，你的声望降低${Math.abs(prestigeDelta)}。`
        : '本届宫宴没有带来额外声望变化。';
  const summary = `${performanceLine}${scoreLine}${judgementLine}${prestigeLine}`;

  return {
    result: {
      seasonKey,
      completedAt,
      scoreName: submittedScore?.name,
      completionPercent,
      difficulty,
      performanceCap: submittedScore ? performanceCap : undefined,
      performanceScore: submittedScore ? performanceScore : undefined,
      prestigeDelta,
      summary,
    },
    lines: [performanceLine, scoreLine, judgementLine, prestigeLine],
  };
};
