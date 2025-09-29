import { Injectable } from '@angular/core';
import { Storage } from '@ionic/storage-angular';
import { BehaviorSubject, Observable } from 'rxjs';

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'recepcao' | 'profissional' | 'cliente';
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private _user = new BehaviorSubject<User | null>(null);
  private _isAuthenticated = new BehaviorSubject<boolean>(false);

  constructor(private storage: Storage) {
    this.loadStoredUser();
  }

  get user$(): Observable<User | null> {
    return this._user.asObservable();
  }

  get isAuthenticated$(): Observable<boolean> {
    return this._isAuthenticated.asObservable();
  }

  get currentUser(): User | null {
    return this._user.value;
  }

  get isAuthenticated(): boolean {
    return this._isAuthenticated.value;
  }

  private async loadStoredUser() {
    try {
      const user = await this.storage.get('user');
      if (user) {
        this._user.next(user);
        this._isAuthenticated.next(true);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário armazenado:', error);
    }
  }

  async login(user: User, token: string) {
    try {
      await this.storage.set('user', user);
      await this.storage.set('token', token);
      this._user.next(user);
      this._isAuthenticated.next(true);
    } catch (error) {
      console.error('Erro ao salvar dados de login:', error);
    }
  }

  async logout() {
    try {
      await this.storage.remove('user');
      await this.storage.remove('token');
      this._user.next(null);
      this._isAuthenticated.next(false);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  hasRole(requiredRole: string | string[]): boolean {
    const user = this.currentUser;
    if (!user) return false;

    if (Array.isArray(requiredRole)) {
      return requiredRole.includes(user.role);
    }

    return user.role === requiredRole;
  }

  canAccessAdmin(): boolean {
    return this.hasRole(['admin', 'recepcao']);
  }

  canAccessProfissional(): boolean {
    return this.hasRole(['admin', 'recepcao', 'profissional']);
  }

  canAccessGestaoProfissionais(): boolean {
    return this.hasRole(['admin']);
  }

  canAccessAgendamentos(): boolean {
    return this.hasRole(['admin', 'recepcao', 'profissional', 'cliente']);
  }

  canAccessDashboard(): boolean {
    return this.hasRole(['admin', 'recepcao']);
  }
}
