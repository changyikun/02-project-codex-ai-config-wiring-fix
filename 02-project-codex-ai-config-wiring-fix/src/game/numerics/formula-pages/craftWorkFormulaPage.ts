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
      'clamp(round(30 + mainSkill * 0.32 + supportSkill * 0.12 + difficulty * 0.08 - max(0, actionCount - 1) * 3), 0, 100)',
    note: '完成质量评分。高能力和高难作品提高上限，但精妙成色需要高属性、较高难度和较少制作次数共同满足。',
  },
  craftSalePrice: {
    expression: 'max(1, floor(basePrice * (0.8 + difficulty / 500) * qualityMultiplier))',
    note: '完成品出售价格。difficulty 主要服务制作难度体感，售价只读取归一化后的小幅难度修正；质量也只做小幅修正，避免价格翻倍。',
  },
  craftFavorDelta: {
    expression: 'max(1, floor(baseFavorDelta * qualityMultiplier))',
    note: '完成品送礼好感。质量影响礼物价值。',
  },
};
