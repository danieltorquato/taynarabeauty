import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IonContent, IonInput, IonButton } from '@ionic/angular/standalone';
import { ApiService } from '../../services/api.service';

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

  constructor(private api: ApiService, private router: Router) {}

  ngOnInit() {}

  onSubmit() {
    if (this.loading) return;
    this.loading = true;
    this.api.login({ email: this.email, password: this.password }).subscribe({
      next: (res) => {
        this.loading = false;
        if (res && res.success) {
          localStorage.setItem('auth_token', res.token || '');
          this.router.navigateByUrl('/dashboard-admin');
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
