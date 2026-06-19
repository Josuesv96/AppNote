import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'registro',
    loadComponent: () => import('./features/auth/registro/registro.component').then(m => m.RegistroComponent)
  },
  {
    path: 'paciente',
    canActivate: [authGuard, roleGuard(['paciente'])],
    loadComponent: () => import('./features/paciente/paciente.component').then(m => m.PacienteComponent)
  },
  {
    path: 'terapeuta',
    canActivate: [authGuard, roleGuard(['terapeuta'])],
    loadComponent: () => import('./features/terapeuta/terapeuta.component').then(m => m.TerapeutaComponent)
  },
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard(['admin'])],
    loadComponent: () => import('./features/admin/admin.component').then(m => m.AdminComponent)
  },
  { path: '**', redirectTo: 'login' }
];
