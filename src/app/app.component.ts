import { Component, OnInit } from '@angular/core';
import { IonApp, IonRouterOutlet } from '@ionic/angular/standalone';
import { AuthService } from './services/auth.service';
import { NotificationBadgeComponent } from './components/notification-badge/notification-badge.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  imports: [IonApp, IonRouterOutlet, NotificationBadgeComponent],
})
export class AppComponent implements OnInit {
  constructor(private authService: AuthService) {}

  async ngOnInit() {
    // Aguardar a inicialização do AuthService
    // Aguardar até que o AuthService esteja inicializado
    while (!this.authService._initialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  }
}
