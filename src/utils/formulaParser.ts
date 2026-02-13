import { Formula, ResultType } from '@/types';
import { chineseToNumber } from './elements';

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
    formula = chineseToNumber(formula);
    
    // 匹配格式: [规则结果类型]表达式+补偿值=期数左左扩展右右扩展
    // 或简化格式: [规则结果类型]表达式=期数
    const fullMatch = formula.match(
      /^\[([DL])(.+类)\](.+?)(?:([+-]\d+))?=(\d+)(?:左(\d+))?(?:右(\d+))?$/
    );
    
    if (fullMatch) {
      const [, rule, resultType, expression, offsetStr, periodsStr, leftStr, rightStr] = fullMatch;
      
      if (!RESULT_TYPES.includes(resultType as ResultType)) {
        return null;
      }
      
      return {
        rule: rule as 'D' | 'L',
        resultType: resultType as ResultType,
        expression: expression.trim(),
        offset: offsetStr ? parseInt(offsetStr) : 0,
        periods: parseInt(periodsStr),
        leftExpand: leftStr ? parseInt(leftStr) : 0,
        rightExpand: rightStr ? parseInt(rightStr) : 0,
        rawExpression: input.trim(),
      };
    }
    
    return null;
  } catch {
    return null;
  }
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
  
  for (const line of lines) {
    // 去掉行号前缀 [001], [002] 等
    const cleanLine = line.replace(/^\[\d+\]\s*/, '').trim();
    if (!cleanLine) continue;
    
    const parsed = parseFormula(cleanLine);
    if (parsed && !seen.has(parsed.expression)) {
      seen.add(parsed.expression);
      results.push(parsed);
    }
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
