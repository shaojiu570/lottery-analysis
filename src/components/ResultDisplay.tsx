import { useRef, useEffect, useMemo } from 'react';
import { VerifyResult } from '@/types';
import { formatFormula } from '@/utils/formulaParser';
import { countHitsPerPeriod, groupByResultType, aggregateAllNumbers } from '@/utils/calculator';

interface ResultDisplayProps {
  results: VerifyResult[];
  latestPeriod: number;
  onClear: () => void;
  onCopy: (text: string) => void;
}

export function ResultDisplay({ results, latestPeriod, onClear, onCopy }: ResultDisplayProps) {
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
      return { hitsPerPeriod: [], groupedResults: new Map(), allNumberCounts: new Map() };
    }
    return {
      hitsPerPeriod: countHitsPerPeriod(results),
      groupedResults: groupByResultType(results),
      allNumberCounts: aggregateAllNumbers(results),
    };
  }, [results]);

  // 生成文本框内容
  const resultText = useMemo(() => {
    if (results.length === 0) {
      return '';
    }

    const { hitsPerPeriod, groupedResults, allNumberCounts } = stats;
    const lines: string[] = [];
    
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
    
    // 第二层：近N期开出次数统计
    const periodCounts = hitsPerPeriod.slice(0, 10).map(count => count.toString().padStart(2, '0')).join(',');
    lines.push(`[近${Math.min(10, hitsPerPeriod.length)}期开出次数${periodCounts}]`);
    lines.push('');
    
    // 第三层：按结果类型分组统计
    groupedResults.forEach((counts, type) => {
      const byCount = new Map<number, string[]>();
      counts.forEach((count: number, result: string) => {
        if (!byCount.has(count)) {
          byCount.set(count, []);
        }
        byCount.get(count)!.push(result);
      });
      const sortedCounts = Array.from(byCount.entries()).sort((a, b) => a[0] - b[0]);
      const totalCodes = Array.from(counts.values() as number[]).reduce((sum, c) => sum + c, 0);
      
      lines.push(`【${type}结果】${latestPeriod}期:`);
      sortedCounts.forEach(([count, resultList]) => {
        lines.push(`〖${count}次〗：${resultList.join(',')}（共${resultList.length}码)`);
      });
      lines.push(`〖本次运算共${counts.size}行, 总计${totalCodes}码〗`);
      lines.push('');
    });
    
    // 第四层：全码类结果汇总
    if (allNumberCounts.size > 0) {
      const byCount = new Map<number, number[]>();
      allNumberCounts.forEach((count, num) => {
        if (!byCount.has(count)) {
          byCount.set(count, []);
        }
        byCount.get(count)!.push(num);
      });
      const sortedCounts = Array.from(byCount.entries()).sort((a, b) => a[0] - b[0]);
      const totalCodes = Array.from(allNumberCounts.values()).reduce((sum, c) => sum + c, 0);
      
      lines.push(`【全码类结果】${latestPeriod}期:`);
      sortedCounts.forEach(([count, numbers]) => {
        const numStr = numbers.sort((a, b) => a - b).map(n => n.toString().padStart(2, '0')).join(',');
        lines.push(`〖${count}次〗：${numStr}（共${numbers.length}码)`);
      });
      lines.push(`本次运算共${allNumberCounts.size}行, 总计${totalCodes}码`);
    }
    
    return lines.join('\n');
  }, [results, stats, latestPeriod]);

  useEffect(() => {
    scrollToTop();
  }, [results]);

  // 到底部
  const handleScrollToBottom = () => {
    scrollToBottom();
  };

  // 复制全部
  const handleCopyAll = () => {
    onCopy(resultText);
  };

  // 空结果状态
  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white">
        {/* 底部固定工具栏 - 即使没有结果也显示 */}
        <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 shrink-0">
          <span className="text-xs text-gray-400">等待验证...</span>
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
      {/* 公式数量提示 */}
      <div className="px-4 py-1.5 bg-gray-50 border-b border-gray-200 text-xs text-gray-500 shrink-0">
        共 {results.length} 个公式
      </div>

      {/* 结果内容 - 占据剩余空间 */}
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-2">
        <textarea
          ref={textareaRef}
          value={resultText}
          readOnly
          className="w-full h-full text-xs font-mono bg-gray-50 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none"
          style={{ 
            whiteSpace: 'pre',
            overflowWrap: 'normal',
            overflowX: 'auto'
          }}
        />
      </div>

      {/* 底部固定工具栏 */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-200 shrink-0">
        <span className="text-xs text-gray-400">{results.length}个</span>
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
