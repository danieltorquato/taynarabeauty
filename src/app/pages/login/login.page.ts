import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonInput, IonButton, CommonModule, FormsModule]
})
export class LoginPage implements OnInit {
  email = '';
  password = '';
  showPassword = false;
  loading = false;

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Se já estiver logado, redirecionar
    if (this.authService.isAuthenticated) {
      this.redirectBasedOnRole();
    }
  }

  onSubmit() {
    if (this.loading) return;
    this.loading = true;

    // Verificar se há agendamento pendente
    const hasPendingAppointment = localStorage.getItem('tempAppointmentData');

    if (hasPendingAppointment) {
      // Usar método que confirma agendamento automaticamente
      this.authService.loginAndConfirmAppointment({ email: this.email, password: this.password }).subscribe({
        next: (res) => {
          this.loading = false;
          if (res && res.success) {
            if (res.appointmentConfirmed) {
              // Redirecionar para página de confirmação com dados do agendamento
              this.router.navigate(['/confirmacao'], {
                state: {
                  id: res.appointmentData?.id,
                  nome: this.authService.currentUser?.name || '',
                  servico: res.appointmentData?.procedimento_nome || 'Procedimento',
                  data: res.appointmentData?.data,
                  hora: res.appointmentData?.hora,
                  profissionalNome: res.appointmentData?.profissional_nome || 'Será definido automaticamente',
                  whatsapp: res.appointmentData?.whatsapp,
                  emailSent: !!res.appointmentData?.emailSent,
                  automaticConfirmation: true
                }
              });
            } else {
              // Login bem-sucedido mas agendamento não confirmado
              this.redirectBasedOnRole();
            }
          } else {
            alert(res?.message || 'Falha no login');
          }
        },
        error: (err) => {
          this.loading = false;
          alert(err?.error?.message || 'Erro ao conectar ao servidor');
        }
      });
    } else {
      // Login normal sem agendamento pendente
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: (res) => {
          this.loading = false;
          if (res && res.success) {
            this.redirectBasedOnRole();
          } else {
            alert(res?.message || 'Falha no login');
          }
        },
        error: (err) => {
          this.loading = false;
          alert(err?.error?.message || 'Erro ao conectar ao servidor');
        }
      });
    }
  }

  private redirectBasedOnRole() {
    const user = this.authService.currentUser;
    if (!user) return;

    switch (user.role) {
      case 'admin':
        this.router.navigateByUrl('/');
        break;
      case 'recepcao':
        this.router.navigateByUrl('/dashboard-admin');
        break;
      case 'profissional':
        this.router.navigateByUrl('/');
        break;
      case 'cliente':
        this.router.navigateByUrl('/');
        break;
      default:
        this.router.navigateByUrl('/home');
    }
  }
}
