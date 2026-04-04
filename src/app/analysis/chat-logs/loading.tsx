/**
 * CHAT LOGS PAGE LOADING STATE
 * ============================
 * Progressive loading skeleton for chat logs analysis
 */

export default function ChatLogsLoading() {
  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-96 bg-gray-700/50 rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 bg-gray-700 rounded animate-pulse" />
          <div className="h-9 w-24 bg-gray-700 rounded animate-pulse" />
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
        {Array(8).fill(0).map((_, i) => (
          <div
            key={i}
            className="h-24 bg-gray-700/30 rounded-lg animate-pulse"
            style={{ animationDelay: `${i * 50}ms` }}
          />
        ))}
      </div>

      {/* Session Selector */}
      <div className="h-20 bg-gray-700/30 rounded-lg animate-pulse" />

      {/* Tabs */}
      <div className="space-y-4">
        <div className="flex gap-1">
          {Array(7).fill(0).map((_, i) => (
            <div
              key={i}
              className="h-10 w-20 bg-gray-700/50 rounded animate-pulse"
              style={{ animationDelay: `${i * 30}ms` }}
            />
          ))}
        </div>

        {/* Content Area */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="h-64 bg-gray-700/30 rounded-lg animate-pulse" />
          <div className="h-64 bg-gray-700/30 rounded-lg animate-pulse" />
        </div>

        {/* Timeline */}
        <div className="h-48 bg-gray-700/30 rounded-lg animate-pulse" />
      </div>
    </div>
  )
}
