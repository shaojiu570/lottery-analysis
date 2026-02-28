import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { VerifyResult, LotteryData, ResultType } from '@/types';
import { formatFormula, ParseError } from '@/utils/formulaParser';
import { countHitsPerPeriod, groupByResultType, aggregateAllNumbers } from '@/utils/calculator';
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

export function ResultDisplay({ results, latestPeriod, targetPeriod, historyData, onClear, onCopy, parseErrors = [] }: ResultDisplayProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isAtBottom, setIsAtBottom] = useState(false);

  // 监听滚动事件，判断是否在底部
  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = textareaRef.current;
      // 在一些浏览器中，scrollTop + clientHeight 可能因为浮点数精度或缩放比例略小于 scrollHeight
      // 容差增加到 30px 以应对移动端弹性滚动或浏览器渲染差异
      // 同时也检查是否在顶部（scrollTop < 10）
      const atBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 30;
      setIsAtBottom(atBottom);
    }
  }, []);

  const toggleScroll = () => {
    if (textareaRef.current) {
      if (isAtBottom) {
        // 返回顶部
        textareaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        setIsAtBottom(false);
      } else {
        // 滚到底部
        textareaRef.current.scrollTo({ top: textareaRef.current.scrollHeight, behavior: 'smooth' });
        setIsAtBottom(true);
      }
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
    
    // 每条公式根据自己最新一期的期数计算对应的生肖年份
    const { countsMap, formulaCountByType } = groupByResultType(results);
    
    return {
      hitsPerPeriod: countHitsPerPeriod(results, historyData),
      groupedResults: countsMap,
      formulaCountByType,
      allNumberCounts: aggregateAllNumbers(results),
    };
  }, [results, historyData, targetPeriod, latestPeriod]);

  // 生成文本框内容
  const resultText = useMemo(() => {
    if (results.length === 0) {
      return '';
    }

    const { hitsPerPeriod, groupedResults, formulaCountByType, allNumberCounts } = stats;
    const lines: string[] = [];
    
    // 判断是否为验证模式（指定了目标期数）vs 预测模式（未指定）
    const isVerifyMode = targetPeriod !== null && targetPeriod !== undefined;
    
    // 计算显示期数：验证模式显示目标期，预测模式显示下一期
    const displayPeriod = isVerifyMode ? targetPeriod : latestPeriod + 1;
    
    // 验证模式时显示特码星号（预测模式不显示，因为还没开奖）
    const verifyPeriodData = isVerifyMode 
      ? historyData.find(d => d.period === targetPeriod)
      : null;
    const teNum = verifyPeriodData?.numbers[6];
    // 星号标记使用目标期数对应的生肖年份（从历史数据中获取，而不是计算）
    const targetZodiacYear = verifyPeriodData?.zodiacYear;
    
    // 显示验证期数信息
    const periodLabel = isVerifyMode 
      ? `验证期: ${targetPeriod}` 
      : `预测期: ${displayPeriod} (基于${latestPeriod}期数据)`;
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
    
    // 第二层：近N期开出次数统计（取最新的10期）
    const periodCounts = hitsPerPeriod.slice(-10).map(count => count.toString().padStart(2, '0')).join(',');
    lines.push(`[近${Math.min(10, hitsPerPeriod.length)}期开出次数${periodCounts}]`);
    lines.push('');
    
    // 第三、四层显示的期数标签
    const resultPeriodLabel = isVerifyMode ? displayPeriod : `预测${displayPeriod}`;
    
    // 第三层：按结果类型分组统计（同类公式的最新一期结果）
    groupedResults.forEach((counts, type) => {
      // 计算特码在该类型下的属性值（用于标记星号）
      let teAttrText = '';
      if (teNum !== undefined && targetZodiacYear !== undefined) {
        const teAttrValue = getNumberAttribute(teNum, type as ResultType, targetZodiacYear);
        teAttrText = resultToText(teAttrValue, type as ResultType, targetZodiacYear);
      }
      
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
      
      lines.push(`【${type}结果】${resultPeriodLabel}期:`);
      sortedCounts.forEach(([count, resultList]) => {
        // 给特码对应的属性值加星号
        const markedResults = resultList.map(r => r === teAttrText ? `${r}★` : r);
        lines.push(`〖${count}次〗：${markedResults.join(',')}（共${resultList.length}码）`);
      });
      lines.push(`本次运算共${formulaCount}行, 总计${totalResults}码`);
      lines.push('');
    });
    
    // 第四层：全码类结果汇总（所有公式的最新一期结果转换为号码统计）
    if (allNumberCounts.size > 0) {
      // 特码字符串（用于标记星号）
      const teNumStr = teNum !== undefined ? teNum.toString().padStart(2, '0') : '';
      
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
      
      lines.push(`【全码类结果】${resultPeriodLabel}期:`);
      sortedCounts.forEach(([count, numbers]) => {
        // 给特码加星号
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
  }, [results]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      // 初始化状态
      handleScroll();
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll]);

  const handleCopyAll = () => {
    onCopy(resultText);
  };

  const renderActionButtons = () => (
    <div className="flex gap-2">
      <button
        onClick={toggleScroll}
        className="px-3 py-1.5 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 font-medium transition-colors min-w-[64px]"
      >
        {isAtBottom ? '到顶部' : '到底部'}
      </button>
      <button
        onClick={handleCopyAll}
        className="px-3 py-1.5 text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 font-medium transition-colors"
      >
        复制
      </button>
      <button
        onClick={onClear}
        className="px-3 py-1.5 text-xs bg-red-50 hover:bg-red-100 text-red-600 rounded-lg border border-red-200 font-medium transition-colors"
      >
        清空
      </button>
    </div>
  );

  if (results.length === 0) {
    return (
      <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
        <div className="absolute top-3 right-6 z-10">
          {renderActionButtons()}
        </div>
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
          暂无验证结果
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white relative">
      {/* 固定在右上角的按钮组 */}
      <div className="absolute top-4 right-8 z-10 flex items-center gap-2 bg-white/80 backdrop-blur-sm p-1 rounded-xl shadow-sm border border-gray-100">
        {renderActionButtons()}
      </div>

      <div className="flex-1 min-h-0 overflow-hidden px-4 py-2">
        <textarea
          ref={textareaRef}
          value={resultText}
          readOnly
          className="w-full h-full text-[11px] sm:text-xs font-mono bg-gray-50 border border-gray-200 rounded-xl p-4 pt-12 resize-none focus:outline-none scroll-smooth"
          style={{ 
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-all'
          }}
        />
      </div>
    </div>
  );
}
