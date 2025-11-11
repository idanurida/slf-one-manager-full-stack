// components/timeline/ProgressIndicator.js
export default function ProgressIndicator({ 
  value, 
  size = 'default', 
  showLabel = false,
  type = 'bar' 
}) {
  if (type === 'circle') {
    return (
      <div className="flex items-center gap-2">
        <div className={`relative ${size === 'sm' ? 'w-8 h-8' : 'w-12 h-12'}`}>
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="3"
            />
            <path
              d="M18 2.0845
                a 15.9155 15.9155 0 0 1 0 31.831
                a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#3B82F6"
              strokeWidth="3"
              strokeDasharray={`${value}, 100`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
              {value}%
            </span>
          </div>
        </div>
        {showLabel && <span className="text-sm text-muted-foreground">Progress</span>}
      </div>
    );
  }

  // Bar type (default)
  return (
    <div className="flex items-center gap-3">
      <div className={`bg-gray-200 rounded-full overflow-hidden ${size === 'sm' ? 'h-2 w-20' : 'h-3 w-32'}`}>
        <div 
          className="bg-blue-500 h-full transition-all duration-500 ease-out"
          style={{ width: `${value}%` }}
        />
      </div>
      {showLabel && (
        <span className={`font-medium ${size === 'sm' ? 'text-xs' : 'text-sm'}`}>
          {value}%
        </span>
      )}
    </div>
  );
}