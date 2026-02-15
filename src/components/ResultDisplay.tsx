import { useRef, useEffect, useMemo } from 'react';
import { VerifyResult } from '@/types';
import { formatFormula, ParseError } from '@/utils/formulaParser';
import { countHitsPerPeriod, groupByResultType, aggregateAllNumbers } from '@/utils/calculator';

interface ResultDisplayProps {
  results: VerifyResult[];
  latestPeriod: number;
  targetPeriod: number | null;
  onClear: () => void;
  onCopy: (text: string) => void;
  parseErrors?: ParseError[];
}

export function ResultDisplay({ results, latestPeriod, targetPeriod, onClear, onCopy, parseErrors = [] }: ResultDisplayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  };

  const scrollToTop = () => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = 0;
    }
  };

  // 计算统计数据
  const stats = useMemo(() => {
    if (results.length === 0) {
      return { hitsPerPeriod: [], groupedResults: new Map(), formulaCountByType: new Map(), allNumberCounts: new Map() };
    }
    const { countsMap, formulaCountByType } = groupByResultType(results);
    return {
      hitsPerPeriod: countHitsPerPeriod(results),
      groupedResults: countsMap,
      formulaCountByType,
      allNumberCounts: aggregateAllNumbers(results),
    };
  }, [results]);

  // 生成文本框内容
  const resultText = useMemo(() => {
    if (results.length === 0) {
      return '';
    }

    const { hitsPerPeriod, groupedResults, formulaCountByType, allNumberCounts } = stats;
    const lines: string[] = [];
    
    // 显示验证期数信息
    const periodLabel = targetPeriod ? `目标期数: ${targetPeriod}` : `最新期数: ${latestPeriod}`;
    lines.push(`【验证设置】${periodLabel}`);
    lines.push('');
    
    // 第一层：公式列表
    results.forEach((result, index) => {
      lines.push(formatFormula(
        index,
        result.totalPeriods,
        result.hitCount,
        result.results,
        result.hits
      ));
    });
    
    lines.push('');
    
    // 显示解析错误（如果有）
    if (parseErrors.length > 0) {
      const errorLines = parseErrors.map(err => {
        const errType = err.errorType === 'parse' ? '解析错误' : '重复公式';
        return `[${err.lineNumber.toString().padStart(3, '0')}]${errType}`;
      });
      lines.push(errorLines.join('\n'));
      lines.push('');
    }
    
    // 第二层：近N期开出次数统计
    const periodCounts = hitsPerPeriod.slice(0, 10).map(count => count.toString().padStart(2, '0')).join(',');
    lines.push(`[近${Math.min(10, hitsPerPeriod.length)}期开出次数${periodCounts}]`);
    lines.push('');
    
    // 计算预测期数：如果有目标期数，预测目标期数+1；否则预测最新期数+1
    const basePeriod = targetPeriod || latestPeriod;
    const predictPeriod = basePeriod > 0 ? basePeriod + 1 : basePeriod;
    
    // 第三层：按结果类型分组统计（同类公式的最新一期结果）
    groupedResults.forEach((counts, type) => {
      const byCount = new Map<number, string[]>();
      counts.forEach((count: number, result: string) => {
        if (!byCount.has(count)) {
          byCount.set(count, []);
        }
        byCount.get(count)!.push(result);
      });
      const sortedCounts = Array.from(byCount.entries()).sort((a, b) => a[0] - b[0]);
      // 行数=该类型公式数量，总计=所有公式结果数量的总和
      const formulaCount = formulaCountByType.get(type) || 0;
      const totalResults = Array.from(counts.values() as number[]).reduce((sum, c) => sum + c, 0);
      
      lines.push(`【${type}结果】${predictPeriod}期:`);
      sortedCounts.forEach(([count, resultList]) => {
        lines.push(`〖${count}次〗：${resultList.join(',')}（共${resultList.length}码）`);
      });
      lines.push(`本次运算共${formulaCount}行, 总计${totalResults}码`);
      lines.push('');
    });
    
    // 第四层：全码类结果汇总（所有公式的最新一期结果转换为号码统计）
    if (allNumberCounts.size > 0) {
      const byCount = new Map<number, number[]>();
      allNumberCounts.forEach((count, num) => {
        if (!byCount.has(count)) {
          byCount.set(count, []);
        }
        byCount.get(count)!.push(num);
      });
      const sortedCounts = Array.from(byCount.entries()).sort((a, b) => a[0] - b[0]);
      // 行数=全部公式数量，总计=所有公式结果转换后的号码数量总和
      const formulaCount = results.length;
      const totalNumbers = Array.from(allNumberCounts.values()).reduce((sum, c) => sum + c, 0);
      
      lines.push(`【全码类结果】${predictPeriod}期:`);
      sortedCounts.forEach(([count, numbers]) => {
        const numStr = numbers.sort((a, b) => a - b).map(n => n.toString().padStart(2, '0')).join(',');
        lines.push(`〖${count}次〗：${numStr}（共${numbers.length}码）`);
      });
      lines.push(`本次运算共${formulaCount}行, 总计${totalNumbers}码`);
    }
    
    return lines.join('\n');
  }, [results, stats, latestPeriod, targetPeriod, parseErrors]);

  useEffect(() => {
    scrollToTop();
  }, [results]);

  const handleScrollToBottom = () => {
    scrollToBottom();
  };

  const handleCopyAll = () => {
    onCopy(resultText);
  };

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        <div className="flex items-center justify-end px-4 py-3 bg-white border-t border-gray-200 shrink-0">
          <div className="flex gap-2">
            <button
              onClick={handleScrollToBottom}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300"
            >
              到底部
            </button>
            <button
              onClick={handleCopyAll}
              className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300"
            >
              复制
            </button>
            <button
              onClick={onClear}
              className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200"
            >
              清空
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white">
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-2">
        <textarea
          ref={textareaRef}
          value={resultText}
          readOnly
          className="w-full h-full text-xs sm:text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none"
          style={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        />
      </div>

      <div className="flex items-center justify-end px-4 py-3 bg-white border-t border-gray-200 shrink-0">
        <div className="flex gap-2">
          <button
            onClick={handleScrollToBottom}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300"
          >
            到底部
          </button>
          <button
            onClick={handleCopyAll}
            className="px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg border border-gray-300"
          >
            复制
          </button>
          <button
            onClick={onClear}
            className="px-4 py-2 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200"
          >
            清空
          </button>
        </div>
      </div>
    </div>
  );
}
