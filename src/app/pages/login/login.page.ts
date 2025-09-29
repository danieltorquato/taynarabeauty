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

    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.success) {
          // Salvar dados do usuário e token
          this.authService.login(res.user, res.token).then(() => {
            this.redirectBasedOnRole();
          });
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
