export type CraftWorkFormulaId = 'craftProgressGain' | 'craftQualityScore' | 'craftSalePrice' | 'craftFavorDelta';

/**
 * 作品制作公式页。
 *
 * 只维护完整公式表达式与策划注释；作品题材、难度等表格型参数在 craft_works.csv。
 */
export const craftWorkFormulaPage: Record<CraftWorkFormulaId, { expression: string; note: string }> = {
  craftProgressGain: {
    expression:
      'clamp(round(18 + mainSkill * 0.18 + supportSkill * 0.08 - difficulty * 0.16 + variance), 4, 45)',
    note: '单次制作进度。只读取玩家主能力、辅助能力、作品难度和少量稳定浮动；不使用固定平均次数。',
  },
  craftQualityScore: {
    expression:
      'clamp(round(45 + mainSkill * 0.38 + supportSkill * 0.18 + difficulty * 0.18 - max(0, actionCount - 1) * 2), 0, 100)',
    note: '完成质量评分。高能力和高难作品提高上限，制作次数越少略微加分。',
  },
  craftSalePrice: {
    expression: 'max(1, floor(basePrice * (0.75 + difficulty / 100) * qualityMultiplier))',
    note: '完成品出售价格。难度越高、质量越好，价格越高。',
  },
  craftFavorDelta: {
    expression: 'max(1, floor(baseFavorDelta * qualityMultiplier))',
    note: '完成品送礼好感。质量影响礼物价值。',
  },
};
