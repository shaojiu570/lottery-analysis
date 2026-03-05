import { cn } from '@/utils/cn';
import { useState, useRef, useEffect } from 'react';

interface HeaderProps {
  onOpenFavorites: () => void;
  onOpenSearch: () => void;
  onOpenHistory: () => void;
  currentZodiac: number;
  onZodiacChange: (zodiac: number) => void;
  onSaveVerification?: () => void;
  hasVerificationResults?: boolean;
  onOpenSavedVerifications?: () => void;
}

const ZODIAC_LIST = [
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

export function Header({ 
  onOpenFavorites, 
  onOpenSearch, 
  onOpenHistory, 
  currentZodiac,
  onZodiacChange,
  onSaveVerification,
  hasVerificationResults = false,
  onOpenSavedVerifications
}: HeaderProps) {
  const [showZodiacSelect, setShowZodiacSelect] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);
  
  const currentZodiacInfo = ZODIAC_LIST.find(z => z.value === currentZodiac) || ZODIAC_LIST[6];

  // 点击外部关闭下拉
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setShowZodiacSelect(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleZodiacSelect = (value: number) => {
    onZodiacChange(value);
    setShowZodiacSelect(false);
  };

  return (
    <header className="bg-emerald-600 text-white shadow-lg sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-end">
          <nav className="flex gap-1 sm:gap-2">
            {/* 生肖年份选择 */}
            <div className="relative" ref={selectRef}>
              <button
                onClick={() => setShowZodiacSelect(!showZodiacSelect)}
                className={cn(
                  'flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg',
                  'bg-emerald-700 hover:bg-emerald-800 transition-colors',
                  'text-xs sm:text-sm font-medium min-w-[44px]',
                  showZodiacSelect && 'bg-emerald-800'
                )}
              >
                <span className="text-base">{currentZodiacInfo.emoji}</span>
                <span className="hidden xs:inline">{currentZodiacInfo.label}</span>
              </button>
              
              {/* 下拉选择框 */}
              {showZodiacSelect && (
                <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[80px] z-50">
                  {ZODIAC_LIST.map((zodiac) => (
                    <button
                      key={zodiac.value}
                      onClick={() => handleZodiacSelect(zodiac.value)}
                      className={cn(
                        'w-full px-3 py-2 text-left text-sm flex items-center gap-2',
                        'hover:bg-gray-100 transition-colors',
                        currentZodiac === zodiac.value ? 'bg-emerald-50 text-emerald-700' : 'text-gray-700'
                      )}
                    >
                      <span>{zodiac.emoji}</span>
                      <span>{zodiac.label}年</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {hasVerificationResults && onSaveVerification && (
              <HeaderButton onClick={onSaveVerification} icon="💾">
                <span className="hidden xs:inline">保存</span>
              </HeaderButton>
            )}
            {onOpenSavedVerifications && (
              <HeaderButton onClick={onOpenSavedVerifications} icon="📂">
                <span className="hidden xs:inline">记录</span>
              </HeaderButton>
            )}
            <HeaderButton onClick={onOpenSearch} icon="🎯">
              <span className="hidden xs:inline">搜索</span>
            </HeaderButton>
            <HeaderButton onClick={onOpenHistory} icon="📋">
              <span className="hidden sm:inline">记录</span>
            </HeaderButton>
          </nav>
        </div>
      </div>
    </header>
  );
}

interface HeaderButtonProps {
  onClick: () => void;
  icon: string;
  children: React.ReactNode;
}

function HeaderButton({ onClick, icon, children }: HeaderButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex items-center justify-center gap-1 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg',
        'bg-emerald-700 hover:bg-emerald-800 transition-colors',
        'text-xs sm:text-sm font-medium min-w-[44px]'
      )}
    >
      <span className="text-base">{icon}</span>
      {children}
    </button>
  );
}
