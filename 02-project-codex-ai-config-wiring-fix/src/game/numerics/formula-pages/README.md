# 公式页说明

本目录只放“可编辑公式页”，面向策划和系统设计查看。

- `palaceStrifeFormulaPage.ts`：宫斗相关完整公式。
- `nightlyServiceFormulaPage.ts`：侍寝相关完整公式。

规则：

- 每条公式必须是完整表达式，不能拆成 CSV 里的半截 `base`、`bonus`、`divisor`。
- 每条公式必须写 `note`，说明它在玩法中的含义。
- 本目录不放解析器、测试、runtime 分支或状态写入逻辑。
- 公式解析器在 `src/game/numerics/formulas/formulaRuntime.ts`。
- 公式调用包装在 `src/game/numerics/formulas/`。
