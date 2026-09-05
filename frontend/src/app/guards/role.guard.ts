import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService, UserRole } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.isAuthenticated) {
    router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
    return false;
  }

  const role = authService.currentRole;
  if (role === 'ADMIN') {
    return true; // Admin has full system access
  }

  // Check explicit roles list if provided
  const expectedRoles = route.data?.['roles'] as UserRole[] | undefined;
  if (expectedRoles && expectedRoles.length > 0) {
    if (expectedRoles.includes(role)) {
      return true;
    }
  }

  // Check module permission if specified
  const moduleKey = route.data?.['module'] as string | undefined;
  if (moduleKey && authService.canAccess(moduleKey)) {
    return true;
  }

  // If neither matches, deny access
  router.navigate(['/unauthorized'], { queryParams: { deniedPath: state.url, role } });
  return false;
};
