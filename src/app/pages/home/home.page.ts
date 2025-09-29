import { Component, OnInit } from '@angular/core';
import { CommonModule, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { IonContent, IonCard, IonCol, IonCardHeader, IonCardContent, IonCardTitle, IonRow, IonGrid, IonButton } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [IonButton, IonGrid, IonRow, IonCardTitle, IonCardContent, IonCardHeader, IonCol, IonCard, CommonModule, RouterLink, IonContent, TitleCasePipe],
})
export class HomePage implements OnInit {
  currentUser: any = null;
  isAuthenticated = false;
  agendamentosHoje = 0;
  proximoAgendamento: any = null;
  viewMode: 'admin' | 'profissional' = 'admin'; // Modo de visualização padrão para admin

  constructor(
    private authService: AuthService,
    private router: Router,
    private api: ApiService
  ) {}

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.currentUser = user;
      this.isAuthenticated = !!user;

      if (user && (user.role === 'profissional' || (user.role === 'admin' && this.viewMode === 'profissional'))) {
        this.carregarDadosProfissional();
      }
    });
  }

  setViewMode(mode: 'admin' | 'profissional') {
    this.viewMode = mode;

    // Se mudou para modo profissional, carregar dados
    if (mode === 'profissional') {
      this.carregarDadosProfissional();
    }
  }

  carregarDadosProfissional() {
    // Carregar agendamentos de hoje
    const hoje = new Date().toISOString().split('T')[0];
    this.api.getAdminAgendamentos(hoje).subscribe({
      next: (res) => {
        if (res.success) {
          const agendamentos = res.agendamentos || [];
          this.agendamentosHoje = agendamentos.length;

          // Encontrar próximo agendamento
          const agora = new Date();
          const proximo = agendamentos.find((ag: any) => {
            const horaAgendamento = new Date(`${hoje}T${ag.hora}`);
            return horaAgendamento > agora;
          });

          if (proximo) {
            this.proximoAgendamento = {
              hora: proximo.hora.substring(0, 5),
              cliente: proximo.cliente_nome,
              procedimento: proximo.procedimento_nome
            };
          }
        }
      },
      error: (err) => {
        console.error('Erro ao carregar dados do profissional:', err);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigateByUrl('/login');
  }

  canAccessAdmin(): boolean {
    return this.authService.canAccessAdmin();
  }

  canAccessProfissional(): boolean {
    return this.authService.canAccessProfissional();
  }

  canAccessGestaoProfissionais(): boolean {
    return this.authService.canAccessGestaoProfissionais();
  }

  canAccessAgendamentos(): boolean {
    return this.authService.canAccessAgendamentos();
  }

  canAccessDashboard(): boolean {
    return this.authService.canAccessDashboard();
  }
}
