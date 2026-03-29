/**
 * AUTOMATION PAGE LOADING STATE
 * ==============================
 */

export default function AutomationLoading() {
  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-64 bg-gray-700/50 rounded animate-pulse" />
        </div>
        <div className="h-9 w-28 bg-gray-700 rounded animate-pulse" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1">
        {Array(5).fill(0).map((_, i) => (
          <div
            key={i}
            className="h-10 w-28 bg-gray-700/50 rounded animate-pulse"
            style={{ animationDelay: `${i * 30}ms` }}
          />
        ))}
      </div>

      {/* Content */}
      <div className="grid grid-cols-3 gap-4">
        {Array(3).fill(0).map((_, i) => (
          <div
            key={i}
            className="h-48 bg-gray-700/30 rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 100}ms` }}
          />
        ))}
      </div>

      {/* Table */}
      <div className="h-72 bg-gray-700/30 rounded-lg animate-pulse" />
    </div>
  )
}
