/**
 * INTELLIGENCE PAGE LOADING STATE
 * ================================
 * Progressive loading skeleton for intelligence analysis
 */

export default function IntelligenceLoading() {
  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-72 bg-gray-700/50 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-28 bg-gray-700 rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array(4).fill(0).map((_, i) => (
          <div
            key={i}
            className="h-28 bg-gray-700/30 rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 80}ms` }}
          />
        ))}
      </div>

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-1">
          {Array(5).fill(0).map((_, i) => (
            <div
              key={i}
              className="h-10 w-24 bg-gray-700/50 rounded animate-pulse"
              style={{ animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-72 bg-gray-700/30 rounded-lg animate-pulse" />
          <div className="h-72 bg-gray-700/30 rounded-lg animate-pulse" />
        </div>

        {/* List */}
        <div className="h-64 bg-gray-700/30 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
