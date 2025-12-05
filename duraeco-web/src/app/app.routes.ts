import { Routes } from '@angular/router';
import { authGuard, guestGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'dashboard',
    pathMatch: 'full'
  },
  {
    path: 'login',
    loadComponent: () => import('./pages/login/login').then(m => m.Login),
    canActivate: [guestGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./pages/register/register').then(m => m.Register),
    canActivate: [guestGuard]
  },
  {
    path: 'dashboard',
    loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.Dashboard),
    canActivate: [authGuard]
  },
  {
    path: 'reports',
    loadComponent: () => import('./pages/reports/reports').then(m => m.Reports),
    canActivate: [authGuard]
  },
  {
    path: 'reports/new',
    loadComponent: () => import('./pages/new-report/new-report').then(m => m.NewReport),
    canActivate: [authGuard]
  },
  {
    path: 'reports/:id',
    loadComponent: () => import('./pages/report-detail/report-detail').then(m => m.ReportDetail),
    canActivate: [authGuard]
  },
  {
    path: 'hotspots',
    loadComponent: () => import('./pages/hotspots/hotspots').then(m => m.Hotspots),
    canActivate: [authGuard]
  },
  {
    path: 'chat',
    loadComponent: () => import('./pages/chat/chat').then(m => m.Chat),
    canActivate: [authGuard]
  },
  {
    path: 'profile',
    loadComponent: () => import('./pages/profile/profile').then(m => m.Profile),
    canActivate: [authGuard]
  },
  {
    path: '**',
    redirectTo: 'dashboard'
  }
];
