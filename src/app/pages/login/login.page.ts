import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton, AlertController } from '@ionic/angular/standalone';
import { Subscription } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: true,
  imports: [IonContent, IonInput, IonButton, CommonModule, FormsModule]
})
export class LoginPage implements OnInit, OnDestroy {
  email = '';
  password = '';
  showPassword = false;
  loading = false;
  private userSubscription?: Subscription;

  constructor(
    private api: ApiService,
    private authService: AuthService,
    private router: Router,
    private alertController: AlertController
  ) {}

  ngOnInit() {
    // Aguardar o AuthService estar inicializado antes de verificar autenticação
    this.userSubscription = this.authService.user$.subscribe(user => {
      if (user && this.authService.isAuthenticated) {
        this.redirectBasedOnRole();
      }
    });
  }

  ngOnDestroy() {
    if (this.userSubscription) {
      this.userSubscription.unsubscribe();
    }
  }

  // Mostrar alert simples de informação
  async showInfoAlert(title: string, message: string) {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  // Mostrar alert de erro
  async showErrorAlert(message: string) {
    const alert = await this.alertController.create({
      header: '❌ Erro',
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  onSubmit() {
    if (this.loading) return;

    // Validação básica dos campos
    if (!this.email || !this.password) {
      this.showInfoAlert('Campos Obrigatórios', 'Por favor, preencha todos os campos');
      return;
    }
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
            this.showErrorAlert(res?.message || 'Falha no login');
          }
        },
        error: (err) => {
          this.loading = false;
          this.showErrorAlert(err?.error?.message || 'Erro ao conectar ao servidor');
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
            this.showErrorAlert(res?.message || 'Falha no login');
          }
        },
        error: (err) => {
          this.loading = false;
          this.showErrorAlert(err?.error?.message || 'Erro ao conectar ao servidor');
        }
      });
    }
  }

  private redirectBasedOnRole() {
    const user = this.authService.currentUser;
    if (!user) {
      return;
    }

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
