import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { IonContent, IonHeader, IonToolbar, IonTitle, IonButtons, IonBackButton, IonButton, IonIcon, IonItem, IonLabel, IonInput, IonCard, IonCardContent, IonCheckbox, IonSpinner, AlertController } from '@ionic/angular/standalone';
import { AuthService } from '../../services/auth.service';
import { ApiService } from '../../services/api.service';
import { addIcons } from 'ionicons';
import { personAddOutline, eyeOutline, eyeOffOutline } from 'ionicons/icons';

@Component({
  selector: 'app-criar-conta',
  templateUrl: './criar-conta.page.html',
  styleUrls: ['./criar-conta.page.scss'],
  standalone: true,
  imports: [
    IonSpinner, IonCheckbox, IonCardContent, IonCard, IonInput, IonLabel, IonItem,
    IonIcon, IonButton, IonBackButton, IonButtons, IonTitle, IonToolbar, IonHeader,
    IonContent, CommonModule, ReactiveFormsModule
  ]
})
export class CriarContaPage implements OnInit {
  registerForm!: FormGroup;
  loading = false;
  showPassword = false;
  showConfirmPassword = false;

  constructor(
    private formBuilder: FormBuilder,
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private api: ApiService,
    private alertController: AlertController
  ) {
    addIcons({ personAddOutline, eyeOutline, eyeOffOutline });
  }

  // Mostrar alert de sucesso
  async showSuccessAlert(message: string) {
    const alert = await this.alertController.create({
      header: '✅ Sucesso',
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

  // Mostrar alert simples de informação
  async showInfoAlert(title: string, message: string) {
    const alert = await this.alertController.create({
      header: title,
      message: message,
      buttons: ['OK']
    });
    await alert.present();
  }

  ngOnInit() {
    this.initializeForm();
  }

  private initializeForm() {
    this.registerForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(2)]],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', [Validators.required, this.phoneValidator]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', [Validators.required]],
      acceptTerms: [false, [Validators.requiredTrue]]
    }, { validators: this.passwordMatchValidator });
  }

  private phoneValidator(control: any) {
    if (!control.value) {
      return null;
    }

    // Remove todos os caracteres não numéricos
    const phoneNumber = control.value.replace(/\D/g, '');

    // Verifica se tem 10 ou 11 dígitos (com ou sem DDD)
    if (phoneNumber.length === 10 || phoneNumber.length === 11) {
      return null; // Válido
    }

    return { invalidPhone: true };
  }

  private passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');

    if (password && confirmPassword && password.value !== confirmPassword.value) {
      confirmPassword.setErrors({ mismatch: true });
      return { mismatch: true };
    }

    return null;
  }

  togglePassword() {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword() {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  formatPhone(event: any) {
    let value = event.target.value.replace(/\D/g, '');

    if (value.length <= 11) {
      if (value.length <= 2) {
        value = value;
      } else if (value.length <= 6) {
        value = `(${value.slice(0, 2)}) ${value.slice(2)}`;
      } else if (value.length <= 10) {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 6)}-${value.slice(6)}`;
      } else {
        value = `(${value.slice(0, 2)}) ${value.slice(2, 7)}-${value.slice(7, 11)}`;
      }
    }

    this.registerForm.patchValue({ phone: value });
  }

  onSubmit() {
    if (this.registerForm.valid && !this.loading) {
      this.loading = true;

      const formData = {
        name: this.registerForm.value.name,
        email: this.registerForm.value.email,
        phone: this.registerForm.value.phone,
        password: this.registerForm.value.password,
        role: 'cliente' // Padrão para novos usuários
      };

      this.api.createAccount(formData).subscribe({
        next: (response) => {
          this.loading = false;

          if (response.success) {
            // Fazer login automático e confirmar agendamento após criar conta
            this.authService.loginAndConfirmAppointment({
              email: formData.email,
              password: formData.password
            }).subscribe({
              next: (loginResponse) => {
                if (loginResponse.success) {
                  if (loginResponse.appointmentConfirmed) {
                    // Redirecionar para página de confirmação com dados do agendamento
                    this.router.navigate(['/confirmacao'], {
                      state: {
                        id: loginResponse.appointmentData?.id,
                        nome: loginResponse.appointmentData?.nome || formData.name,
                        servico: loginResponse.appointmentData?.procedimento_nome || 'Procedimento',
                        data: loginResponse.appointmentData?.data,
                        hora: loginResponse.appointmentData?.hora,
                        profissionalNome: loginResponse.appointmentData?.profissional_nome || 'Será definido automaticamente',
                        whatsapp: loginResponse.appointmentData?.whatsapp,
                        emailSent: !!loginResponse.appointmentData?.emailSent,
                        automaticConfirmation: true,
                        accountCreated: true
                      }
                    });
                  } else {
                    // Conta criada mas agendamento não confirmado
                    this.router.navigate(['/agendamentos'], {
                      queryParams: {
                        message: 'Conta criada com sucesso! Seu agendamento foi restaurado.',
                        autoComplete: 'true'
                      }
                    });
                  }
                } else {
                  this.showInfoAlert('Conta Criada', 'Conta criada, mas houve um problema no login. Tente fazer login manualmente.');
                  this.router.navigate(['/login']);
                }
              },
              error: (error) => {
                console.error('Erro no login automático:', error);
                this.showSuccessAlert('Conta criada com sucesso! Faça login para continuar.');
                this.router.navigate(['/login']);
              }
            });
          } else {
            this.showErrorAlert(response.message || 'Erro ao criar conta. Tente novamente.');
          }
        },
        error: (error) => {
          this.loading = false;
          console.error('Erro ao criar conta:', error);

          if (error.error?.message) {
            this.showErrorAlert(error.error.message);
          } else if (error.status === 409) {
            this.showErrorAlert('Este email já está em uso. Tente fazer login ou use outro email.');
          } else {
            this.showErrorAlert('Erro ao criar conta. Verifique sua conexão e tente novamente.');
          }
        }
      });
    } else {
      // Marcar todos os campos como tocados para mostrar erros
      Object.keys(this.registerForm.controls).forEach(key => {
        this.registerForm.get(key)?.markAsTouched();
      });
    }
  }

  goToLogin(event: Event) {
    event.preventDefault();
    this.router.navigate(['/login'], {
      queryParams: {
        returnUrl: '/agendamentos',
        message: 'Faça login para confirmar seu agendamento'
      }
    });
  }

  openTerms(event: Event) {
    event.preventDefault();
    // Implementar modal ou página de termos
    this.showInfoAlert('Termos e Condições', 'Termos e condições serão exibidos aqui.');
  }

  openPrivacy(event: Event) {
    event.preventDefault();
    // Implementar modal ou página de política de privacidade
    this.showInfoAlert('Política de Privacidade', 'Política de privacidade será exibida aqui.');
  }
}
