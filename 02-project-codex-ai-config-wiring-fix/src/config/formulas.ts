import {
  FORTUNE_POINT_TO_VALUE_RATIO,
  MAIN_ATTRIBUTE_POINT_TO_VALUE_RATIO,
  SKILL_LEVEL_TO_VALUE_RATIO,
} from './constants';

/* 本文件数据来源于《游戏架构目录》，版本号 v1.0.0，生成时间 2026-04-17 16:02 */

const toSafeNonNegativeInteger = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(0, Math.round(value));
};

/**
 * 将健康资质点转换为游戏内数值。
 * 输入单位：资质点；输出单位：健康游戏值。
 * 公式：健康游戏值 = 健康资质点 * 转换系数。
 */
export const convertHealthPoints = (
  attributeValue: number,
  coefficient = MAIN_ATTRIBUTE_POINT_TO_VALUE_RATIO,
): number => toSafeNonNegativeInteger(attributeValue * coefficient);

/**
 * 将心计资质点转换为游戏内数值。
 * 输入单位：资质点；输出单位：心计游戏值。
 * 公式：心计游戏值 = 心计资质点 * 转换系数。
 */
export const convertIntriguePoints = (
  attributeValue: number,
  coefficient = MAIN_ATTRIBUTE_POINT_TO_VALUE_RATIO,
): number => toSafeNonNegativeInteger(attributeValue * coefficient);

/**
 * 将容貌资质点转换为游戏内数值。
 * 输入单位：资质点；输出单位：容貌游戏值。
 * 公式：容貌游戏值 = 容貌资质点 * 转换系数。
 */
export const convertAppearancePoints = (
  attributeValue: number,
  coefficient = MAIN_ATTRIBUTE_POINT_TO_VALUE_RATIO,
): number => toSafeNonNegativeInteger(attributeValue * coefficient);

/**
 * 将气质资质点转换为游戏内数值。
 * 输入单位：资质点；输出单位：气质游戏值。
 * 公式：气质游戏值 = 气质资质点 * 转换系数。
 */
export const convertTemperamentPoints = (
  attributeValue: number,
  coefficient = MAIN_ATTRIBUTE_POINT_TO_VALUE_RATIO,
): number => toSafeNonNegativeInteger(attributeValue * coefficient);

/**
 * 将福德资质点转换为游戏内数值。
 * 输入单位：资质点；输出单位：福德游戏值。
 * 公式：福德游戏值 = 福德资质点 * 转换系数。
 */
export const convertFortunePoints = (
  attributeValue: number,
  coefficient = FORTUNE_POINT_TO_VALUE_RATIO,
): number => toSafeNonNegativeInteger(attributeValue * coefficient);

/**
 * 将技能等级转换为游戏内数值。
 * 输入单位：技能等级；输出单位：技能游戏值。
 * 公式：技能游戏值 = 技能等级 * 转换系数。
 */
export const convertSkillLevel = (
  attributeValue: number,
  coefficient = SKILL_LEVEL_TO_VALUE_RATIO,
): number => toSafeNonNegativeInteger(attributeValue * coefficient);
