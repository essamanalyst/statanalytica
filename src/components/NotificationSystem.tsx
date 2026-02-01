import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X, 
  Bell,
  Database,
  BarChart3,
  TestTube,
  Trash2,
  Download,
  Upload,
  Settings,
  PieChart,
  Wand2,
  FileText
} from 'lucide-react';
import { useLanguage } from '../i18n';

// أنواع الإشعارات
export type NotificationType = 'success' | 'error' | 'warning' | 'info';

// فئات الإشعارات
export type NotificationCategory = 
  | 'data' 
  | 'analysis' 
  | 'test' 
  | 'cleaning' 
  | 'export' 
  | 'import' 
  | 'settings'
  | 'visualization'
  | 'report'
  | 'general';

// واجهة الإشعار
export interface Notification {
  id: string;
  type: NotificationType;
  category: NotificationCategory;
  title: string;
  message: string;
  details?: string;
  duration?: number;
  timestamp: Date;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// واجهة السياق
interface NotificationContextType {
  notifications: Notification[];
  addNotification: (notification: Omit<Notification, 'id' | 'timestamp'>) => void;
  removeNotification: (id: string) => void;
  clearAll: () => void;
  
  // دوال مساعدة سريعة
  success: (title: string, message: string, category?: NotificationCategory, details?: string) => void;
  error: (title: string, message: string, category?: NotificationCategory, details?: string) => void;
  warning: (title: string, message: string, category?: NotificationCategory, details?: string) => void;
  info: (title: string, message: string, category?: NotificationCategory, details?: string) => void;
  
  // إشعارات محددة للعمليات
  notifyDataLoaded: (rows: number, cols: number, fileName?: string) => void;
  notifyDataCleaned: (operation: string, affected: number) => void;
  notifyAnalysisComplete: (analysisType: string, details?: string) => void;
  notifyTestComplete: (testName: string, pValue?: number, significant?: boolean) => void;
  notifyExportComplete: (format: string, fileName?: string) => void;
  notifyError: (operation: string, errorMessage: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

// مزود السياق
export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { language } = useLanguage();

  // إضافة إشعار
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp'>) => {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
      ...notification,
      id,
      timestamp: new Date(),
      duration: notification.duration ?? 5000
    };

    setNotifications(prev => [...prev, newNotification]);

    // إزالة تلقائية
    if (newNotification.duration && newNotification.duration > 0) {
      setTimeout(() => {
        removeNotification(id);
      }, newNotification.duration);
    }

    // تشغيل صوت للإشعارات المهمة (اختياري)
    if (notification.type === 'success' || notification.type === 'error') {
      // يمكن إضافة صوت هنا
    }
  }, []);

  // إزالة إشعار
  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  // مسح جميع الإشعارات
  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  // دوال مساعدة
  const success = useCallback((title: string, message: string, category: NotificationCategory = 'general', details?: string) => {
    addNotification({ type: 'success', category, title, message, details });
  }, [addNotification]);

  const error = useCallback((title: string, message: string, category: NotificationCategory = 'general', details?: string) => {
    addNotification({ type: 'error', category, title, message, details, duration: 8000 });
  }, [addNotification]);

  const warning = useCallback((title: string, message: string, category: NotificationCategory = 'general', details?: string) => {
    addNotification({ type: 'warning', category, title, message, details, duration: 6000 });
  }, [addNotification]);

  const info = useCallback((title: string, message: string, category: NotificationCategory = 'general', details?: string) => {
    addNotification({ type: 'info', category, title, message, details });
  }, [addNotification]);

  // إشعار تحميل البيانات
  const notifyDataLoaded = useCallback((rows: number, cols: number, fileName?: string) => {
    const title = language === 'ar' ? '✓ تم تحميل البيانات' : '✓ Data Loaded';
    const message = language === 'ar' 
      ? `${rows.toLocaleString()} صف × ${cols} عمود`
      : `${rows.toLocaleString()} rows × ${cols} columns`;
    const details = fileName ? (language === 'ar' ? `الملف: ${fileName}` : `File: ${fileName}`) : undefined;
    addNotification({ type: 'success', category: 'import', title, message, details });
  }, [addNotification, language]);

  // إشعار تنظيف البيانات
  const notifyDataCleaned = useCallback((operation: string, affected: number) => {
    const title = language === 'ar' ? '✓ تم تنظيف البيانات' : '✓ Data Cleaned';
    const message = language === 'ar' 
      ? `${operation}: ${affected.toLocaleString()} قيمة تم معالجتها`
      : `${operation}: ${affected.toLocaleString()} values processed`;
    addNotification({ type: 'success', category: 'cleaning', title, message });
  }, [addNotification, language]);

  // إشعار اكتمال التحليل
  const notifyAnalysisComplete = useCallback((analysisType: string, details?: string) => {
    const title = language === 'ar' ? '✓ اكتمل التحليل' : '✓ Analysis Complete';
    const message = language === 'ar' 
      ? `تم تنفيذ ${analysisType} بنجاح`
      : `${analysisType} executed successfully`;
    addNotification({ type: 'success', category: 'analysis', title, message, details });
  }, [addNotification, language]);

  // إشعار اكتمال الاختبار
  const notifyTestComplete = useCallback((testName: string, pValue?: number, significant?: boolean) => {
    const title = language === 'ar' ? '✓ اكتمل الاختبار' : '✓ Test Complete';
    let message = language === 'ar' 
      ? `تم تنفيذ ${testName}`
      : `${testName} executed`;
    
    let details: string | undefined;
    if (pValue !== undefined) {
      details = `p-value = ${pValue.toFixed(4)}`;
      if (significant !== undefined) {
        details += significant 
          ? (language === 'ar' ? ' (دال إحصائياً)' : ' (Significant)')
          : (language === 'ar' ? ' (غير دال)' : ' (Not Significant)');
      }
    }
    addNotification({ type: 'success', category: 'test', title, message, details });
  }, [addNotification, language]);

  // إشعار اكتمال التصدير
  const notifyExportComplete = useCallback((format: string, fileName?: string) => {
    const title = language === 'ar' ? '✓ تم التصدير' : '✓ Export Complete';
    const message = language === 'ar' 
      ? `تم تصدير البيانات بصيغة ${format}`
      : `Data exported as ${format}`;
    const details = fileName ? (language === 'ar' ? `الملف: ${fileName}` : `File: ${fileName}`) : undefined;
    addNotification({ type: 'success', category: 'export', title, message, details });
  }, [addNotification, language]);

  // إشعار الخطأ
  const notifyError = useCallback((operation: string, errorMessage: string) => {
    const title = language === 'ar' ? '✗ حدث خطأ' : '✗ Error Occurred';
    const message = language === 'ar' 
      ? `فشل في: ${operation}`
      : `Failed: ${operation}`;
    addNotification({ type: 'error', category: 'general', title, message, details: errorMessage, duration: 10000 });
  }, [addNotification, language]);

  const value: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAll,
    success,
    error,
    warning,
    info,
    notifyDataLoaded,
    notifyDataCleaned,
    notifyAnalysisComplete,
    notifyTestComplete,
    notifyExportComplete,
    notifyError
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
      <NotificationContainer />
    </NotificationContext.Provider>
  );
};

// Hook لاستخدام الإشعارات
export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

// أيقونة الفئة
const getCategoryIcon = (category: NotificationCategory) => {
  switch (category) {
    case 'data': return Database;
    case 'import': return Upload;
    case 'export': return Download;
    case 'analysis': return BarChart3;
    case 'test': return TestTube;
    case 'cleaning': return Wand2;
    case 'visualization': return PieChart;
    case 'report': return FileText;
    case 'settings': return Settings;
    default: return Bell;
  }
};

// ألوان الأنواع
const getTypeStyles = (type: NotificationType) => {
  switch (type) {
    case 'success':
      return {
        bg: 'bg-gradient-to-r from-green-50 to-emerald-50',
        border: 'border-green-400',
        icon: 'text-green-500 bg-green-100',
        title: 'text-green-800',
        message: 'text-green-700',
        progress: 'bg-green-500'
      };
    case 'error':
      return {
        bg: 'bg-gradient-to-r from-red-50 to-rose-50',
        border: 'border-red-400',
        icon: 'text-red-500 bg-red-100',
        title: 'text-red-800',
        message: 'text-red-700',
        progress: 'bg-red-500'
      };
    case 'warning':
      return {
        bg: 'bg-gradient-to-r from-yellow-50 to-amber-50',
        border: 'border-yellow-400',
        icon: 'text-yellow-600 bg-yellow-100',
        title: 'text-yellow-800',
        message: 'text-yellow-700',
        progress: 'bg-yellow-500'
      };
    case 'info':
      return {
        bg: 'bg-gradient-to-r from-blue-50 to-indigo-50',
        border: 'border-blue-400',
        icon: 'text-blue-500 bg-blue-100',
        title: 'text-blue-800',
        message: 'text-blue-700',
        progress: 'bg-blue-500'
      };
  }
};

// أيقونة النوع
const getTypeIcon = (type: NotificationType) => {
  switch (type) {
    case 'success': return CheckCircle;
    case 'error': return XCircle;
    case 'warning': return AlertTriangle;
    case 'info': return Info;
  }
};

// مكون الإشعار الفردي
const NotificationItem: React.FC<{ 
  notification: Notification; 
  onRemove: () => void;
}> = ({ notification, onRemove }) => {
  const { language } = useLanguage();
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  const styles = getTypeStyles(notification.type);
  const TypeIcon = getTypeIcon(notification.type);
  const CategoryIcon = getCategoryIcon(notification.category);

  // شريط التقدم
  useEffect(() => {
    if (!notification.duration || notification.duration <= 0) return;

    const interval = setInterval(() => {
      setProgress(prev => {
        const decrement = (100 / notification.duration!) * 100;
        return Math.max(0, prev - decrement);
      });
    }, 100);

    return () => clearInterval(interval);
  }, [notification.duration]);

  // تأثير الخروج
  const handleRemove = () => {
    setIsExiting(true);
    setTimeout(onRemove, 300);
  };

  const dir = language === 'ar' ? 'rtl' : 'ltr';

  return (
    <div 
      dir={dir}
      className={`
        relative overflow-hidden
        ${styles.bg} ${styles.border}
        border-l-4 rounded-lg shadow-lg
        transform transition-all duration-300 ease-out
        ${isExiting ? 'opacity-0 translate-x-full scale-95' : 'opacity-100 translate-x-0 scale-100'}
        hover:shadow-xl
        min-w-[320px] max-w-[420px]
      `}
      style={{
        animation: 'slideInRight 0.4s ease-out'
      }}
    >
      {/* المحتوى الرئيسي */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* أيقونة النوع */}
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${styles.icon} flex items-center justify-center`}>
            <TypeIcon className="w-5 h-5" />
          </div>

          {/* المحتوى */}
          <div className="flex-1 min-w-0">
            {/* العنوان مع أيقونة الفئة */}
            <div className="flex items-center gap-2 mb-1">
              <CategoryIcon className={`w-4 h-4 ${styles.title} opacity-60`} />
              <h4 className={`font-semibold text-sm ${styles.title}`}>
                {notification.title}
              </h4>
            </div>

            {/* الرسالة */}
            <p className={`text-sm ${styles.message}`}>
              {notification.message}
            </p>

            {/* التفاصيل */}
            {notification.details && (
              <p className={`text-xs ${styles.message} opacity-75 mt-1 font-mono bg-white/50 px-2 py-1 rounded`}>
                {notification.details}
              </p>
            )}

            {/* الإجراء */}
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className={`mt-2 text-xs font-medium ${styles.title} hover:underline`}
              >
                {notification.action.label}
              </button>
            )}

            {/* الوقت */}
            <p className="text-xs text-gray-400 mt-2">
              {notification.timestamp.toLocaleTimeString(language === 'ar' ? 'ar-EG' : 'en-US')}
            </p>
          </div>

          {/* زر الإغلاق */}
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-full hover:bg-gray-200/50 transition-colors"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
          </button>
        </div>
      </div>

      {/* شريط التقدم */}
      {notification.duration && notification.duration > 0 && (
        <div className="h-1 bg-gray-200/50">
          <div 
            className={`h-full ${styles.progress} transition-all duration-100 ease-linear`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// حاوية الإشعارات
const NotificationContainer: React.FC = () => {
  const { notifications, clearAll } = useNotification();
  const { language } = useLanguage();

  if (notifications.length === 0) return null;

  return (
    <>
      {/* CSS للأنيميشن */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
      `}</style>

      {/* حاوية الإشعارات */}
      <div 
        className="fixed top-4 right-4 z-[9999] flex flex-col gap-3"
        style={{ maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}
      >
        {/* زر مسح الكل */}
        {notifications.length > 1 && (
          <button
            onClick={clearAll}
            className="self-end px-3 py-1.5 text-xs font-medium text-gray-600 bg-white/90 backdrop-blur rounded-full shadow hover:bg-gray-100 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3 h-3" />
            {language === 'ar' ? 'مسح الكل' : 'Clear All'}
            <span className="bg-gray-200 px-1.5 py-0.5 rounded-full text-gray-700">
              {notifications.length}
            </span>
          </button>
        )}

        {/* قائمة الإشعارات */}
        {notifications.map(notification => (
          <NotificationItem
            key={notification.id}
            notification={notification}
            onRemove={() => {}}
          />
        ))}
      </div>
    </>
  );
};

export default NotificationProvider;
