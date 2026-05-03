import { Formula, ResultType, AliasMapping } from '@/types';
import { normalizeElementName } from './elements';
import { getCustomResultTypes, loadAliases } from './storage';
import { chineseToNumber } from './workerShared';

const BUILTIN_RESULT_TYPES: ResultType[] = ['尾数类', '头数类', '合数类', '波色类', '五行类', '肖位类', '单特类', '大小单双类'];

export interface ParsedFormula {
  rule: 'D' | 'L';
  resultType: ResultType;
  expression: string;
  offset: number;
  periods: number;
  leftExpand: number;
  rightExpand: number;
  rawExpression: string;
  originalLineIndex?: number;
}

// 解析公式
export function parseFormula(
  input: string,
  customResultTypes: any[] = getCustomResultTypes(),
  aliases: AliasMapping = loadAliases()
): ParsedFormula | null {
  try {
    // 标准化输入
    let formula = input.trim();
    
    // 处理公式前可能有数字编号的情况（如 "1[L肖位类]..."）
    // 匹配开头的一个或多个数字，后面紧跟着[括号
    formula = formula.replace(/^\d+(?=\[)/, '').trim();
    
    // 先保护完整的元素名称，避免被chineseToNumber错误转换
    // 结果类型
    formula = formula.replace(/五行类/g, '__WUXING_LEI__');
    formula = formula.replace(/肖位类/g, '__XIAOWEI_LEI__');
    formula = formula.replace(/头数类/g, '__TOUSHU_LEI__');
    formula = formula.replace(/尾数类/g, '__WEISHU_LEI__');
    formula = formula.replace(/合数类/g, '__HESHU_LEI__');
    
    // 期数系列 - 使用更安全的占位符，避免被chineseToNumber影响
    // 按长度从长到短替换，避免部分匹配问题
    formula = formula.replace(/期数合尾/g, '<<QISHU_HEWEI>>');
    formula = formula.replace(/期数合/g, '<<QISHU_HE>>');
    formula = formula.replace(/期数尾/g, '<<QISHU_WEI>>');
    formula = formula.replace(/期数/g, '<<QISHU>>');
    // 总分系列 - 按长度从长到短替换
    formula = formula.replace(/总分合尾/g, '<<ZONGFEN_HEWEI>>');
    formula = formula.replace(/总分合/g, '<<ZONGFEN_HE>>');
    formula = formula.replace(/总分尾/g, '<<ZONGFEN_WEI>>');
    formula = formula.replace(/总分/g, '<<ZONGFEN>>');
    
    // 处理元素别名（如"特码波" -> "特波"），在chineseToNumber之前处理用户别名
    formula = normalizeElementName(formula, aliases);
    
    // 转换中文数字为阿拉伯数字
    formula = chineseToNumber(formula);
    
    // 还原元素名称
    formula = formula.replace(/__WUXING_LEI__/g, '五行类');
    formula = formula.replace(/__XIAOWEI_LEI__/g, '肖位类');
    formula = formula.replace(/__TOUSHU_LEI__/g, '头数类');
    formula = formula.replace(/__WEISHU_LEI__/g, '尾数类');
    formula = formula.replace(/__HESHU_LEI__/g, '合数类');
    
    formula = formula.replace(/<<QISHU>>/g, '期数');
    formula = formula.replace(/<<QISHU_WEI>>/g, '期数尾');
    formula = formula.replace(/<<QISHU_HE>>/g, '期数合');
    formula = formula.replace(/<<QISHU_HEWEI>>/g, '期数合尾');
    formula = formula.replace(/<<ZONGFEN>>/g, '总分');
    formula = formula.replace(/<<ZONGFEN_WEI>>/g, '总分尾');
    formula = formula.replace(/<<ZONGFEN_HE>>/g, '总分合');
    formula = formula.replace(/<<ZONGFEN_HEWEI>>/g, '总分合尾');
    
    // 清理补偿值格式（如 +00 -> +0）
    formula = formula.replace(/([+-])0+(\d+)/g, '$1$2');
    
    console.log('标准化后公式:', formula);
    
    // 匹配格式: [规则结果类型]表达式+补偿值=期数左界左扩展右界右扩展
    // 或简化格式: [规则结果类型]表达式=期数
    const fullMatch = formula.match(
      /^\[([DL])([^\]]+)\](.+?)(?:([+-]\d+))?=(\d+)(?:左界(\d+))?(?:右界(\d+))?$/
    );
    
    if (fullMatch) {
      const [, rule, resultType, expression, offsetStr, periodsStr, leftStr, rightStr] = fullMatch;
      
      const allTypes = [...BUILTIN_RESULT_TYPES, ...customResultTypes.map(t => t.name)];
      if (!allTypes.includes(resultType as ResultType)) {
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

// 标准化表达式用于去重（将元素排序）
// 例如 "平3码+特尾" 和 "特尾+平3码" 标准化后都是 "平3码+特尾"
function normalizeExpressionForDedup(expression: string): string {
  // 只处理加法表达式（因为加法满足交换律）
  // 如果包含减法，保持原样（因为减法不满足交换律）
  if (expression.includes('-')) {
    return expression;
  }
  
  // 分割元素并排序 - 使用与buildFormula相同的排序逻辑
  const elements = expression.split('+').map(e => e.trim()).filter(e => e);
  elements.sort((a, b) => a.localeCompare(b, 'zh-CN')); // 使用中文排序确保一致性
  
  return elements.join('+');
}

// 生成标准化的公式键用于去重
export function generateFormulaKey(parsed: ParsedFormula): string {
  const normalizedExpression = normalizeExpressionForDedup(parsed.expression);
  return `${parsed.rule}_${parsed.resultType}_${normalizedExpression}_${parsed.periods}_${parsed.offset}_${parsed.leftExpand}_${parsed.rightExpand}`;
}

// 解析错误信息
export interface ParseError {
  lineNumber: number;
  originalLine: string;
  errorType: 'parse' | 'duplicate';
}

export interface ParsedFormulaWithIndex extends ParsedFormula {
  originalLineIndex: number;
}

// 批量解析公式
export function parseFormulas(
  input: string,
  customResultTypes: any[] = getCustomResultTypes(),
  aliases: AliasMapping = loadAliases()
): { formulas: ParsedFormulaWithIndex[]; errors: ParseError[] } {
  const allLines = input.split('\n');
  const nonEmptyLineIndices: number[] = [];
  const lines: string[] = [];
  
  // 找出所有非空行的原始索引
  for (let i = 0; i < allLines.length; i++) {
    if (allLines[i].trim()) {
      nonEmptyLineIndices.push(i);
      lines.push(allLines[i]);
    }
  }
  
  const results: ParsedFormulaWithIndex[] = [];
  const errors: ParseError[] = [];
  const seen = new Set<string>();
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const originalIndex = nonEmptyLineIndices[i];
    console.log(`处理第 ${i + 1} 行(原始索引 ${originalIndex}):`, line);
    
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
    
    const parsed = parseFormula(cleanLine, customResultTypes, aliases);
    
    if (!parsed) {
      console.error(`第 ${i + 1} 行解析失败:`, cleanLine);
      errors.push({
        lineNumber: i + 1,
        originalLine: line.trim(),
        errorType: 'parse'
      });
      continue;
    }
    
    // 标准化表达式用于去重：将元素排序
    // 例如 "平3码+特尾" 和 "特尾+平3码" 应该被视为同一个公式
    const formulaKey = generateFormulaKey(parsed);
    
    if (!seen.has(formulaKey)) {
      seen.add(formulaKey);
      results.push({
        ...parsed,
        originalLineIndex: originalIndex
      });
      console.log(`第 ${i + 1} 行解析成功`);
    } else {
      console.log(`第 ${i + 1} 行重复，已跳过`);
      errors.push({
        lineNumber: i + 1,
        originalLine: line.trim(),
        errorType: 'duplicate'
      });
    }
  }
  
  // 记录解析失败的数量
  const failedCount = errors.length;
  if (failedCount > 0) {
    console.warn(`解析公式: 成功 ${results.length} 个，失败 ${failedCount} 个`);
  }
  
  return { formulas: results, errors };
}

// 格式化公式输出（带编号）
export function formatFormula(
  index: number,
  totalPeriods: number,
  hitCount: number,
  results: string[],
  hits: boolean[]  // 已经是正确的10期数据，从旧到新
): string {
  const num = (index + 1).toString().padStart(3, '0');
  // hits 已经是正确的10期数据，从旧到新
  const stars = hits.map(h => h ? '★' : '☆').join('');
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
    // 移除 [001] 格式
    let result = line.replace(/^\[\d+\]\s*/, '');
    // 移除 1[ 格式（紧跟 [ 前的数字）
    result = result.replace(/^\d+(?=\[)/, '');
    return result;
  }).join('\n');
}

// 验证表达式中的元素
export function extractElements(expression: string): string[] {
  // 先统一转换中文数字
  const normalized = chineseToNumber(expression);
  // 移除所有加减号和括号，只保留元素名称可能包含的部分
  const cleanExpr = normalized.replace(/[+\-()]/g, ' ');
  const elements: string[] = [];
  
  // 匹配期数系列
  const periodElements = ['期数合尾', '期数合', '期数尾', '上期数', '期数'];
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
