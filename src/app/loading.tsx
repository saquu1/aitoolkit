/**
 * MAIN APP LOADING STATE
 * ======================
 * Shows immediately when navigating to the app
 * Progressive loading - shell UI appears instantly
 */

export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header Skeleton */}
      <header className="border-b border-gray-700/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-gray-700 animate-pulse" />
            <div className="space-y-2">
              <div className="h-5 w-40 bg-gray-700 rounded animate-pulse" />
              <div className="h-3 w-32 bg-gray-700/50 rounded animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="h-8 w-24 bg-gray-700 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse" />
            <div className="h-8 w-8 bg-gray-700 rounded-full animate-pulse" />
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Skeleton */}
        <aside className="w-64 border-r border-gray-700/50 min-h-[calc(100vh-73px)]">
          <nav className="p-4 space-y-2">
            {Array(17).fill(0).map((_, i) => (
              <div
                key={i}
                className="h-12 bg-gray-700/30 rounded-lg animate-pulse"
                style={{ animationDelay: `${i * 50}ms` }}
              />
            ))}
          </nav>
        </aside>

        {/* Main Content Skeleton */}
        <main className="flex-1 p-6">
          <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
              {Array(8).fill(0).map((_, i) => (
                <div
                  key={i}
                  className="h-24 bg-gray-700/30 rounded-lg animate-pulse"
                  style={{ animationDelay: `${i * 100}ms` }}
                />
              ))}
            </div>

            {/* Main Content Area */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-64 bg-gray-700/30 rounded-lg animate-pulse" />
              <div className="h-64 bg-gray-700/30 rounded-lg animate-pulse" />
            </div>

            {/* Table/List Skeleton */}
            <div className="h-96 bg-gray-700/30 rounded-lg animate-pulse" />
          </div>
        </main>
      </div>
    </div>
  )
}
