import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { Observable, map, take, filter } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Aguardar a inicialização do AuthService
    return this.authService.isAuthenticated$.pipe(
      filter(() => this.authService._initialized), // Aguardar inicialização
      take(1),
      map(isAuthenticated => {
        if (!isAuthenticated || !this.authService.currentUser) {
          this.router.navigate(['/login']);
          return false;
        }
        return true;
      })
    );
  }
}
