export type PalaceStrifeFormulaId =
  | 'suspectExposureBonus'
  | 'actualActorSuspicion'
  | 'framedSuspectSuspicion'
  | 'playerTargetSuspicion'
  | 'suspectCandidateMotive'
  | 'rumorAttack'
  | 'poisonDefense'
  | 'rumorDefense'
  | 'actionSuccessRate'
  | 'concealmentSuccessRate'
  | 'initialConvictionRate'
  | 'npcMotive'
  | 'palaceStrifeBribeReduction';

/**
 * 宫斗公式页。
 *
 * 这个目录只放可编辑公式页：完整公式表达式 + 策划注释。
 * 不放解析器、测试、runtime 分支或状态写入逻辑，避免和工程代码混在一起。
 */
export const palaceStrifeFormulaPage: Record<PalaceStrifeFormulaId, { expression: string; note: string }> = {
  suspectExposureBonus: {
    expression: 'max(0, concealmentRoll - concealmentSuccessRate) / 3',
    note: '隐匿掷骰越超过成功率，暴露痕迹越重，折算为初始嫌疑加成。',
  },
  actualActorSuspicion: {
    expression: 'baseConvictionRate + severitySuspectBonus + exposureBonus + actionSuccessBonus',
    note: '实际发起者的初始嫌疑，叠加案件严重度、暴露程度和行动成功痕迹。',
  },
  framedSuspectSuspicion: {
    expression: 'max(70, baseConvictionRate + 25)',
    note: '被嫁祸者被强行推高嫌疑，下限为 70。',
  },
  playerTargetSuspicion: {
    expression: 'max(25, baseConvictionRate - 15)',
    note: '玩家作为被害者时仍被记录在嫌疑册，但初始嫌疑低于案件基础定案率。',
  },
  suspectCandidateMotive: {
    expression: '18 + ambition / 4 + stress / 5 + relationRisk / 3 + intrigue / 30',
    note: '普通候补嫌疑人的动机分，由野心、压力、负关系和心计折算。',
  },
  rumorAttack: {
    expression: 'playerIntrigue / 10',
    note: '造谣行动使用玩家心计折算攻击分。',
  },
  poisonDefense: {
    expression: 'targetIntrigue / 10 + targetFavor / 20 + targetMedicine / 4',
    note: '下毒目标防御，目标心计、宠爱保护和医术都会降低成功率。',
  },
  rumorDefense: {
    expression: 'targetIntrigue / 10 + targetFavor / 20',
    note: '造谣目标防御，目标心计和宠爱保护会降低成功率。',
  },
  actionSuccessRate: {
    expression: 'round(clamp(50 + attack - defense - severityActionModifier - frameActionModifier, 10, 90))',
    note: '主动宫斗行动检定成功率。',
  },
  concealmentSuccessRate: {
    expression:
      'round(clamp(50 + playerIntrigue / 12 - targetIntrigue / 15 + playerFavor / 8 + allyModifier - severityConcealmentModifier - frameConcealmentModifier, 5, 85))',
    note: '主动宫斗隐匿检定成功率。',
  },
  initialConvictionRate: {
    expression:
      'round(clamp(25 + severityConvictionModifier + max(0, concealmentRoll - concealmentSuccessRate) / 2 + actionSuccessBonus + allyConvictionModifier + frameConvictionModifier, 5, 95))',
    note: '隐匿失败后案件初始定案率。',
  },
  npcMotive: {
    expression: 'ambition + stress + relationRisk / 2',
    note: 'NPC 发起宫斗动机分。',
  },
  palaceStrifeBribeReduction: {
    expression: 'floor(max(0, silverSpent) / 20) * 5',
    note: '调查页银两干预折算出的定案率变化幅度。',
  },
};
