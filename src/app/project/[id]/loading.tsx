/**
 * PROJECT PAGE LOADING STATE
 * ==========================
 * Progressive loading skeleton for project pages
 */

export default function ProjectLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-700 rounded-lg animate-pulse" />
            <div className="space-y-2">
              <div className="h-6 w-48 bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-700/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-24 bg-gray-700 rounded animate-pulse" />
            <div className="h-9 w-32 bg-gray-700 rounded animate-pulse" />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-gray-700/30 rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 50}ms` }}
            />
          ))}
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-3 gap-6">
          <div className="col-span-2 h-96 bg-gray-700/30 rounded-lg animate-pulse" />
          <div className="h-96 bg-gray-700/30 rounded-lg animate-pulse" />
        </div>
      </div>
    </div>
  )
}
