import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { IonIcon, IonBadge, IonButton } from '@ionic/angular/standalone';
import { NotificationService, Notification } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';
import { addIcons } from 'ionicons';
import { notificationsOutline, notifications } from 'ionicons/icons';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-notification-badge',
  templateUrl: './notification-badge.component.html',
  styleUrls: ['./notification-badge.component.scss'],
  standalone: true,
  imports: [IonButton, IonBadge, IonIcon, CommonModule]
})
export class NotificationBadgeComponent implements OnInit, OnDestroy {
  unreadCount = 0;
  showDropdown = false;
  notifications: Notification[] = [];

  private subscriptions: Subscription[] = [];

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {
    addIcons({ notificationsOutline, notifications });
  }

  ngOnInit() {
    // Subscrever ao contador de não lidas
    this.subscriptions.push(
      this.notificationService.unreadCount$.subscribe(count => {
        this.unreadCount = count;
      })
    );

    // Subscrever às notificações
    this.subscriptions.push(
      this.notificationService.notifications$.subscribe(notifications => {
        this.notifications = notifications.slice(0, 5); // Mostrar apenas as 5 mais recentes
      })
    );
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
    if (this.showDropdown) {
      this.markAllAsRead();
    }
  }

  markAllAsRead() {
    this.notificationService.markAllAsRead();
  }

  handleNotificationClick(notification: Notification) {
    this.showDropdown = false;

    if (notification.actionUrl) {
      this.router.navigateByUrl(notification.actionUrl);
    }

    this.notificationService.markAsRead(notification.id);
  }

  goToAllNotifications() {
    this.showDropdown = false;
    this.router.navigateByUrl('/notifications');
  }

  formatTime(timestamp: Date): string {
    const now = new Date();
    const diff = now.getTime() - timestamp.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Agora';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    return `${days}d`;
  }
}
