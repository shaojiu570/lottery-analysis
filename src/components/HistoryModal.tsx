import { useState } from 'react';
import { cn } from '@/utils/cn';
import { LotteryData } from '@/types';
import { parseHistoryInput } from '@/utils/storage';
import { getWaveColor, getZodiacPosition, getZodiacName, getFiveElement, getFiveElementName } from '@/utils/mappings';

// 生肖选项
const ZODIAC_OPTIONS = [
  { value: 1, label: '鼠', emoji: '🐭' },
  { value: 2, label: '牛', emoji: '🐮' },
  { value: 3, label: '虎', emoji: '🐯' },
  { value: 4, label: '兔', emoji: '🐰' },
  { value: 5, label: '龙', emoji: '🐲' },
  { value: 6, label: '蛇', emoji: '🐍' },
  { value: 7, label: '马', emoji: '🐴' },
  { value: 8, label: '羊', emoji: '🐑' },
  { value: 9, label: '猴', emoji: '🐵' },
  { value: 10, label: '鸡', emoji: '🐔' },
  { value: 11, label: '狗', emoji: '🐕' },
  { value: 12, label: '猪', emoji: '🐷' },
];

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  historyData: LotteryData[];
  onImport: (data: LotteryData[]) => void;
  onClear: () => void;
  onDelete: (period: number) => void;
}

export function HistoryModal({
  isOpen,
  onClose,
  historyData,
  onImport,
  onClear,
  onDelete,
}: HistoryModalProps) {
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  // 导入时使用的生肖年份，独立于顶部栏设置，默认马年（7）
  const [importZodiacYear, setImportZodiacYear] = useState(7);

  if (!isOpen) return null;

  const handleImport = () => {
    const data = parseHistoryInput(importText, importZodiacYear);
    if (data.length > 0) {
      onImport(data);
      setImportText('');
      setShowImport(false);
    }
  };

  const handleExport = () => {
    const text = historyData
      .map(d => {
        const numbersStr = d.numbers.map(n => n.toString().padStart(2, '0')).join(' ');
        if (d.date) {
          return `${d.period} ${d.date} ${numbersStr}`;
        }
        return `${d.period} ${numbersStr}`;
      })
      .join('\n');
    navigator.clipboard.writeText(text);
    alert('已复制到剪贴板');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg">📋 开奖记录</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 工具栏 */}
          <div className="px-3 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between shrink-0 gap-2">
            <span className="text-sm text-gray-600">
              {historyData.length}期
            </span>
            <div className="flex gap-1.5 sm:gap-2">
              <button
                onClick={() => setShowImport(!showImport)}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded"
              >
                📥
              </button>
              <button
                onClick={handleExport}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                📤
              </button>
              <button
                onClick={onClear}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
              >
                🗑️
              </button>
            </div>
          </div>

          {/* 导入区域 */}
          {showImport && (
            <div className="px-3 sm:px-4 py-2 sm:py-3 border-b border-gray-200 bg-gray-50 shrink-0 space-y-2">
              {/* 生肖年份选择 */}
              <div className="flex items-center gap-2">
                <label className="text-xs sm:text-sm text-gray-600">这批记录生肖：</label>
                <select
                  value={importZodiacYear}
                  onChange={(e) => setImportZodiacYear(parseInt(e.target.value))}
                  className="px-2 py-1 text-xs sm:text-sm border border-gray-300 rounded bg-white"
                >
                  {ZODIAC_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.emoji} {option.label}年
                    </option>
                  ))}
                </select>
              </div>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="支持格式：
期数 日期 号码1 号码2...号码7
期数,日期,号码1,号码2...号码7
期数 号码1 号码2...号码7
期数,号码1,号码2...号码7
期数:号码1,号码2...号码7
期数;号码1;号码2...号码7
期数|号码1|号码2...号码7"
                className="w-full h-20 sm:h-24 p-2 text-xs sm:text-sm border border-gray-300 rounded-lg resize-none"
              />
              <div className="flex justify-end">
                <button
                  onClick={handleImport}
                  className="px-4 py-1.5 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
                >
                  确认导入
                </button>
              </div>
            </div>
          )}

          {/* 记录列表 */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {historyData.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-4xl mb-2">📭</p>
                <p>暂无开奖记录</p>
                <p className="text-sm">点击导入添加数据</p>
              </div>
            ) : (
              <div className="space-y-2">
                {historyData.map((item) => (
                  <HistoryItem
                    key={item.period}
                    data={item}
                    onDelete={() => onDelete(item.period)}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface HistoryItemProps {
  data: LotteryData;
  onDelete: () => void;
}

function HistoryItem({ data, onDelete }: HistoryItemProps) {
  // 使用记录中保存的生肖年份（必须是记录时确定的）
  const recordZodiacYear = data.zodiacYear || 7; // 默认马年
  
  return (
    <div className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-2 sm:p-3">
      <div className="flex items-center gap-2 sm:gap-3 overflow-hidden">
        <div className="flex flex-col">
          <span className="text-xs sm:text-sm font-mono text-gray-600 shrink-0">
            {data.period}
          </span>
          {data.date && (
            <span className="text-[10px] text-gray-400 font-mono">
              {data.date}
            </span>
          )}
        </div>
        <div className="flex gap-1 sm:gap-1.5 overflow-x-auto pb-1">
          {data.numbers.slice(0, 6).map((num, i) => (
            <NumberBall key={i} number={num} zodiacYear={recordZodiacYear} />
          ))}
          <span className="text-gray-400 px-0.5 self-center">+</span>
          <NumberBall number={data.numbers[6]} isSpecial zodiacYear={recordZodiacYear} />
        </div>
      </div>
      <button
        onClick={onDelete}
        className="text-gray-400 hover:text-red-500 text-sm shrink-0 w-6 h-6 flex items-center justify-center"
      >
        ✕
      </button>
    </div>
  );
}

interface NumberBallProps {
  number: number;
  isSpecial?: boolean;
  showZodiac?: boolean;
  zodiacYear: number;
}

function NumberBall({ number, isSpecial, showZodiac = true, zodiacYear }: NumberBallProps) {
  const color = getWaveColor(number);
  const zodiac = getZodiacName(getZodiacPosition(number, zodiacYear));
  const fiveElement = getFiveElementName(getFiveElement(number, zodiacYear));
  const colorClasses = {
    0: 'bg-red-500 text-white',
    1: 'bg-blue-500 text-white',
    2: 'bg-green-500 text-white',
  };

  return (
    <div className="flex flex-col items-center gap-0.5 shrink-0">
      <span
        className={cn(
          'inline-flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full text-[10px] sm:text-xs font-bold',
          colorClasses[color as keyof typeof colorClasses],
          isSpecial && 'ring-2 ring-yellow-400 ring-offset-0.5'
        )}
      >
        {number.toString().padStart(2, '0')}
      </span>
      {showZodiac && (
        <span className="text-[8px] sm:text-[10px] text-gray-500 leading-none">
          {zodiac}/{fiveElement}
        </span>
      )}
    </div>
  );
}
