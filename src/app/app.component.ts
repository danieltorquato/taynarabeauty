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
    console.log('AppComponent - Aguardando inicialização do AuthService...');

    // Aguardar até que o AuthService esteja inicializado
    while (!this.authService._initialized) {
      await new Promise(resolve => setTimeout(resolve, 10));
    }

    console.log('AppComponent - AuthService inicializado');
    console.log('AppComponent - Usuário atual:', this.authService.currentUser);
    console.log('AppComponent - Está autenticado:', this.authService.isAuthenticated);
  }
}
