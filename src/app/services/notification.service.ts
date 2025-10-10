import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read: boolean;
  actionUrl?: string;
  actionText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private notifications = new BehaviorSubject<Notification[]>([]);
  private unreadCount = new BehaviorSubject<number>(0);

  constructor() {
    // Carregar notificações salvas do localStorage
    this.loadNotifications();
  }

  get notifications$(): Observable<Notification[]> {
    return this.notifications.asObservable();
  }

  get unreadCount$(): Observable<number> {
    return this.unreadCount.asObservable();
  }

  addNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'read'>): string {
    const newNotification: Notification = {
      ...notification,
      id: this.generateId(),
      timestamp: new Date(),
      read: false
    };

    const currentNotifications = this.notifications.value;
    const updatedNotifications = [newNotification, ...currentNotifications];

    this.notifications.next(updatedNotifications);
    this.updateUnreadCount();
    this.saveNotifications();

    return newNotification.id;
  }

  markAsRead(notificationId: string): void {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.map(notification =>
      notification.id === notificationId ? { ...notification, read: true } : notification
    );

    this.notifications.next(updatedNotifications);
    this.updateUnreadCount();
    this.saveNotifications();
  }

  markAllAsRead(): void {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.map(notification => ({
      ...notification,
      read: true
    }));

    this.notifications.next(updatedNotifications);
    this.updateUnreadCount();
    this.saveNotifications();
  }

  removeNotification(notificationId: string): void {
    const currentNotifications = this.notifications.value;
    const updatedNotifications = currentNotifications.filter(
      notification => notification.id !== notificationId
    );

    this.notifications.next(updatedNotifications);
    this.updateUnreadCount();
    this.saveNotifications();
  }

  clearAllNotifications(): void {
    this.notifications.next([]);
    this.updateUnreadCount();
    this.saveNotifications();
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  private updateUnreadCount(): void {
    const unread = this.notifications.value.filter(n => !n.read).length;
    this.unreadCount.next(unread);
  }

  private saveNotifications(): void {
    try {
      localStorage.setItem('notifications', JSON.stringify(this.notifications.value));
    } catch (error) {
    }
  }

  private loadNotifications(): void {
    try {
      const saved = localStorage.getItem('notifications');
      if (saved) {
        const notifications = JSON.parse(saved).map((n: any) => ({
          ...n,
          timestamp: new Date(n.timestamp)
        }));
        this.notifications.next(notifications);
        this.updateUnreadCount();
      }
    } catch (error) {
    }
  }
}
