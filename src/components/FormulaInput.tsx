import { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface FormulaInputProps {
  value: string;
  onChange: (value: string) => void;
  onVerify: () => void;
  onOpenSettings: () => void;
  onOpenFilter: () => void;
  onSaveToFavorites: () => void;
  isVerifying: boolean;
}

export function FormulaInput({
  value,
  onChange,
  onVerify,
  onOpenSettings,
  onOpenFilter,
  onSaveToFavorites,
  isVerifying,
}: FormulaInputProps) {
  const [showHelp, setShowHelp] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    if (textareaRef.current) {
      textareaRef.current.scrollTop = textareaRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    if (value) {
      scrollToBottom();
    }
  }, [value]);

  return (
    <div className="bg-white border-t border-gray-200 flex flex-col shrink-0">
      {/* 帮助按钮行 */}
      <div className="flex justify-between items-center px-4 py-1.5 border-b border-gray-100">
        <button
          onClick={() => setShowHelp(!showHelp)}
          className="text-emerald-600 hover:text-emerald-700 text-xs"
        >
          {showHelp ? '隐藏帮助' : '格式帮助'}
        </button>
      </div>

      {/* 帮助信息 */}
      {showHelp && (
        <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600 space-y-1">
          <p>格式：[规则结果类型]表达式+补偿值=期数</p>
          <p>示例：[D尾数类]期数合+总分合=50</p>
        </div>
      )}

      {/* 输入框 */}
      <div className="px-4 py-2">
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="请输入公式，每行一个&#10;例：[D尾数类]期数合+总分合=50"
          className={cn(
            'w-full h-20 sm:h-24 p-2 rounded-lg border border-gray-300',
            'focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200',
            'resize-none text-xs sm:text-sm font-mono',
            'placeholder:text-gray-400'
          )}
          style={{ whiteSpace: 'pre', overflowWrap: 'normal' }}
        />
      </div>

      {/* 操作按钮行 */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100">
        <div className="flex gap-2">
          <button
            onClick={onOpenSettings}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"
          >
            ⚙️ 设置
          </button>
          <button
            onClick={onOpenFilter}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"
          >
            🔍 筛选
          </button>
          <button
            onClick={onSaveToFavorites}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 flex items-center gap-1"
          >
            ⭐ 收藏
          </button>
        </div>
        
        <button
          onClick={onVerify}
          disabled={isVerifying || !value.trim()}
          className={cn(
            'px-6 py-2 rounded-lg text-sm font-bold',
            'bg-emerald-600 hover:bg-emerald-700 text-white',
            'disabled:opacity-50 disabled:cursor-not-allowed',
            'flex items-center gap-2'
          )}
        >
          {isVerifying ? '⏳ 验证中...' : '▶️ 验证'}
        </button>
      </div>
    </div>
  );
}
