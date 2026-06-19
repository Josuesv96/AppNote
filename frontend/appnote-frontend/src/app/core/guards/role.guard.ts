import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard = (roles: string[]): CanActivateFn => () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const rol = auth.getRol();
  if (rol && roles.includes(rol)) return true;
  router.navigate(['/login']);
  return false;
};
