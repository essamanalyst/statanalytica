/**
 * Performance Optimization Utilities
 * أدوات تحسين الأداء
 */

// ==================== Memoization ====================

/**
 * تخزين نتائج الدوال المكلفة حسابياً
 */
export function memoize<T extends (...args: any[]) => any>(
  fn: T,
  options: { maxSize?: number; ttl?: number } = {}
): T {
  const { maxSize = 100, ttl = 5 * 60 * 1000 } = options;
  const cache = new Map<string, { value: ReturnType<T>; timestamp: number }>();

  return ((...args: Parameters<T>): ReturnType<T> => {
    const key = JSON.stringify(args);
    const cached = cache.get(key);
    const now = Date.now();

    if (cached && now - cached.timestamp < ttl) {
      return cached.value;
    }

    const result = fn(...args);
    
    // إدارة حجم الكاش
    if (cache.size >= maxSize) {
      const oldestKey = cache.keys().next().value;
      if (oldestKey) cache.delete(oldestKey);
    }

    cache.set(key, { value: result, timestamp: now });
    return result;
  }) as T;
}

// ==================== Debounce & Throttle ====================

/**
 * تأخير تنفيذ الدالة حتى توقف المستخدم
 */
export function debounce<T extends (...args: any[]) => any>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;

  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

/**
 * تحديد عدد مرات تنفيذ الدالة
 */
export function throttle<T extends (...args: any[]) => any>(
  fn: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// ==================== Virtual Scrolling Helper ====================

/**
 * حساب العناصر المرئية للتمرير الافتراضي
 */
export function calculateVisibleItems<T>(
  items: T[],
  scrollTop: number,
  containerHeight: number,
  itemHeight: number,
  overscan: number = 5
): { visibleItems: T[]; startIndex: number; endIndex: number; totalHeight: number } {
  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  return {
    visibleItems: items.slice(startIndex, endIndex),
    startIndex,
    endIndex,
    totalHeight,
  };
}

// ==================== Chunk Processing ====================

/**
 * معالجة البيانات الكبيرة على دفعات
 */
export async function processInChunks<T, R>(
  items: T[],
  processor: (item: T, index: number) => R,
  chunkSize: number = 1000,
  onProgress?: (progress: number) => void
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    const chunkResults = chunk.map((item, idx) => processor(item, i + idx));
    results.push(...chunkResults);

    if (onProgress) {
      onProgress(Math.min(100, ((i + chunkSize) / items.length) * 100));
    }

    // السماح للمتصفح بالتحديث
    await new Promise(resolve => setTimeout(resolve, 0));
  }

  return results;
}

// ==================== Web Worker Helper ====================

/**
 * تنفيذ عمليات ثقيلة في Web Worker
 */
export function runInWorker<T, R>(
  fn: (data: T) => R,
  data: T
): Promise<R> {
  return new Promise((resolve, reject) => {
    const fnString = fn.toString();
    const workerCode = `
      self.onmessage = function(e) {
        const fn = ${fnString};
        try {
          const result = fn(e.data);
          self.postMessage({ success: true, result });
        } catch (error) {
          self.postMessage({ success: false, error: error.message });
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));

    worker.onmessage = (e) => {
      worker.terminate();
      if (e.data.success) {
        resolve(e.data.result);
      } else {
        reject(new Error(e.data.error));
      }
    };

    worker.onerror = (error) => {
      worker.terminate();
      reject(error);
    };

    worker.postMessage(data);
  });
}

// ==================== Memory Management ====================

/**
 * مراقبة استخدام الذاكرة
 */
export function getMemoryUsage(): { used: number; total: number; percentage: number } | null {
  if ('memory' in performance) {
    const memory = (performance as any).memory;
    return {
      used: memory.usedJSHeapSize,
      total: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }
  return null;
}

/**
 * تنظيف الموارد غير المستخدمة
 */
export function cleanupResources(): void {
  // تنظيف الكاش المحلي القديم
  const maxAge = 24 * 60 * 60 * 1000; // 24 ساعة
  const now = Date.now();

  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith('cache_')) {
      try {
        const item = JSON.parse(localStorage.getItem(key) || '{}');
        if (now - item.timestamp > maxAge) {
          localStorage.removeItem(key);
        }
      } catch {
        localStorage.removeItem(key!);
      }
    }
  }
}

// ==================== Lazy Loading ====================

/**
 * تحميل البيانات عند الحاجة
 */
export function createLazyLoader<T>(
  loader: () => Promise<T>,
  options: { cache?: boolean; ttl?: number } = {}
): () => Promise<T> {
  const { cache = true, ttl = 5 * 60 * 1000 } = options;
  let cachedValue: T | null = null;
  let cachedTime: number = 0;
  let loadingPromise: Promise<T> | null = null;

  return async () => {
    const now = Date.now();

    if (cache && cachedValue && now - cachedTime < ttl) {
      return cachedValue;
    }

    if (loadingPromise) {
      return loadingPromise;
    }

    loadingPromise = loader().then((value) => {
      cachedValue = value;
      cachedTime = now;
      loadingPromise = null;
      return value;
    });

    return loadingPromise;
  };
}

// ==================== Performance Monitoring ====================

/**
 * قياس وقت التنفيذ
 */
export function measureTime<T>(
  fn: () => T,
  label?: string
): { result: T; duration: number } {
  const start = performance.now();
  const result = fn();
  const duration = performance.now() - start;

  if (label) {
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

/**
 * قياس وقت التنفيذ للدوال غير المتزامنة
 */
export async function measureTimeAsync<T>(
  fn: () => Promise<T>,
  label?: string
): Promise<{ result: T; duration: number }> {
  const start = performance.now();
  const result = await fn();
  const duration = performance.now() - start;

  if (label) {
    console.log(`⏱️ ${label}: ${duration.toFixed(2)}ms`);
  }

  return { result, duration };
}

// ==================== Request Animation Frame Helper ====================

/**
 * تنفيذ تحديثات الواجهة بكفاءة
 */
export function scheduleUpdate(callback: () => void): number {
  return requestAnimationFrame(callback);
}

/**
 * إلغاء تحديث مجدول
 */
export function cancelUpdate(id: number): void {
  cancelAnimationFrame(id);
}

// ==================== Intersection Observer Helper ====================

/**
 * مراقبة ظهور العناصر في الشاشة
 */
export function observeVisibility(
  element: Element,
  callback: (isVisible: boolean) => void,
  options: IntersectionObserverInit = {}
): () => void {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        callback(entry.isIntersecting);
      });
    },
    { threshold: 0.1, ...options }
  );

  observer.observe(element);

  return () => observer.disconnect();
}

// ==================== Data Compression ====================

/**
 * ضغط البيانات للتخزين
 */
export function compressData(data: any): string {
  const jsonString = JSON.stringify(data);
  // استخدام base64 بسيط للتقليل من الحجم
  return btoa(encodeURIComponent(jsonString));
}

/**
 * فك ضغط البيانات
 */
export function decompressData<T>(compressed: string): T {
  const jsonString = decodeURIComponent(atob(compressed));
  return JSON.parse(jsonString);
}

// ==================== Batch Updates ====================

/**
 * تجميع التحديثات لتنفيذها دفعة واحدة
 */
export function createBatchUpdater<T>(
  executor: (items: T[]) => void,
  delay: number = 100
): (item: T) => void {
  let batch: T[] = [];
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (item: T) => {
    batch.push(item);

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      executor(batch);
      batch = [];
      timeoutId = null;
    }, delay);
  };
}
