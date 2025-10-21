/**
 * Client-side cache clearing utilities
 * Clear browser storage, IndexedDB, and service worker caches
 */

export interface ClearCacheOptions {
  localStorage?: boolean;
  sessionStorage?: boolean;
  indexedDB?: boolean;
  serviceWorker?: boolean;
  cookies?: boolean;
}

/**
 * Clear localStorage
 */
export function clearLocalStorage(): void {
  try {
    localStorage.clear();
    console.log('✅ localStorage cleared');
  } catch (error) {
    console.error('❌ Failed to clear localStorage:', error);
  }
}

/**
 * Clear sessionStorage
 */
export function clearSessionStorage(): void {
  try {
    sessionStorage.clear();
    console.log('✅ sessionStorage cleared');
  } catch (error) {
    console.error('❌ Failed to clear sessionStorage:', error);
  }
}

/**
 * Clear IndexedDB databases
 */
export async function clearIndexedDB(): Promise<void> {
  try {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      if (db.name) {
        indexedDB.deleteDatabase(db.name);
        console.log(`✅ Deleted IndexedDB: ${db.name}`);
      }
    }
  } catch (error) {
    console.error('❌ Failed to clear IndexedDB:', error);
  }
}

/**
 * Clear service worker caches
 */
export async function clearServiceWorkerCaches(): Promise<void> {
  try {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          console.log(`✅ Cleared cache: ${cacheName}`);
          return caches.delete(cacheName);
        })
      );
    }
  } catch (error) {
    console.error('❌ Failed to clear service worker caches:', error);
  }
}

/**
 * Clear cookies
 */
export function clearCookies(): void {
  try {
    document.cookie.split(';').forEach((c) => {
      document.cookie = c
        .replace(/^ +/, '')
        .replace(/=.*/, `=;expires=${new Date().toUTCString()};path=/`);
    });
    console.log('✅ Cookies cleared');
  } catch (error) {
    console.error('❌ Failed to clear cookies:', error);
  }
}

/**
 * Clear all browser caches
 */
export async function clearAllCaches(
  options: ClearCacheOptions = {
    localStorage: true,
    sessionStorage: true,
    indexedDB: true,
    serviceWorker: true,
    cookies: true,
  }
): Promise<void> {
  console.log('🧹 Clearing all browser caches...');

  if (options.localStorage) clearLocalStorage();
  if (options.sessionStorage) clearSessionStorage();
  if (options.cookies) clearCookies();
  if (options.serviceWorker) await clearServiceWorkerCaches();
  if (options.indexedDB) await clearIndexedDB();

  console.log('🎉 All caches cleared!');
}

/**
 * Hook to add clear cache button to your component
 * Usage: <button onClick={() => clearAllCaches()}>Clear Cache</button>
 */
export function useClearCache() {
  return {
    clearAll: clearAllCaches,
    clearLocal: clearLocalStorage,
    clearSession: clearSessionStorage,
    clearSW: clearServiceWorkerCaches,
    clearIDB: clearIndexedDB,
    clearCookies,
  };
}
