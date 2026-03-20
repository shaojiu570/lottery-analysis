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
  // 使用结果中的 targetPeriod（如果有验证过的话），而不是 props 中的 targetPeriod
  // 这样设置变化但没点击验证时不会影响统计
  const stats = useMemo(() => {
    if (results.length === 0) {
      return { hitsPerPeriod: [], displayPeriod: 0, statsPeriods: [], groupedResults: new Map(), formulaCountByType: new Map(), allNumberCounts: new Map() };
    }
    // 使用验证结果中保存的 targetPeriod，而不是 props 中的
    const savedTargetPeriod = results[0]?.targetPeriod ?? targetPeriod;
    
    // 计算全码类结果统计
    const allNumberCounts = aggregateAllNumbers(results);
    // 第二层统计：使用历史开奖记录的固定统计（固定不变）
    const { countsMap, formulaCountByType } = groupByResultType(results, historyData, savedTargetPeriod);
    const hitStats = countHitsPerPeriod(
      results,
      allNumberCounts,
      historyData,
      savedTargetPeriod,
      results[0]?.totalPeriods || 10
    );
    return {
      hitsPerPeriod: hitStats.counts,
      displayPeriod: hitStats.displayPeriod,
      statsPeriods: hitStats.statsPeriods,
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

    const { hitsPerPeriod, displayPeriod, statsPeriods, groupedResults, formulaCountByType, allNumberCounts } = stats;
    const lines: string[] = [];
    const isVerifyMode = targetPeriod !== null && targetPeriod !== undefined;
    const verifyPeriodData = isVerifyMode ? historyData.find(d => d.period === targetPeriod) : null;
    const teNum = verifyPeriodData?.numbers[6];
    const targetZodiacYear = verifyPeriodData?.zodiacYear;
    const periodLabel = isVerifyMode ? `验证期: ${targetPeriod}` : `预测期: ${displayPeriod} (基于${latestPeriod}期数据)`;
    lines.push(`【验证设置】${periodLabel}`);
    lines.push('');
    results.forEach((result, index) => {
      // 获取要显示的10期数据（根据验证目标期数）
      const savedTargetPeriod = result.targetPeriod;
      
      // 验证模式：用目标期-1；预测模式：用最新期
      let statsTarget: number;
      if (savedTargetPeriod !== null && savedTargetPeriod !== undefined) {
        statsTarget = savedTargetPeriod - 1;
      } else if (targetPeriod !== null && targetPeriod !== undefined) {
        // 如果 props 中的 targetPeriod 有值（验证模式）
        statsTarget = targetPeriod - 1;
      } else {
        // 预测模式：用最新期
        statsTarget = latestPeriod;
      }
      
      const displayCount = result.totalPeriods || 10;
      const startPeriod = statsTarget - (displayCount - 1);
      
      // 从 periodResults 中提取这 displayCount 期的命中数据
      const displayHits: boolean[] = [];
      for (let p = startPeriod; p <= statsTarget; p++) {
        const pr = result.periodResults.find(pr => pr.period === p);
        // 只有当 targetValue 有效时才计入命中
        const isValidHit = pr && pr.targetValue !== undefined && !isNaN(pr.targetValue);
        displayHits.push(isValidHit ? (pr.hit ?? false) : false);
      }
      
      // 使用显示的10期中的实际命中次数
      const displayHitCount = displayHits.filter(h => h).length;
      lines.push(formatFormula(index, result.totalPeriods || 10, displayHitCount, result.results, displayHits));
    });
    lines.push('');
    if (parseErrors.length > 0) {
      const errorLines = parseErrors.map(err => `[${err.lineNumber.toString().padStart(3, '0')}]${err.errorType === 'parse' ? '解析错误' : '重复公式'}`);
      lines.push(errorLines.join('\n'));
      lines.push('');
    }
    const periodCounts = hitsPerPeriod.slice(-10).map(count => count.toString().padStart(2, '0')).join(',');
    const modeLabel = isVerifyMode ? `验证期数` : `预测期数`;
    lines.push(`【近10期开出次数】${modeLabel} ${displayPeriod}`);
    lines.push(`命中: ${periodCounts}`);
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
