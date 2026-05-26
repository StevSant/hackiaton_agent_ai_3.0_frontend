import { inject } from '@angular/core';
import { Router, type CanActivateFn } from '@angular/router';

import type { RoleCode } from './auth-user.model';
import { AuthStore } from './auth.store';

/**
 * Returns a CanActivateFn that allows access only if the current user has
 * the given role. Otherwise redirects to the user's role-appropriate default
 * landing (or /auth/login if no session).
 */
export function roleGuard(role: RoleCode): CanActivateFn {
  return () => {
    const auth = inject(AuthStore);
    const router = inject(Router);
    const user = auth.user();
    if (!user) {
      return router.parseUrl('/auth/login');
    }
    if (user.roleCode !== role) {
      const landing = user.roleCode === 'antifraude' ? '/antifraude/bandeja' : '/claims';
      return router.parseUrl(landing);
    }
    return true;
  };
}
