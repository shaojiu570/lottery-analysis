# 全码类结果统计修复

## 问题描述

用户反馈全码类结果统计不正确。问题在于统计逻辑没有正确地将各类型公式的结果转换为对应的号码后再进行统计。

## 问题分析

### 修复前的问题

1. **数据源错误**：`aggregateAllNumbers` 函数使用第三层结果 `result.results`
2. **期数处理不当**：只使用最新一期的生肖年份计算所有结果
3. **逻辑不一致**：与 `countHitsPerPeriod` 函数的处理方式不匹配

### 期望的正确逻辑

全码类结果统计应该：
1. 遍历每个公式的所有期数结果
2. 对每个期数，使用对应的生肖年份
3. 将第四层扩展结果（`expandedResults`）转换为号码
4. 统计所有号码的出现次数

## 修复方案

### 1. 数据源修正

**修复前：**
```typescript
// 使用第三层结果（错误）
for (const resultStr of result.results) {
  const numbers = convertResultToNumbers(resultStr, type, zodiacYear);
  // ...
}
```

**修复后：**
```typescript
// 使用第四层扩展结果（正确）
for (const periodResult of result.periodResults) {
  const zodiacYear = getZodiacYearByPeriod(periodResult.period);
  for (const value of periodResult.expandedResults) {
    const numbers = convertResultToNumbers(
      resultToText(value, type, zodiacYear),
      type,
      zodiacYear
    );
    // ...
  }
}
```

### 2. 期数处理优化

**修复前：**
```typescript
// 只使用最新一期计算生肖年份
const period = result.periodResults[result.periodResults.length - 1]?.period || 0;
const zodiacYear = getZodiacYearByPeriod(period);
```

**修复后：**
```typescript
// 每个期数使用自己的生肖年份
for (const periodResult of result.periodResults) {
  const zodiacYear = getZodiacYearByPeriod(periodResult.period);
  // ...
}
```

### 3. 逻辑统一

确保 `aggregateAllNumbers` 与 `countHitsPerPeriod` 使用相同的处理逻辑：
- 都使用第四层 `expandedResults`
- 都使用对应期数的生肖年份
- 都使用 `resultToText` 和 `convertResultToNumbers` 进行转换

## 修复效果

### 1. 统计准确性
- **正确转换**：所有类型的结果都正确转换为对应号码
- **期数匹配**：每个期数使用正确的生肖年份
- **数据一致**：与命中次数统计保持一致

### 2. 显示效果
- **全码类结果**：显示各号码在所有公式结果中的出现次数
- **统计准确**：号码统计反映真实的分布情况
- **格式统一**：与其他类型结果的显示格式保持一致

### 3. 性能考虑
- **计算量增加**：需要处理所有期数而不是只处理最新一期
- **内存使用**：统计所有期的结果数据
- **准确性优先**：牺牲少量性能换取统计准确性

## 技术细节

### 数据结构关系

```
VerifyResult
├── formula: ParsedFormula
├── results: string[]              // 第三层结果（预测期结果）
├── periodResults: PeriodResult[]  // 第四层结果（所有期数结果）
│   ├── period: number
│   ├── expandedResults: any[]     // 扩展结果
│   └── ...
└── ...
```

### 处理流程

1. **遍历公式**：`for (const result of results)`
2. **遍历期数**：`for (const periodResult of result.periodResults)`
3. **计算生肖**：`getZodiacYearByPeriod(periodResult.period)`
4. **转换结果**：`resultToText(value, type, zodiacYear)`
5. **转换号码**：`convertResultToNumbers(...)`
6. **统计计数**：`numberCounts.set(num, count + 1)`

### 关键函数

- `getZodiacYearByPeriod()`: 根据期数计算生肖年份
- `resultToText()`: 将结果值转换为文本
- `convertResultToNumbers()`: 将文本结果转换为号码列表

## 验证方法

### 测试场景
1. **多类型公式**：包含不同结果类型的公式
2. **多期数验证**：验证多个期数的统计
3. **生肖变化**：跨越生肖年份变化的期数
4. **特码标记**：验证特码的星号标记

### 验证步骤
1. 创建包含多种结果类型的公式
2. 执行验证并查看全码类结果统计
3. 手动验证部分结果的号码转换
4. 确认统计数据的准确性

## 注意事项

1. **性能影响**：修复后计算量增加，但准确性显著提升
2. **数据一致性**：确保与其他统计函数的逻辑一致
3. **向后兼容**：修复不影响现有的显示格式
4. **测试覆盖**：需要测试各种边界情况和数据类型

## 总结

通过修复数据源、优化期数处理和统一逻辑，全码类结果统计现在能够正确地将各类型公式的结果转换为号码并进行统计。修复后的统计结果更加准确和可靠，为用户提供了更有价值的数据分析。
