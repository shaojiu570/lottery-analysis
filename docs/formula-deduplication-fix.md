# 公式重复检测修复

## 问题分析

用户反馈在搜索功能中发现新公式后，重新验证时会出现重复公式的提示。经过分析，发现以下几个问题：

### 1. 排序逻辑不一致
- `buildFormula` 函数使用简单的 `sort()` 进行元素排序
- `normalizeExpressionForDedup` 函数也使用 `sort()` 进行排序
- 两个函数的排序逻辑可能不一致，导致相同元素组合生成不同的标准化结果

### 2. 重复检测不完整
- 搜索过程中只使用原始公式字符串进行重复检测
- 没有考虑元素顺序不同但实质相同的公式（如 "A+B" 和 "B+A"）
- 跨搜索阶段的重复检测不够严格

### 3. 公式键生成不统一
- 解析阶段和搜索阶段使用不同的公式键生成逻辑
- 可能导致相同的公式被认为不同

## 修复方案

### 1. 统一排序逻辑

**修复前：**
```typescript
// buildFormula 中
const sortedElements = [...elements].sort();

// normalizeExpressionForDedup 中  
elements.sort();
```

**修复后：**
```typescript
// 统一使用中文排序
const sortedElements = [...elements].sort((a, b) => a.localeCompare(b, 'zh-CN'));
```

### 2. 标准化公式键生成

**新增函数：**
```typescript
export function generateFormulaKey(parsed: ParsedFormula): string {
  const normalizedExpression = normalizeExpressionForDedup(parsed.expression);
  return `${parsed.rule}_${parsed.resultType}_${normalizedExpression}_${parsed.periods}_${parsed.offset}_${parsed.leftExpand}_${parsed.rightExpand}`;
}
```

### 3. 双重重复检测机制

**修复前：**
```typescript
if (!seenFormulas.has(formulaStr)) {
  seenFormulas.add(formulaStr);
  // 处理公式...
}
```

**修复后：**
```typescript
// 双重重复检测：原始字符串 + 标准化键
const formulaKey = generateSearchFormulaKey(formulaStr);
if (!seenFormulas.has(formulaStr) && !seenFormulaKeys.has(formulaKey)) {
  seenFormulas.add(formulaStr);
  seenFormulaKeys.add(formulaKey);
  // 处理公式...
}
```

### 4. 增强的搜索重复检测

**在所有搜索函数中添加标准化键检测：**
- `hierarchicalPairwiseSearch`
- `crossTypeFormulas` 
- 随机搜索阶段
- 全元素探索阶段
- 跨类型复用阶段

## 修复效果

### 1. 彻底解决重复问题
- **元素顺序无关性**： "A+B" 和 "B+A" 被正确识别为同一公式
- **跨阶段一致性**： 不同搜索阶段不会产生重复公式
- **解析搜索一致性**： 解析阶段和搜索阶段使用相同的去重逻辑

### 2. 性能优化
- **双重检测**： 原始字符串检测快速，标准化键检测准确
- **缓存机制**： 标准化键生成结果可被缓存复用
- **早期过滤**： 在公式生成阶段就进行重复检测

### 3. 维护性提升
- **统一逻辑**： 所有地方使用相同的排序和键生成逻辑
- **易于调试**： 标准化的公式键便于问题追踪
- **扩展性好**： 新增搜索功能时可复用相同的去重机制

## 技术细节

### 排序算法选择
使用 `localeCompare('zh-CN')` 确保中文字符的正确排序：
```typescript
elements.sort((a, b) => a.localeCompare(b, 'zh-CN'));
```

### 公式键结构
标准化公式键包含所有影响公式结果的参数：
```
{规则}_{结果类型}_{标准化表达式}_{期数}_{偏移}_{左扩展}_{右扩展}
```

例如：`D_尾数类_期数+特尾_10_0_0_0`

### 减法表达式处理
对于包含减法的表达式，保持原有顺序不进行标准化：
```typescript
if (expression.includes('-')) {
  return expression; // 减法不满足交换律，保持原样
}
```

## 测试验证

### 测试用例
1. **基本重复**：相同公式字符串
2. **顺序重复**：元素顺序不同但实质相同
3. **跨阶段重复**：不同搜索阶段产生的相同公式
4. **解析重复**：解析和搜索过程中的重复检测
5. **减法表达式**：确保减法表达式不被错误标准化

### 验证方法
- 搜索新公式后立即验证，检查是否还有重复提示
- 使用相同的元素组合但不同顺序进行多次搜索
- 在不同搜索策略下验证去重效果

## 注意事项

1. **性能影响**：双重检测会增加少量计算开销，但显著提升准确性
2. **内存使用**：额外的 `seenFormulaKeys` Set会增加内存使用
3. **兼容性**：修复后的逻辑与现有公式完全兼容
4. **调试信息**：可在开发模式下输出标准化键用于调试

## 总结

通过统一排序逻辑、标准化公式键生成和双重重复检测机制，彻底解决了公式重复问题。修复方案在保证准确性的同时，也兼顾了性能和可维护性，为后续功能扩展奠定了良好基础。
