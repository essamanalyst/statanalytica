// نظام الإشعارات المتقدم
export type NotificationType = 'success' | 'error' | 'warning' | 'info' | 'loading';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  action?: {
    label: string;
    onClick: () => void;
  };
  autoClose?: boolean;
  duration?: number;
  category?: 'analysis' | 'data' | 'report' | 'system' | 'collaboration';
}

type NotificationCallback = (notifications: Notification[]) => void;

class NotificationSystem {
  private notifications: Notification[] = [];
  private listeners: Set<NotificationCallback> = new Set();
  private maxNotifications = 100;
  private storageKey = 'statanalytica_notifications';

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.notifications = JSON.parse(stored).map((n: Notification) => ({
          ...n,
          timestamp: new Date(n.timestamp),
        }));
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
    }
  }

  private saveToStorage(): void {
    try {
      const toSave = this.notifications.slice(0, this.maxNotifications);
      localStorage.setItem(this.storageKey, JSON.stringify(toSave));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  private notifyListeners(): void {
    this.listeners.forEach((callback) => callback([...this.notifications]));
  }

  private generateId(): string {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // إضافة إشعار
  add(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): Notification {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false,
      autoClose: notification.autoClose ?? true,
      duration: notification.duration ?? 5000,
    };

    this.notifications.unshift(newNotification);

    if (this.notifications.length > this.maxNotifications) {
      this.notifications = this.notifications.slice(0, this.maxNotifications);
    }

    this.saveToStorage();
    this.notifyListeners();

    return newNotification;
  }

  // إشعار نجاح
  success(title: string, message: string = '', options?: Partial<Notification>): Notification {
    return this.add({ type: 'success', title, message, ...options });
  }

  // إشعار خطأ
  error(title: string, message: string = '', options?: Partial<Notification>): Notification {
    return this.add({ type: 'error', title, message, autoClose: false, ...options });
  }

  // إشعار تحذير
  warning(title: string, message: string = '', options?: Partial<Notification>): Notification {
    return this.add({ type: 'warning', title, message, ...options });
  }

  // إشعار معلومات
  info(title: string, message: string = '', options?: Partial<Notification>): Notification {
    return this.add({ type: 'info', title, message, ...options });
  }

  // إشعار تحميل
  loading(title: string, message: string = ''): Notification {
    return this.add({ type: 'loading', title, message, autoClose: false });
  }

  // تحديث إشعار
  update(id: string, updates: Partial<Notification>): void {
    const index = this.notifications.findIndex((n) => n.id === id);
    if (index !== -1) {
      this.notifications[index] = { ...this.notifications[index], ...updates };
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  // إزالة إشعار
  remove(id: string): void {
    this.notifications = this.notifications.filter((n) => n.id !== id);
    this.saveToStorage();
    this.notifyListeners();
  }

  // تحديد كمقروء
  markAsRead(id: string): void {
    this.update(id, { read: true });
  }

  // تحديد الكل كمقروء
  markAllAsRead(): void {
    this.notifications.forEach((n) => (n.read = true));
    this.saveToStorage();
    this.notifyListeners();
  }

  // مسح الكل
  clearAll(): void {
    this.notifications = [];
    this.saveToStorage();
    this.notifyListeners();
  }

  // الحصول على جميع الإشعارات
  getAll(): Notification[] {
    return [...this.notifications];
  }

  // الحصول على غير المقروءة
  getUnread(): Notification[] {
    return this.notifications.filter((n) => !n.read);
  }

  // عدد غير المقروءة
  getUnreadCount(): number {
    return this.notifications.filter((n) => !n.read).length;
  }

  // الاشتراك في التحديثات
  subscribe(callback: NotificationCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }
}

export const notificationSystem = new NotificationSystem();

// React Hook للإشعارات
import { useState, useEffect, useCallback } from 'react';

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    setNotifications(notificationSystem.getAll());
    setUnreadCount(notificationSystem.getUnreadCount());

    const unsubscribe = notificationSystem.subscribe((newNotifications) => {
      setNotifications(newNotifications);
      setUnreadCount(newNotifications.filter((n) => !n.read).length);
    });

    return unsubscribe;
  }, []);

  const addNotification = useCallback(
    (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      return notificationSystem.add(notification);
    },
    []
  );

  const success = useCallback((title: string, message?: string) => {
    return notificationSystem.success(title, message);
  }, []);

  const error = useCallback((title: string, message?: string) => {
    return notificationSystem.error(title, message);
  }, []);

  const warning = useCallback((title: string, message?: string) => {
    return notificationSystem.warning(title, message);
  }, []);

  const info = useCallback((title: string, message?: string) => {
    return notificationSystem.info(title, message);
  }, []);

  const removeNotification = useCallback((id: string) => {
    notificationSystem.remove(id);
  }, []);

  const markAsRead = useCallback((id: string) => {
    notificationSystem.markAsRead(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    notificationSystem.markAllAsRead();
  }, []);

  const clearAll = useCallback(() => {
    notificationSystem.clearAll();
  }, []);

  return {
    notifications,
    unreadCount,
    addNotification,
    success,
    error,
    warning,
    info,
    removeNotification,
    markAsRead,
    markAllAsRead,
    clearAll,
  };
}
