# 三维系统测试报告

## 测试范围
- 家世13档初始配置覆盖与升序校验
- 等价边界：异国贡女 == 五品官员之女
- 特殊重写：罪臣之后通关重写为四品官员之女
- 福德<0 受孕阻断与次月流产逻辑

## 执行记录
- `npx vitest run server/tests/unit/foundationRules.test.ts`：通过
- `npx vitest run server/tests/integration/foundationPregnancy.test.ts`：通过

## 结论
- 核心规则全部命中预期。
- 福德负值逻辑达到“受孕必失败、已孕次月必流产”要求。
