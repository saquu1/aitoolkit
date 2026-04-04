/**
 * SERVICE WORKER FOR CACHING
 * ============================
 * Provides offline support and caching strategies
 * 
 * Features:
 * - Static asset caching
 * - API response caching
 * - Cache versioning
 * - Background sync
 * - Push notifications (ready)
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

const CACHE_VERSION = 'v1.0.0'
const CACHE_NAME = `ai-enterprise-architect-${CACHE_VERSION}`
const STATIC_CACHE = `${CACHE_NAME}-static`
const API_CACHE = `${CACHE_NAME}-api`
const IMAGE_CACHE = `${CACHE_NAME}-images`

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/favicon.ico',
  '/logo.svg',
  '/manifest.json',
]

// API routes to cache
const CACHEABLE_API_ROUTES = [
  '/api/tables',
  '/api/projects',
  '/api/views',
  '/api/procedures',
  '/api/modules',
  '/api/dashboard',
  '/api/health',
  '/api/schema',
]

// Cache durations (in seconds)
const CACHE_DURATIONS = {
  static: 7 * 24 * 60 * 60, // 7 days
  api: 5 * 60, // 5 minutes
  images: 30 * 24 * 60 * 60, // 30 days
}

// =============================================================================
// INSTALL EVENT
// =============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...')
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets')
        return cache.addAll(STATIC_ASSETS)
      })
      .then(() => {
        console.log('[SW] Installation complete')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Installation failed:', error)
      })
  )
})

// =============================================================================
// ACTIVATE EVENT
// =============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              // Delete old caches
              return name.startsWith('ai-enterprise-architect-') && 
                     name !== CACHE_NAME &&
                     name !== STATIC_CACHE &&
                     name !== API_CACHE &&
                     name !== IMAGE_CACHE
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name)
              return caches.delete(name)
            })
        )
      })
      .then(() => {
        console.log('[SW] Activation complete')
        return self.clients.claim()
      })
  )
})

// =============================================================================
// FETCH EVENT
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }
  
  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return
  }
  
  // Determine caching strategy
  if (isApiRequest(url.pathname)) {
    event.respondWith(handleApiRequest(request))
  } else if (isImageRequest(url.pathname)) {
    event.respondWith(handleImageRequest(request))
  } else if (isStaticRequest(url.pathname)) {
    event.respondWith(handleStaticRequest(request))
  } else {
    event.respondWith(handleDynamicRequest(request))
  }
})

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if request is for API
 */
function isApiRequest(pathname) {
  return pathname.startsWith('/api/')
}

/**
 * Check if request is for image
 */
function isImageRequest(pathname) {
  return /\.(png|jpg|jpeg|gif|webp|svg|ico)$/i.test(pathname)
}

/**
 * Check if request is for static asset
 */
function isStaticRequest(pathname) {
  return pathname.startsWith('/_next/static/') || 
         pathname.startsWith('/static/') ||
         pathname === '/' ||
         pathname === '/favicon.ico'
}

/**
 * Check if API route is cacheable
 */
function isCacheableApiRoute(pathname) {
  return CACHEABLE_API_ROUTES.some(route => pathname.startsWith(route))
}

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

/**
 * Handle API requests - Network First strategy
 */
async function handleApiRequest(request) {
  const cache = await caches.open(API_CACHE)
  
  // Only cache specific routes
  if (!isCacheableApiRoute(new URL(request.url).pathname)) {
    return fetch(request)
  }
  
  try {
    // Try network first
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Clone and cache the response
      const responseClone = networkResponse.clone()
      const headers = new Headers(responseClone.headers)
      headers.set('sw-cache-time', Date.now().toString())
      
      cache.put(request, new Response(await responseClone.blob(), {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers,
      }))
    }
    
    return networkResponse
  } catch (error) {
    // Network failed, try cache
    console.log('[SW] Network failed, trying cache:', request.url)
    const cachedResponse = await cache.match(request)
    
    if (cachedResponse) {
      // Check if cache is stale
      const cacheTime = parseInt(cachedResponse.headers.get('sw-cache-time') || '0')
      const age = (Date.now() - cacheTime) / 1000
      
      if (age < CACHE_DURATIONS.api) {
        return cachedResponse
      }
    }
    
    // Return error response
    return new Response(JSON.stringify({ 
      error: 'Network error', 
      offline: true 
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    })
  }
}

/**
 * Handle image requests - Cache First strategy
 */
async function handleImageRequest(request) {
  const cache = await caches.open(IMAGE_CACHE)
  
  // Check cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache the image
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Return placeholder for failed images
    return new Response('', { status: 404 })
  }
}

/**
 * Handle static requests - Cache First strategy
 */
async function handleStaticRequest(request) {
  const cache = await caches.open(STATIC_CACHE)
  
  // Check cache first
  const cachedResponse = await cache.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    // Fetch from network
    const networkResponse = await fetch(request)
    
    if (networkResponse.ok) {
      // Cache the response
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/')
    }
    return new Response('', { status: 404 })
  }
}

/**
 * Handle dynamic requests - Stale While Revalidate strategy
 */
async function handleDynamicRequest(request) {
  const cache = await caches.open(CACHE_NAME)
  
  // Start network fetch
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => null)
  
  // Check cache
  const cachedResponse = await cache.match(request)
  
  if (cachedResponse) {
    // Return cached, update in background
    networkPromise.catch(() => {}) // Ignore network errors
    return cachedResponse
  }
  
  // No cache, wait for network
  return networkPromise || new Response('', { status: 404 })
}

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag)
  
  if (event.tag === 'sync-data') {
    event.waitUntil(syncData())
  }
})

async function syncData() {
  // Implement background sync logic here
  console.log('[SW] Syncing data...')
}

// =============================================================================
// PUSH NOTIFICATIONS (Ready for use)
// =============================================================================

self.addEventListener('push', (event) => {
  if (!event.data) return
  
  const data = event.data.json()
  
  const options = {
    body: data.body || 'New notification',
    icon: '/logo.svg',
    badge: '/logo.svg',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: data.actions || [],
  }
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'AI Enterprise Architect', options)
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  
  const url = event.notification.data?.url || '/'
  
  event.waitUntil(
    clients.matchAll({ type: 'window' })
      .then((clientList) => {
        // Check if already open
        for (const client of clientList) {
          if (client.url === url && 'focus' in client) {
            return client.focus()
          }
        }
        // Open new window
        return clients.openWindow(url)
      })
  )
})

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

self.addEventListener('message', (event) => {
  const { type, payload } = event.data || {}
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CLEAR_CACHE':
      clearCache()
      break
      
    case 'CACHE_URLS':
      cacheUrls(payload?.urls || [])
      break
      
    case 'GET_CACHE_SIZE':
      getCacheSize().then((size) => {
        event.ports[0]?.postMessage({ size })
      })
      break
  }
})

async function clearCache() {
  const cacheNames = await caches.keys()
  await Promise.all(cacheNames.map(name => caches.delete(name)))
  console.log('[SW] Cache cleared')
}

async function cacheUrls(urls) {
  const cache = await caches.open(STATIC_CACHE)
  await cache.addAll(urls)
  console.log('[SW] URLs cached:', urls.length)
}

async function getCacheSize() {
  const cacheNames = await caches.keys()
  let totalSize = 0
  
  for (const name of cacheNames) {
    const cache = await caches.open(name)
    const keys = await cache.keys()
    
    for (const request of keys) {
      const response = await cache.match(request)
      if (response) {
        const blob = await response.clone().blob()
        totalSize += blob.size
      }
    }
  }
  
  return totalSize
}

// =============================================================================
// LOGGING
// =============================================================================

console.log('[SW] Service worker loaded, version:', CACHE_VERSION)
