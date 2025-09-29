import { Routes } from '@angular/router';
import { AuthGuard } from './guards/auth.guard';
import { RoleGuard } from './guards/role.guard';

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
    loadComponent: () => import('./pages/agendamentos/agendamentos.page').then( m => m.AgendamentoPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'recepcao', 'profissional', 'cliente'] }
  },
  {
    path: 'dashboard-admin',
    loadComponent: () => import('./pages/dashboard-admin/dashboard-admin.page').then( m => m.DashboardAdminPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'recepcao'] }
  },
  {
    path: 'confirmacao',
    loadComponent: () => import('./pages/confirmacao/confirmacao.page').then( m => m.ConfirmacaoPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'gestao-profissionais',
    loadComponent: () => import('./pages/gestao-profissionais/gestao-profissionais.page').then( m => m.GestaoProfissionaisPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin'] }
  },
  {
    path: 'meus-agendamentos',
    loadComponent: () => import('./pages/meus-agendamentos/meus-agendamentos.page').then( m => m.MeusAgendamentosPage),
    canActivate: [AuthGuard]
  },
  {
    path: 'agendamentos-admin',
    loadComponent: () => import('./pages/agendamentos-admin/agendamentos-admin.page').then( m => m.AgendamentosAdminPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'recepcao', 'profissional'] }
  },
  {
    path: 'atendimento',
    loadComponent: () => import('./pages/agendamentos-admin/agendamentos-admin.page').then( m => m.AgendamentosAdminPage),
    canActivate: [AuthGuard, RoleGuard],
    data: { roles: ['admin', 'recepcao'] }
  },
  {
    path: 'procedimento-detalhes/:id',
    loadComponent: () => import('./pages/procedimento-detalhes/procedimento-detalhes.page').then( m => m.ProcedimentoDetalhesPage)
  },
];
