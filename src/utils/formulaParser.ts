import { Formula, ResultType } from '@/types';
import { chineseToNumber, normalizeSimplifiedExpression } from './elements';

const RESULT_TYPES: ResultType[] = ['尾数类', '头数类', '合数类', '波色类', '五行类', '肖位类', '单特类'];

export interface ParsedFormula {
  rule: 'D' | 'L';
  resultType: ResultType;
  expression: string;
  offset: number;
  periods: number;
  leftExpand: number;
  rightExpand: number;
  rawExpression: string;
}

// 解析公式
export function parseFormula(input: string): ParsedFormula | null {
  try {
    // 标准化输入
    let formula = input.trim();
    
    // 处理公式前可能有数字编号的情况（如 "1[L肖位类]..."）
    // 匹配开头的一个或多个数字，后面紧跟着[括号
    formula = formula.replace(/^\d+(?=\[)/, '').trim();
    
    // 转换中文数字为阿拉伯数字
    formula = chineseToNumber(formula);
    
    // 处理元素别名（如"特码波" -> "特波"）
    formula = normalizeElementNamesInExpression(formula);
    
    // 清理补偿值格式（如 +00 -> +0）
    formula = formula.replace(/([+-])0+(\d+)/g, '$1$2');
    
    console.log('标准化后公式:', formula);
    
    // 匹配格式: [规则结果类型]表达式+补偿值=期数左左扩展右右扩展
    // 或简化格式: [规则结果类型]表达式=期数
    const fullMatch = formula.match(
      /^\[([DL])(.+类)\](.+?)(?:([+-]\d+))?=(\d+)(?:左(\d+))?(?:右(\d+))?$/
    );
    
    if (fullMatch) {
      const [, rule, resultType, expression, offsetStr, periodsStr, leftStr, rightStr] = fullMatch;
      
      if (!RESULT_TYPES.includes(resultType as ResultType)) {
        console.log('不支持的类型:', resultType);
        return null;
      }
      
      // 清理补偿值（如 +00 -> +0）
      let offset = 0;
      if (offsetStr) {
        offset = parseInt(offsetStr);
      }
      
      console.log('解析成功:', { rule, resultType, expression, offset, periods: parseInt(periodsStr) });
      
      return {
        rule: rule as 'D' | 'L',
        resultType: resultType as ResultType,
        expression: expression.trim(),
        offset,
        periods: parseInt(periodsStr),
        leftExpand: leftStr ? parseInt(leftStr) : 0,
        rightExpand: rightStr ? parseInt(rightStr) : 0,
        rawExpression: input.trim(),
      };
    }
    
    console.log('公式格式不匹配:', formula);
    return null;
  } catch (error) {
    console.error('公式解析错误:', input, error);
    return null;
  }
}

// 标准化表达式中的元素名称
function normalizeElementNamesInExpression(expression: string): string {
  let normalized = expression;
  
  // 先处理简化表达式（如"6波"、"一码"）
  normalized = normalizeSimplifiedExpression(normalized);
  
  // 先处理特殊的"合尾"、"合头"属性（避免被后续正则错误匹配）
  // 处理"平六合尾"、"平6合尾"等格式（平码的合尾属性）
  const pingHeTailPattern = /平([一二三四五六])?(\d)?合尾/g;
  normalized = normalized.replace(pingHeTailPattern, (_match, cn, num) => {
    const cnMap: Record<string, string> = { 
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' 
    };
    const finalNum = num || cnMap[cn] || '1';
    return `__PING${finalNum}HETAIL__`;
  });
  
  // 处理"平六合头"、"平6合头"等格式（平码的合头属性）
  const pingHeHeadPattern = /平([一二三四五六])?(\d)?合头/g;
  normalized = normalized.replace(pingHeHeadPattern, (_match, cn, num) => {
    const cnMap: Record<string, string> = { 
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' 
    };
    const finalNum = num || cnMap[cn] || '1';
    return `__PING${finalNum}HEHEAD__`;
  });
  
  // 处理"平六波"、"平6波"等格式统一为"平6波"（不包括合尾、合头）
  // 属性列表排除了"合"，因为合尾和合头已单独处理
  const pingPattern = /平([一二三四五六])?(\d)?([波头尾肖位段行])/g;
  normalized = normalized.replace(pingPattern, (_match, cn, num, attr) => {
    const cnMap: Record<string, string> = { 
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' 
    };
    const finalNum = num || cnMap[cn] || '1';
    return `平${finalNum}${attr}`;
  });
  
  // 处理"平六合"（平码的合属性，不是合尾也不是合头）
  const pingHePattern = /平([一二三四五六])?(\d)?合(?!头|尾)/g;
  normalized = normalized.replace(pingHePattern, (_match, cn, num) => {
    const cnMap: Record<string, string> = { 
      '一': '1', '二': '2', '三': '3', '四': '4', '五': '5', '六': '6' 
    };
    const finalNum = num || cnMap[cn] || '1';
    return `平${finalNum}合`;
  });
  
  // 还原合尾和合头的占位符
  normalized = normalized.replace(/__PING(\d)HETAIL__/g, '平$1合尾');
  normalized = normalized.replace(/__PING(\d)HEHEAD__/g, '平$1合头');
  
  // 处理特码相关别名
  normalized = normalized.replace(/特码/g, '特');
  normalized = normalized.replace(/特号/g, '特');
  
  // 处理总分相关别名
  normalized = normalized.replace(/总分数/g, '总分');
  
  // 处理期数相关别名
  normalized = normalized.replace(/期数/g, '期数');
  
  return normalized;
}

// 将解析的公式转为Formula对象
export function parsedToFormula(parsed: ParsedFormula): Formula {
  return {
    id: generateFormulaId(),
    expression: parsed.rawExpression,
    rule: parsed.rule,
    resultType: parsed.resultType,
    offset: parsed.offset,
    periods: parsed.periods,
    leftExpand: parsed.leftExpand,
    rightExpand: parsed.rightExpand,
  };
}

// 生成公式ID
function generateFormulaId(): string {
  return `f_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// 批量解析公式
export function parseFormulas(input: string): ParsedFormula[] {
  const lines = input.split('\n').filter(line => line.trim());
  const results: ParsedFormula[] = [];
  const seen = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    console.log(`处理第 ${i + 1} 行:`, line);
    
    // 去掉行号前缀 [001], [002] 等，但保留公式的其他部分
    let cleanLine = line.replace(/^\[\d+\]\s*/, '').trim();
    
    // 处理公式前可能有数字编号的情况（如 "1[L肖位类]..."）
    // 只移除紧跟在 [ 前的数字
    cleanLine = cleanLine.replace(/^(\d+)(?=\[)/, '').trim();
    
    console.log(`清理后:`, cleanLine);
    
    if (!cleanLine) {
      console.log('清理后为空，跳过');
      continue;
    }
    
    const parsed = parseFormula(cleanLine);
    
    if (!parsed) {
      console.error(`第 ${i + 1} 行解析失败:`, cleanLine);
      continue;
    }
    
    // 使用完整公式字符串去重，而不是仅表达式部分
    const formulaKey = `${parsed.rule}_${parsed.resultType}_${parsed.expression}_${parsed.periods}_${parsed.offset}_${parsed.leftExpand}_${parsed.rightExpand}`;
    
    if (!seen.has(formulaKey)) {
      seen.add(formulaKey);
      results.push(parsed);
      console.log(`第 ${i + 1} 行解析成功`);
    } else {
      console.log(`第 ${i + 1} 行重复，已跳过`);
    }
  }
  
  // 记录解析失败的数量
  const failedCount = lines.length - results.length;
  if (failedCount > 0) {
    console.warn(`解析公式: 成功 ${results.length} 个，失败 ${failedCount} 个`);
  }
  
  return results;
}

// 格式化公式输出（带编号）
export function formatFormula(
  index: number,
  totalPeriods: number,
  hitCount: number,
  results: string[],
  hits: boolean[]
): string {
  const num = (index + 1).toString().padStart(3, '0');
  // 只显示最近10期的星号
  const recentHits = hits.slice(-10);
  const stars = recentHits.map(h => h ? '★' : '☆').join('');
  const resultStr = results.join(',');
  
  return `[${num}]${stars}≡${totalPeriods}中${hitCount}次=${resultStr}`;
}

// 为公式自动添加编号
export function addFormulaNumbers(input: string): string {
  const lines = input.split('\n').filter(line => line.trim());
  return lines.map((line, index) => {
    const trimmed = line.trim();
    // 如果已经有编号，则保留
    if (/^\[\d+\]/.test(trimmed)) {
      return trimmed;
    }
    const num = (index + 1).toString().padStart(3, '0');
    return `[${num}]${trimmed}`;
  }).join('\n');
}

// 移除公式编号
export function removeFormulaNumbers(input: string): string {
  return input.split('\n').map(line => {
    return line.replace(/^\[\d+\]\s*/, '');
  }).join('\n');
}

// 验证表达式中的元素
export function extractElements(expression: string): string[] {
  const normalized = chineseToNumber(expression);
  const elements: string[] = [];
  
  // 匹配期数系列
  const periodElements = ['期数合尾', '期数合', '期数尾', '期数'];
  for (const elem of periodElements) {
    if (normalized.includes(elem)) {
      elements.push(elem);
    }
  }
  
  // 匹配总分系列
  const totalElements = ['总分合尾', '总分合', '总分尾', '总分'];
  for (const elem of totalElements) {
    if (normalized.includes(elem)) {
      elements.push(elem);
    }
  }
  
  // 匹配平码系列
  const pingRegex = /平(\d)(号|头|尾|合头|合尾|合|波|段|行|肖位)/g;
  let match;
  while ((match = pingRegex.exec(normalized)) !== null) {
    elements.push(match[0]);
  }
  
  // 匹配特码系列
  const teRegex = /特(号|头|尾|合头|合尾|合|波|段|行|肖位)/g;
  while ((match = teRegex.exec(normalized)) !== null) {
    elements.push(match[0]);
  }
  
  return [...new Set(elements)];
}
