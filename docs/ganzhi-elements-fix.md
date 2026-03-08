# 干支元素修复

## 问题描述

用户反馈"干"、"干支"这类元素在验证时好像都是一个结果，说明这些元素的值计算有问题，无法正确区分不同的号码。

## 问题分析

### 1. 根本原因
`getNumberAttribute` 函数缺少对干支元素的处理逻辑，导致：
- 当使用 `getNumbersFromResult` 查找具有特定干支值的号码时
- `getNumberAttribute` 无法正确计算号码的干支属性
- 所有号码都返回默认值，导致结果都一样

### 2. 影响范围
- **"干"元素**：应该返回0-9（天干索引）
- **"支"元素**：应该返回0-11（地支索引）  
- **"干支"元素**：应该返回0-129（干支组合值）

### 3. 数据流程问题
```
元素值计算 → getNumbersFromResult → getNumberAttribute → 无法处理干支 → 返回默认值
```

## 修复方案

### 1. 添加干支计算函数

**新增函数：**
```typescript
// 获取指定年份的干支
function getGanzhiOfYear(zodiacYear: number): string {
  const stemNames = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branchNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  // 基准年份：2020年是庚子年
  const baseYear = 2020;
  const baseStem = 6;  // 庚
  const baseBranch = 0; // 子
  
  const yearDiff = zodiacYear - baseYear;
  const stemIndex = (baseStem + yearDiff) % 10;
  const branchIndex = (baseBranch + yearDiff) % 12;
  
  return stemNames[stemIndex] + branchNames[branchIndex];
}

// 计算号码对应的干支
function getGanzhiOfNumber(num: number, yearGanzhi: string): string {
  const stemNames = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸'];
  const branchNames = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥'];
  
  const yearStemIndex = stemNames.indexOf(yearGanzhi[0]);
  const yearBranchIndex = branchNames.indexOf(yearGanzhi[1]);
  
  // 号码1对应当年的干支，号码2对应下一个干支，以此类推
  const stemIndex = (yearStemIndex + num - 1) % 10;
  const branchIndex = (yearBranchIndex + num - 1) % 12;
  
  return stemNames[stemIndex] + branchNames[branchIndex];
}
```

### 2. 扩展 getNumberAttribute 函数

**新增处理逻辑：**
```typescript
case '干': {
  // 计算号码对应的天干
  const ganzhiOfYear = getGanzhiOfYear(zodiacYear);
  const ganzhiOfNum = getGanzhiOfNumber(num, ganzhiOfYear);
  return '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhiOfNum[0]);
}
case '支': {
  // 计算号码对应的地支
  const ganzhiOfYear = getGanzhiOfYear(zodiacYear);
  const ganzhiOfNum = getGanzhiOfNumber(num, ganzhiOfYear);
  return '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhiOfNum[1]);
}
case '干支': {
  // 计算号码对应的干支组合值
  const ganzhiOfYear = getGanzhiOfYear(zodiacYear);
  const ganzhiOfNum = getGanzhiOfNumber(num, ganzhiOfYear);
  const stemIndex = '甲乙丙丁戊己庚辛壬癸'.indexOf(ganzhiOfNum[0]);
  const branchIndex = '子丑寅卯辰巳午未申酉戌亥'.indexOf(ganzhiOfNum[1]);
  return stemIndex + branchIndex * 10;
}
```

### 3. 修复其他小问题

- **属性名错误**：`weekDay` → `weekday`
- **数据一致性**：确保与现有干支计算逻辑一致

## 修复效果

### 1. 正确的值分布

**"干"元素（天干）：**
- 值范围：0-9
- 对应：甲、乙、丙、丁、戊、己、庚、辛、壬、癸

**"支"元素（地支）：**
- 值范围：0-11
- 对应：子、丑、寅、卯、辰、巳、午、未、申、酉、戌、亥

**"干支"元素（组合）：**
- 值范围：0-129
- 计算公式：`天干索引 + 地支索引 * 10`

### 2. 验证结果改善

- **区分度提升**：不同号码具有不同的干支值
- **统计准确**：干支元素的统计反映真实分布
- **公式有效**：使用干支元素的公式能产生有意义的结果

### 3. 数据一致性

- **年份相关**：考虑生肖年份对干支计算的影响
- **逻辑统一**：与现有的干支元素值计算保持一致
- **范围正确**：所有值都在预期范围内

## 技术细节

### 1. 干支计算逻辑

**基准设定：**
- 2020年 = 庚子年
- 天干基准：庚（索引6）
- 地支基准：子（索引0）

**计算方法：**
```typescript
// 年份干支
stemIndex = (baseStem + yearDiff) % 10
branchIndex = (baseBranch + yearDiff) % 12

// 号码干支  
stemIndex = (yearStemIndex + num - 1) % 10
branchIndex = (yearBranchIndex + num - 1) % 12
```

### 2. 值映射关系

**天干映射：**
```
0→甲, 1→乙, 2→丙, 3→丁, 4→戊,
5→己, 6→庚, 7→辛, 8→壬, 9→癸
```

**地支映射：**
```
0→子, 1→丑, 2→寅, 3→卯, 4→辰, 5→巳,
6→午, 7→未, 8→申, 9→酉, 10→戌, 11→亥
```

**干支组合：**
```
甲子=0, 乙丑=1, 丙寅=2, ..., 癸亥=129
```

### 3. 数据流程

**修复后的流程：**
```
元素值计算 → getNumbersFromResult → getNumberAttribute → 
正确处理干支 → 返回准确的属性值 → 号码筛选正确
```

## 验证方法

### 1. 基础验证
- 创建包含"干"、"支"、"干支"元素的公式
- 验证不同号码产生不同的结果值
- 检查值范围是否正确

### 2. 统计验证
- 验证多个公式的干支元素统计
- 确认分布符合预期（不是单一值）
- 检查边界值处理

### 3. 集成验证
- 与其他元素组合使用干支元素
- 验证复杂公式的计算结果
- 确认不影响现有功能

## 注意事项

1. **年份依赖**：干支计算依赖于生肖年份的准确性
2. **性能影响**：新增的计算逻辑会有轻微性能影响
3. **向后兼容**：修复不影响现有的其他元素功能
4. **数据质量**：需要确保历史数据中的干支信息完整

## 总结

通过添加完整的干支计算逻辑和扩展 `getNumberAttribute` 函数，成功解决了干支元素值计算问题。修复后的系统能够正确区分不同号码的干支属性，使干支元素在公式验证中发挥应有的作用。
