import { cn } from '@/utils/cn';

interface HeaderProps {
  onOpenFavorites: () => void;
  onOpenSearch: () => void;
  onOpenHistory: () => void;
}

export function Header({ onOpenFavorites, onOpenSearch, onOpenHistory }: HeaderProps) {
  return (
    <header className="bg-emerald-600 text-white shadow-lg sticky top-0 z-20">
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-2 sm:py-3">
        <div className="flex items-center justify-between">
          <h1 className="text-base sm:text-lg font-bold truncate">
            号码分析工具
          </h1>
          <nav className="flex gap-1 sm:gap-2">
            <HeaderButton onClick={onOpenFavorites} icon="📚">
              <span className="hidden xs:inline">收藏</span>
            </HeaderButton>
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
