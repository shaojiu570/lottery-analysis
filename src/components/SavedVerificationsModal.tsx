import { cn } from '@/utils/cn';
import { SavedVerification } from '@/types';

interface SavedVerificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  savedVerifications: SavedVerification[];
  onLoadVerification: (verification: SavedVerification) => void;
  onDeleteVerification: (id: string) => void;
  onClearAll: () => void;
}

export function SavedVerificationsModal({
  isOpen,
  onClose,
  savedVerifications,
  onLoadVerification,
  onDeleteVerification,
  onClearAll,
}: SavedVerificationsModalProps) {

  if (!isOpen) return null;

  const handleLoad = (verification: SavedVerification) => {
    onLoadVerification(verification);
    onClose();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onDeleteVerification(id);
  };

  const handleClearAll = () => {
    if (confirm('确定要清空所有保存的验证记录吗？')) {
      onClearAll();
    }
  };

  // 生肖名称映射
  const zodiacNames: Record<number, string> = {
    1: '鼠', 2: '牛', 3: '虎', 4: '兔',
    5: '龙', 6: '蛇', 7: '马', 8: '羊',
    9: '猴', 10: '鸡', 11: '狗', 12: '猪'
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="bg-emerald-600 text-white px-3 sm:px-4 py-2 sm:py-3 flex items-center justify-between shrink-0">
          <h2 className="font-bold text-base sm:text-lg">💾 已保存的验证记录</h2>
          <button onClick={onClose} className="text-2xl hover:opacity-70 w-8 h-8 flex items-center justify-center">&times;</button>
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
          {/* 工具栏 */}
          <div className="px-3 sm:px-4 py-2 border-b border-gray-200 flex items-center justify-between shrink-0 gap-2">
            <span className="text-sm text-gray-600">
              {savedVerifications.length}条记录
            </span>
            {savedVerifications.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-red-100 hover:bg-red-200 text-red-700 rounded"
              >
                清空全部
              </button>
            )}
          </div>

          {/* 记录列表 */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {savedVerifications.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <p className="text-4xl mb-2">📭</p>
                <p>暂无保存的验证记录</p>
                <p className="text-sm">验证公式后点击"保存"按钮</p>
              </div>
            ) : (
              <div className="space-y-2">
                {savedVerifications.map((verification) => (
                  <div
                    key={verification.id}
                    onClick={() => handleLoad(verification)}
                    className={cn(
                      'bg-white border border-gray-200 rounded-lg p-3 cursor-pointer transition-colors',
                      'hover:border-emerald-300 hover:bg-emerald-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm text-gray-800 truncate">
                            {verification.name}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded">
                            {zodiacNames[verification.zodiacYear]}年
                          </span>
                          {verification.targetPeriod && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded">
                              目标期:{verification.targetPeriod}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500">
                          {verification.results.length}个公式 · 
                          命中率:{(verification.results.reduce((sum, r) => sum + r.hitRate, 0) / verification.results.length * 100).toFixed(0)}% · 
                          {new Date(verification.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <button
                        onClick={(e) => handleDelete(verification.id, e)}
                        className="text-gray-400 hover:text-red-500 text-sm shrink-0 p-1"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
