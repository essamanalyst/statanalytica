/**
 * Security Utilities for StatAnalytica
 * Comprehensive security measures for the application
 */

// ==========================================
// XSS Prevention - منع حقن الأكواد
// ==========================================

/**
 * Sanitize HTML to prevent XSS attacks
 */
export const sanitizeHTML = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };
  
  return input.replace(/[&<>"'`=/]/g, (char) => htmlEntities[char] || char);
};

/**
 * Sanitize text input - removes dangerous characters
 */
export const sanitizeText = (input: string): string => {
  if (typeof input !== 'string') return '';
  
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+=/gi, '')
    .replace(/data:/gi, '')
    .trim();
};

/**
 * Sanitize URL to prevent javascript: and data: URLs
 */
export const sanitizeURL = (url: string): string => {
  if (typeof url !== 'string') return '';
  
  const trimmedUrl = url.trim().toLowerCase();
  
  // Block dangerous protocols
  const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
  for (const protocol of dangerousProtocols) {
    if (trimmedUrl.startsWith(protocol)) {
      console.warn('Blocked dangerous URL:', url);
      return '';
    }
  }
  
  // Validate URL format
  try {
    const urlObj = new URL(url);
    const allowedProtocols = ['http:', 'https:', 'mailto:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return '';
    }
    return url;
  } catch {
    // If not a valid URL, return as-is (might be relative)
    if (url.startsWith('/') || url.startsWith('./') || url.startsWith('../')) {
      return url;
    }
    return '';
  }
};

/**
 * Sanitize filename to prevent path traversal
 */
export const sanitizeFilename = (filename: string): string => {
  if (typeof filename !== 'string') return 'unnamed';
  
  return filename
    .replace(/\.\./g, '') // Remove path traversal
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid chars
    .replace(/^\.+/, '') // Remove leading dots
    .trim()
    .slice(0, 255) || 'unnamed'; // Limit length
};

// ==========================================
// Input Validation - التحقق من المدخلات
// ==========================================

/**
 * Validate email format
 */
export const validateEmail = (email: string): boolean => {
  if (typeof email !== 'string') return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email) && email.length <= 254;
};

/**
 * Validate URL format
 */
export const validateURL = (url: string): boolean => {
  if (typeof url !== 'string') return false;
  try {
    const urlObj = new URL(url);
    return ['http:', 'https:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Validate JSON string
 */
export const validateJSON = (jsonString: string): { valid: boolean; data?: any; error?: string } => {
  if (typeof jsonString !== 'string') {
    return { valid: false, error: 'Input is not a string' };
  }
  
  try {
    const data = JSON.parse(jsonString);
    return { valid: true, data };
  } catch (e) {
    return { valid: false, error: (e as Error).message };
  }
};

/**
 * Validate SQL query (basic check for dangerous patterns)
 */
export const validateSQLQuery = (query: string): { valid: boolean; warnings: string[] } => {
  if (typeof query !== 'string') {
    return { valid: false, warnings: ['Query is not a string'] };
  }
  
  const warnings: string[] = [];
  const upperQuery = query.toUpperCase();
  
  // Check for dangerous patterns
  const dangerousPatterns = [
    { pattern: /DROP\s+(TABLE|DATABASE|INDEX)/i, warning: 'DROP statement detected' },
    { pattern: /DELETE\s+FROM\s+\w+\s*(?:;|$)/i, warning: 'DELETE without WHERE detected' },
    { pattern: /TRUNCATE/i, warning: 'TRUNCATE statement detected' },
    { pattern: /ALTER\s+TABLE/i, warning: 'ALTER TABLE detected' },
    { pattern: /GRANT|REVOKE/i, warning: 'Permission changes detected' },
    { pattern: /EXEC\s*\(/i, warning: 'EXEC statement detected' },
    { pattern: /xp_/i, warning: 'Extended stored procedure detected' },
    { pattern: /--/g, warning: 'SQL comment detected' },
    { pattern: /\/\*/g, warning: 'Multi-line comment detected' },
    { pattern: /;\s*SELECT/i, warning: 'Multiple statements detected' },
  ];
  
  for (const { pattern, warning } of dangerousPatterns) {
    if (pattern.test(query)) {
      warnings.push(warning);
    }
  }
  
  // Only SELECT queries are generally safe
  if (!upperQuery.trim().startsWith('SELECT')) {
    warnings.push('Non-SELECT query detected');
  }
  
  return { valid: warnings.length === 0, warnings };
};

/**
 * Validate file type
 */
export const validateFileType = (file: File, allowedTypes: string[]): boolean => {
  if (!file || !allowedTypes.length) return false;
  
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const mimeType = file.type.toLowerCase();
  
  // Check extension
  const allowedExtensions = allowedTypes.map(t => t.toLowerCase().replace('.', ''));
  if (!allowedExtensions.includes(extension)) {
    return false;
  }
  
  // Check MIME type if available
  const mimeMap: Record<string, string[]> = {
    'csv': ['text/csv', 'text/plain', 'application/csv'],
    'json': ['application/json', 'text/json'],
    'xlsx': ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    'xls': ['application/vnd.ms-excel'],
    'txt': ['text/plain'],
    'tsv': ['text/tab-separated-values', 'text/plain'],
  };
  
  const allowedMimes = mimeMap[extension] || [];
  if (mimeType && allowedMimes.length > 0 && !allowedMimes.includes(mimeType)) {
    // MIME type mismatch - potential file type spoofing
    console.warn(`File type mismatch: ${file.name} has MIME ${mimeType}`);
    // Still allow if extension is correct (some systems report wrong MIME)
  }
  
  return true;
};

/**
 * Validate file size
 */
export const validateFileSize = (file: File, maxSizeMB: number): boolean => {
  if (!file) return false;
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
};

// ==========================================
// Data Sanitization - تنظيف البيانات
// ==========================================

/**
 * Sanitize data object (recursive)
 */
export const sanitizeDataObject = (obj: any, depth: number = 0): any => {
  // Prevent infinite recursion
  if (depth > 10) return null;
  
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean') {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeDataObject(item, depth + 1));
  }
  
  if (typeof obj === 'object') {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize key as well
      const sanitizedKey = sanitizeText(key).slice(0, 100);
      sanitized[sanitizedKey] = sanitizeDataObject(value, depth + 1);
    }
    return sanitized;
  }
  
  return null;
};

/**
 * Sanitize imported data (array of objects)
 */
export const sanitizeImportedData = (data: any[]): any[] => {
  if (!Array.isArray(data)) return [];
  
  return data.map(row => {
    if (typeof row !== 'object' || row === null) return {};
    
    const sanitizedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      // Sanitize key
      const sanitizedKey = String(key)
        .replace(/[<>]/g, '')
        .trim()
        .slice(0, 100);
      
      // Sanitize value
      if (typeof value === 'string') {
        sanitizedRow[sanitizedKey] = sanitizeText(value);
      } else if (typeof value === 'number' || typeof value === 'boolean') {
        sanitizedRow[sanitizedKey] = value;
      } else if (value === null || value === undefined) {
        sanitizedRow[sanitizedKey] = null;
      } else {
        sanitizedRow[sanitizedKey] = String(value);
      }
    }
    return sanitizedRow;
  });
};

// ==========================================
// Secure Storage - التخزين الآمن
// ==========================================

/**
 * Securely store data in localStorage with encryption marker
 */
export const secureStore = (key: string, data: any): boolean => {
  try {
    // Validate key
    if (typeof key !== 'string' || key.length === 0 || key.length > 100) {
      console.error('Invalid storage key');
      return false;
    }
    
    // Sanitize key
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    
    // Convert to JSON
    const jsonData = JSON.stringify(data);
    
    // Check size (localStorage limit is usually 5-10MB)
    const size = new Blob([jsonData]).size;
    if (size > 4 * 1024 * 1024) { // 4MB limit
      console.warn('Data too large for localStorage');
      return false;
    }
    
    // Store with timestamp
    const wrapper = {
      data: jsonData,
      timestamp: Date.now(),
      version: '1.0',
    };
    
    localStorage.setItem(`statanalytica_${sanitizedKey}`, JSON.stringify(wrapper));
    return true;
  } catch (e) {
    console.error('Storage error:', e);
    return false;
  }
};

/**
 * Securely retrieve data from localStorage
 */
export const secureRetrieve = <T>(key: string, defaultValue: T): T => {
  try {
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
    const stored = localStorage.getItem(`statanalytica_${sanitizedKey}`);
    
    if (!stored) return defaultValue;
    
    const wrapper = JSON.parse(stored);
    
    // Validate wrapper structure
    if (!wrapper.data || !wrapper.timestamp) {
      return defaultValue;
    }
    
    // Check if data is too old (30 days)
    const maxAge = 30 * 24 * 60 * 60 * 1000;
    if (Date.now() - wrapper.timestamp > maxAge) {
      localStorage.removeItem(`statanalytica_${sanitizedKey}`);
      return defaultValue;
    }
    
    return JSON.parse(wrapper.data);
  } catch {
    return defaultValue;
  }
};

/**
 * Securely remove data from localStorage
 */
export const secureRemove = (key: string): void => {
  const sanitizedKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  localStorage.removeItem(`statanalytica_${sanitizedKey}`);
};

// ==========================================
// Rate Limiting - تحديد معدل الطلبات
// ==========================================

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

/**
 * Check if action is rate limited
 */
export const isRateLimited = (
  action: string, 
  maxRequests: number = 10, 
  windowMs: number = 60000
): boolean => {
  const now = Date.now();
  const key = action;
  
  const record = rateLimitMap.get(key);
  
  if (!record || now > record.resetTime) {
    rateLimitMap.set(key, { count: 1, resetTime: now + windowMs });
    return false;
  }
  
  if (record.count >= maxRequests) {
    return true;
  }
  
  record.count++;
  return false;
};

/**
 * Reset rate limit for an action
 */
export const resetRateLimit = (action: string): void => {
  rateLimitMap.delete(action);
};

// ==========================================
// Error Handling - معالجة الأخطاء الآمنة
// ==========================================

/**
 * Safe error message (hide sensitive info)
 */
export const getSafeErrorMessage = (error: any): string => {
  if (!error) return 'An unknown error occurred';
  
  // List of patterns to redact
  const sensitivePatterns = [
    /password[=:]\s*\S+/gi,
    /api[_-]?key[=:]\s*\S+/gi,
    /token[=:]\s*\S+/gi,
    /secret[=:]\s*\S+/gi,
    /auth[=:]\s*\S+/gi,
    /credential[s]?[=:]\s*\S+/gi,
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, // emails
    /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, // credit cards
  ];
  
  let message = error.message || String(error);
  
  for (const pattern of sensitivePatterns) {
    message = message.replace(pattern, '[REDACTED]');
  }
  
  return message;
};

/**
 * Log error securely (without sensitive info)
 */
export const secureLogError = (error: any, context?: string): void => {
  const safeMessage = getSafeErrorMessage(error);
  console.error(`[${context || 'Error'}]: ${safeMessage}`);
};

// ==========================================
// Content Security - أمان المحتوى
// ==========================================

/**
 * Check if content contains potentially malicious patterns
 */
export const checkForMaliciousContent = (content: string): { safe: boolean; warnings: string[] } => {
  if (typeof content !== 'string') {
    return { safe: true, warnings: [] };
  }
  
  const warnings: string[] = [];
  
  const maliciousPatterns = [
    { pattern: /<script[\s\S]*?>[\s\S]*?<\/script>/gi, warning: 'Script tag detected' },
    { pattern: /javascript:/gi, warning: 'JavaScript protocol detected' },
    { pattern: /on\w+\s*=/gi, warning: 'Event handler detected' },
    { pattern: /<iframe[\s\S]*?>/gi, warning: 'Iframe detected' },
    { pattern: /<object[\s\S]*?>/gi, warning: 'Object tag detected' },
    { pattern: /<embed[\s\S]*?>/gi, warning: 'Embed tag detected' },
    { pattern: /eval\s*\(/gi, warning: 'Eval function detected' },
    { pattern: /document\.(cookie|write)/gi, warning: 'Document manipulation detected' },
    { pattern: /window\.(location|open)/gi, warning: 'Window manipulation detected' },
  ];
  
  for (const { pattern, warning } of maliciousPatterns) {
    if (pattern.test(content)) {
      warnings.push(warning);
    }
  }
  
  return { safe: warnings.length === 0, warnings };
};

// ==========================================
// API Security - أمان API
// ==========================================

/**
 * Sanitize API request headers
 */
export const sanitizeHeaders = (headers: Record<string, string>): Record<string, string> => {
  const sanitized: Record<string, string> = {};
  const allowedHeaders = [
    'content-type',
    'accept',
    'authorization',
    'x-api-key',
    'x-requested-with',
  ];
  
  for (const [key, value] of Object.entries(headers)) {
    const lowerKey = key.toLowerCase();
    if (allowedHeaders.includes(lowerKey)) {
      sanitized[key] = sanitizeText(value);
    }
  }
  
  return sanitized;
};

/**
 * Create safe fetch options
 */
export const createSafeFetchOptions = (options: RequestInit = {}): RequestInit => {
  return {
    ...options,
    credentials: 'same-origin', // Don't send cookies to other origins
    mode: 'cors',
    headers: {
      ...sanitizeHeaders(options.headers as Record<string, string> || {}),
    },
  };
};

// ==========================================
// Data Export Security - أمان التصدير
// ==========================================

/**
 * Sanitize data before export
 */
export const sanitizeForExport = (data: any[]): any[] => {
  return data.map(row => {
    const sanitizedRow: Record<string, any> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'string') {
        // Remove formulas that could be executed in Excel
        let sanitizedValue = value;
        if (/^[=+\-@]/.test(value)) {
          sanitizedValue = `'${value}`; // Prefix with apostrophe
        }
        sanitizedRow[key] = sanitizedValue;
      } else {
        sanitizedRow[key] = value;
      }
    }
    return sanitizedRow;
  });
};

// ==========================================
// Security Audit - تدقيق الأمان
// ==========================================

/**
 * Perform security audit on the application state
 */
export const performSecurityAudit = (): { issues: string[]; recommendations: string[] } => {
  const issues: string[] = [];
  const recommendations: string[] = [];
  
  // Check localStorage usage
  let totalStorageSize = 0;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key) {
      totalStorageSize += (localStorage.getItem(key) || '').length;
    }
  }
  
  if (totalStorageSize > 4 * 1024 * 1024) {
    issues.push('localStorage usage exceeds 4MB');
    recommendations.push('Consider clearing old data or using IndexedDB');
  }
  
  // Check for sensitive data in URL
  if (window.location.search.includes('password') || 
      window.location.search.includes('token') ||
      window.location.search.includes('api_key')) {
    issues.push('Sensitive data detected in URL');
    recommendations.push('Remove sensitive data from URL parameters');
  }
  
  // Check for insecure context
  if (window.location.protocol === 'http:' && window.location.hostname !== 'localhost') {
    issues.push('Application running over HTTP');
    recommendations.push('Use HTTPS for secure communication');
  }
  
  // Check console for errors
  recommendations.push('Regularly check browser console for security warnings');
  recommendations.push('Keep dependencies updated');
  recommendations.push('Use Content Security Policy headers');
  
  return { issues, recommendations };
};

// ==========================================
// Password/Credential Masking
// ==========================================

/**
 * Mask sensitive data for display
 */
export const maskSensitiveData = (data: string, visibleChars: number = 4): string => {
  if (!data || data.length <= visibleChars) {
    return '*'.repeat(8);
  }
  return data.slice(0, visibleChars) + '*'.repeat(Math.min(data.length - visibleChars, 20));
};

/**
 * Check password strength
 */
export const checkPasswordStrength = (password: string): { 
  score: number; 
  level: 'weak' | 'fair' | 'good' | 'strong';
  suggestions: string[];
} => {
  let score = 0;
  const suggestions: string[] = [];
  
  if (password.length >= 8) score++;
  else suggestions.push('Use at least 8 characters');
  
  if (password.length >= 12) score++;
  
  if (/[a-z]/.test(password)) score++;
  else suggestions.push('Add lowercase letters');
  
  if (/[A-Z]/.test(password)) score++;
  else suggestions.push('Add uppercase letters');
  
  if (/[0-9]/.test(password)) score++;
  else suggestions.push('Add numbers');
  
  if (/[^a-zA-Z0-9]/.test(password)) score++;
  else suggestions.push('Add special characters');
  
  let level: 'weak' | 'fair' | 'good' | 'strong';
  if (score <= 2) level = 'weak';
  else if (score <= 3) level = 'fair';
  else if (score <= 4) level = 'good';
  else level = 'strong';
  
  return { score, level, suggestions };
};

export default {
  sanitizeHTML,
  sanitizeText,
  sanitizeURL,
  sanitizeFilename,
  validateEmail,
  validateURL,
  validateJSON,
  validateSQLQuery,
  validateFileType,
  validateFileSize,
  sanitizeDataObject,
  sanitizeImportedData,
  secureStore,
  secureRetrieve,
  secureRemove,
  isRateLimited,
  resetRateLimit,
  getSafeErrorMessage,
  secureLogError,
  checkForMaliciousContent,
  sanitizeHeaders,
  createSafeFetchOptions,
  sanitizeForExport,
  performSecurityAudit,
  maskSensitiveData,
  checkPasswordStrength,
};
