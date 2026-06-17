export type NightlyFormulaId = 'musicDelta' | 'poetryDelta' | 'shyDelta' | 'curtainDelta' | 'gentleDelta' | 'thirdPartyFavorMagnitude';

/**
 * 侍寝公式页。
 *
 * 这个目录只放可编辑公式页：完整公式表达式 + 策划注释。
 * 不放解析器、测试、runtime 分支或状态写入逻辑，避免和工程代码混在一起。
 */
export const nightlyServiceFormulaPage: Record<NightlyFormulaId, { expression: string; note: string }> = {
  musicDelta: {
    expression: 'music > 8 ? 15 : music > 5 ? 5 : 0',
    note: '抚琴读取乐理：高乐理大幅提高兴致，中等乐理小幅提高兴致。',
  },
  poetryDelta: {
    expression: 'poetry > 8 ? 15 : -10',
    note: '吟诗读取诗词：诗词不足会倒扣兴致。',
  },
  shyDelta: {
    expression: 'temperament > 900 ? 25 : temperament > 800 ? 20 : temperament > 600 ? 10 : -10',
    note: '羞却还从读取气质真值。',
  },
  curtainDelta: {
    expression: 'appearance > 900 ? 25 : appearance > 800 ? 20 : appearance > 600 ? 10 : -10',
    note: '帷幔戏语读取容貌真值。',
  },
  gentleDelta: {
    expression: 'branchIsComfort == 1 ? 20 : 0',
    note: '温言絮语只有安抚皇帝分支提高兴致，美言/诉苦他人不提高兴致。',
  },
  thirdPartyFavorMagnitude: {
    expression: 'thirdPartyFavorMin + hashRemainder',
    note: '第三方美言/抹黑的宠爱变化幅度。',
  },
};
