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

  ngOnInit() {
    // Inicializar o serviço de autenticação
    // Isso garante que o estado de autenticação seja carregado na inicialização
  }
}
