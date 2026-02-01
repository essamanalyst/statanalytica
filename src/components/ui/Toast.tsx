import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X,
  Loader2
} from 'lucide-react';
import { useNotifications } from '../../core/NotificationSystem';
import type { Notification } from '../../core/NotificationSystem';
import { useLanguage } from '../../i18n';

const ToastIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
  switch (type) {
    case 'success':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'error':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'warning':
      return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    case 'info':
      return <Info className="w-5 h-5 text-blue-500" />;
    case 'loading':
      return <Loader2 className="w-5 h-5 text-blue-500 animate-spin" />;
    default:
      return null;
  }
};

const Toast: React.FC<{
  notification: Notification;
  onClose: () => void;
}> = ({ notification, onClose }) => {
  const [isExiting, setIsExiting] = useState(false);
  const { isRTL } = useLanguage();

  useEffect(() => {
    if (notification.autoClose && notification.duration) {
      const timer = setTimeout(() => {
        setIsExiting(true);
        setTimeout(onClose, 300);
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(onClose, 300);
  };

  const bgColors = {
    success: 'bg-green-50 border-green-200',
    error: 'bg-red-50 border-red-200',
    warning: 'bg-yellow-50 border-yellow-200',
    info: 'bg-blue-50 border-blue-200',
    loading: 'bg-blue-50 border-blue-200',
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        ${bgColors[notification.type]}
        ${isExiting ? 'animate-slide-out' : 'animate-slide-in'}
        ${isRTL ? 'flex-row-reverse text-right' : ''}
      `}
      style={{
        animation: isExiting 
          ? 'slideOut 0.3s ease-in-out forwards' 
          : 'slideIn 0.3s ease-in-out',
      }}
    >
      <ToastIcon type={notification.type} />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{notification.title}</p>
        {notification.message && (
          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
        )}
        {notification.action && (
          <button
            onClick={notification.action.onClick}
            className="text-sm font-medium text-blue-600 hover:text-blue-800 mt-2"
          >
            {notification.action.label}
          </button>
        )}
      </div>
      {notification.type !== 'loading' && (
        <button
          onClick={handleClose}
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

export const ToastContainer: React.FC = () => {
  const { notifications, removeNotification } = useNotifications();
  const { isRTL } = useLanguage();
  
  // عرض أحدث 5 إشعارات فقط
  const visibleNotifications = notifications.slice(0, 5);

  if (visibleNotifications.length === 0) return null;

  return (
    <div 
      className={`fixed bottom-4 z-50 flex flex-col gap-2 max-w-sm w-full ${
        isRTL ? 'left-4' : 'right-4'
      }`}
    >
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(${isRTL ? '-100%' : '100%'});
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(${isRTL ? '-100%' : '100%'});
            opacity: 0;
          }
        }
      `}</style>
      {visibleNotifications.map((notification) => (
        <Toast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default ToastContainer;
