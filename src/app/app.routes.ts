import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'home',
    loadComponent: () => import('./pages/home/home.page').then((m) => m.HomePage),
  },
  {
    path: '',
    redirectTo: 'home',
    pathMatch: 'full',
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login.page').then( m => m.LoginPage)
  },
  {
    path: 'servicos',
    loadComponent: () => import('./pages/servicos/servicos.page').then( m => m.ServicosPage)
  },
  {
    path: 'cursos',
    loadComponent: () => import('./pages/cursos/cursos.page').then( m => m.CursosPage)
  },
  {
    path: 'agendamentos',
    loadComponent: () => import('./pages/agendamentos/agendamentos.page').then( m => m.AgendamentoPage)
  },
  {
    path: 'dashboard-admin',
    loadComponent: () => import('./pages/dashboard-admin/dashboard-admin.page').then( m => m.DashboardAdminPage)
  },
  {
    path: 'confirmacao',
    loadComponent: () => import('./pages/confirmacao/confirmacao.page').then( m => m.ConfirmacaoPage)
  },
];
