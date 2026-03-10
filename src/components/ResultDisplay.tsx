import { useRef, useEffect, useMemo, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { VerifyResult, LotteryData, ResultType } from '@/types';
import { formatFormula, ParseError } from '@/utils/formulaParser';
import { groupByResultType, groupFormulaResults, countHitsPerPeriod, aggregateAllNumbers } from '../utils/calculator';
import { resultToText, getNumberAttribute } from '@/utils/mappings';

interface ResultDisplayProps {
  results: VerifyResult[];
  latestPeriod: number;
  targetPeriod: number | null;
  historyData: LotteryData[];
  onClear: () => void;
  onCopy: (text: string) => void;
  parseErrors?: ParseError[];
}

export interface ResultDisplayRef {
  toggleScroll: () => void;
  copyResults: () => void;
  isAtBottom: boolean;
}

export const ResultDisplay = forwardRef<ResultDisplayRef, ResultDisplayProps>(({ results, latestPeriod, targetPeriod, historyData, onClear, onCopy, parseErrors = [] }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // 监听滚动事件，判断是否在底部
  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
      const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 30;
      setIsAtBottom(atBottom);
    }
  }, []);

  const toggleScroll = useCallback(() => {
    if (textareaRef.current) {
      if (isAtBottom) {
        textareaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
      } else {
        textareaRef.current.scrollTo({ top: textareaRef.current.scrollHeight, behavior: 'smooth' });
      }
    }
  }, [isAtBottom]);

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
    // 计算全码类结果统计
    const allNumberCounts = aggregateAllNumbers(results);
    // 第二层统计：使用历史开奖记录的固定统计（固定不变）
    const { countsMap, formulaCountByType } = groupByResultType(results, historyData);
    return {
      hitsPerPeriod: countHitsPerPeriod(allNumberCounts, historyData, results[0]?.targetPeriod, results[0]?.totalPeriods || 10),
      groupedResults: countsMap,
      formulaCountByType,
      allNumberCounts,
    };
  }, [results, historyData, targetPeriod, latestPeriod]);

  // 生成文本框内容
  const resultText = useMemo(() => {
    if (results.length === 0) {
      return '';
    }

    const { hitsPerPeriod, groupedResults, formulaCountByType, allNumberCounts } = stats;
    const lines: string[] = [];
    const isVerifyMode = targetPeriod !== null && targetPeriod !== undefined;
    const displayPeriod = isVerifyMode ? targetPeriod : latestPeriod + 1;
    const verifyPeriodData = isVerifyMode ? historyData.find(d => d.period === targetPeriod) : null;
    const teNum = verifyPeriodData?.numbers[6];
    const targetZodiacYear = verifyPeriodData?.zodiacYear;
    const periodLabel = isVerifyMode ? `验证期: ${targetPeriod}` : `预测期: ${displayPeriod} (基于${latestPeriod}期数据)`;
    lines.push(`【验证设置】${periodLabel}`);
    lines.push('');
    results.forEach((result, index) => {
      lines.push(formatFormula(index, result.totalPeriods, result.hitCount, result.results, result.hits));
    });
    lines.push('');
    if (parseErrors.length > 0) {
      const errorLines = parseErrors.map(err => `[${err.lineNumber.toString().padStart(3, '0')}]${err.errorType === 'parse' ? '解析错误' : '重复公式'}`);
      lines.push(errorLines.join('\n'));
      lines.push('');
    }
    const periodCounts = hitsPerPeriod.slice(-10).map(count => count.toString().padStart(2, '0')).join(',');
    lines.push(`[近${Math.min(10, hitsPerPeriod.length)}期开出次数${periodCounts}]`);
    lines.push('');
    const resultPeriodLabel = isVerifyMode ? displayPeriod : `预测${displayPeriod}`;
    groupedResults.forEach((counts, type) => {
      let teAttrText = '';
      if (teNum !== undefined && targetZodiacYear !== undefined) {
        const teAttrValue = getNumberAttribute(teNum, type as ResultType, targetZodiacYear);
        teAttrText = resultToText(teAttrValue, type as ResultType, targetZodiacYear);
      }
      const byCount = new Map<number, string[]>();
      counts.forEach((count: number, result: string) => {
        if (!byCount.has(count)) byCount.set(count, []);
        byCount.get(count)!.push(result);
      });
      const sortedCounts = Array.from(byCount.entries()).sort((a, b) => a[0] - b[0]);
      const formulaCount = formulaCountByType.get(type) || 0;
      // 修复：统计实际有结果的码数，而不是历史次数总和
      const totalResults = sortedCounts.reduce((sum, [count, resultList]) => sum + resultList.length, 0);
      lines.push(`【${type}结果】${resultPeriodLabel}期:`);
      sortedCounts.forEach(([count, resultList]) => {
        const markedResults = resultList.map(r => r === teAttrText ? `${r}★` : r);
        lines.push(`〖${count}次〗：${markedResults.join(',')}（共${resultList.length}码）`);
      });
      lines.push(`本次运算共${formulaCount}行, 总计${totalResults}码`);
      lines.push('');
    });
    if (allNumberCounts.size > 0) {
      const teNumStr = teNum !== undefined ? teNum.toString().padStart(2, '0') : '';
      const byCount = new Map<number, number[]>();
      allNumberCounts.forEach((count, num) => {
        if (!byCount.has(count)) byCount.set(count, []);
        byCount.get(count)!.push(num);
      });
      const sortedCounts = Array.from(byCount.entries()).sort((a, b) => a[0] - b[0]);
      const formulaCount = results.length;
      const totalNumbers = Array.from(allNumberCounts.values()).reduce((sum, c) => sum + c, 0);
      lines.push(`【全码类结果】${resultPeriodLabel}期:`);
      sortedCounts.forEach(([count, numbers]) => {
        const numStr = numbers.sort((a, b) => a - b).map(n => {
          const str = n.toString().padStart(2, '0');
          return str === teNumStr ? `${str}★` : str;
        }).join(',');
        lines.push(`〖${count}次〗：${numStr}（共${numbers.length}码）`);
      });
      lines.push(`本次运算共${formulaCount}行, 总计${totalNumbers}码`);
    }
    return lines.join('\n');
  }, [results, stats, latestPeriod, targetPeriod, parseErrors, historyData]);

  useEffect(() => {
    scrollToTop();
    // 强制触发滚动检查
    setTimeout(handleScroll, 100);
  }, [results, handleScroll]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      // 初始检查
      handleScroll();
      
      // 使用 ResizeObserver 监听内容变化
      const observer = new ResizeObserver(() => {
        handleScroll();
      });
      observer.observe(textarea);
      
      return () => {
        textarea.removeEventListener('scroll', handleScroll);
        observer.disconnect();
      };
    }
  }, [handleScroll]);

  const copyResults = useCallback(() => {
    onCopy(resultText);
  }, [resultText, onCopy]);

  useImperativeHandle(ref, () => ({
    toggleScroll,
    copyResults,
    isAtBottom,
  }));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
      <div className="flex-1 min-h-0 overflow-hidden px-4 py-2">
        <textarea
          ref={textareaRef}
          value={resultText}
          readOnly
          className="w-full h-full text-[11px] sm:text-xs font-mono bg-gray-50 border border-gray-200 rounded-xl p-4 resize-none focus:outline-none scroll-smooth"
          style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}
        />
      </div>
    </div>
  );
});
