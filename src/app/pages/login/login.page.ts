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

    console.log('Iniciando login para:', this.email);
    this.loading = true;

    // Verificar se há agendamento pendente
    const hasPendingAppointment = localStorage.getItem('tempAppointmentData');

    if (hasPendingAppointment) {
      // Usar método que confirma agendamento automaticamente
      this.authService.loginAndConfirmAppointment({ email: this.email, password: this.password }).subscribe({
        next: (res) => {
          console.log('Resposta do login com agendamento:', res);
          this.loading = false;
          if (res && res.success) {
            if (res.appointmentConfirmed) {
              console.log('Agendamento confirmado, redirecionando...');
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
              console.log('Login bem-sucedido, redirecionando...');
              // Login bem-sucedido mas agendamento não confirmado
              this.redirectBasedOnRole();
            }
          } else {
            console.error('Falha no login:', res?.message);
            this.showErrorAlert(res?.message || 'Falha no login');
          }
        },
        error: (err) => {
          console.error('Erro no login:', err);
          this.loading = false;
          this.showErrorAlert(err?.error?.message || 'Erro ao conectar ao servidor');
        }
      });
    } else {
      // Login normal sem agendamento pendente
      this.authService.login({ email: this.email, password: this.password }).subscribe({
        next: (res) => {
          console.log('Resposta do login normal:', res);
          this.loading = false;
          if (res && res.success) {
            console.log('Login bem-sucedido, redirecionando...');
            this.redirectBasedOnRole();
          } else {
            console.error('Falha no login:', res?.message);
            this.showErrorAlert(res?.message || 'Falha no login');
          }
        },
        error: (err) => {
          console.error('Erro no login:', err);
          this.loading = false;
          this.showErrorAlert(err?.error?.message || 'Erro ao conectar ao servidor');
        }
      });
    }
  }

  private redirectBasedOnRole() {
    const user = this.authService.currentUser;
    console.log('Redirecionando usuário:', user);

    if (!user) {
      console.error('Usuário não encontrado para redirecionamento');
      return;
    }

    switch (user.role) {
      case 'admin':
        console.log('Redirecionando admin para home');
        this.router.navigateByUrl('/');
        break;
      case 'recepcao':
        console.log('Redirecionando recepção para dashboard');
        this.router.navigateByUrl('/dashboard-admin');
        break;
      case 'profissional':
        console.log('Redirecionando profissional para home');
        this.router.navigateByUrl('/');
        break;
      case 'cliente':
        console.log('Redirecionando cliente para home');
        this.router.navigateByUrl('/');
        break;
      default:
        console.log('Redirecionando para home (role padrão)');
        this.router.navigateByUrl('/home');
    }
  }
}
