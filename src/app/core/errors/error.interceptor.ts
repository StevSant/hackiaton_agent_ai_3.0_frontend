import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { environment } from '../config/env';
import { AppError } from './app-error';

const LOGIN_URL = `${environment.backendUrl}${environment.apiPrefix}/auth/login`;

interface ErrorBody {
  code?: string;
  message?: string;
  // FastAPI wraps `HTTPException(detail={...})` as `{detail: {...}}`; our
  // own AppError handler returns `{code, message}` flat. Support both.
  detail?: { code?: string; message?: string };
}

function readErrorBody(err: HttpErrorResponse): { code: string; message: string } {
  const body = err.error as ErrorBody | null;
  return {
    code: body?.code ?? body?.detail?.code ?? 'http_error',
    message: body?.message ?? body?.detail?.message ?? err.message ?? 'Request failed',
  };
}

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authStore = inject(AuthStore);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const { code, message } = readErrorBody(err);

        // 401 on a protected request means the JWT expired or was revoked.
        // The login endpoint also returns 401 on bad credentials — don't bounce
        // the user mid-login, the login page already renders that error.
        if (err.status === 401 && req.url !== LOGIN_URL) {
          authStore.expireSession();
          void router.navigateByUrl('/auth/login');
        } else if (err.status === 403 && req.url !== LOGIN_URL && code === 'role_required') {
          // Session drift: the frontend's cached role no longer matches the JWT
          // the backend sees. Triggers when the backend restarted with
          // AUTH_ENABLED=false (stubs every request as analista) or JWT_SECRET
          // rotated. The roleGuard already let the user reach the page, so a
          // 403 from role_required means the local session is stale — treat
          // it like an expired session and bounce to login. Per project
          // CLAUDE.md §10b, genuine "wrong role for this action" 403s (cached
          // role does NOT match the required role) fall through to the
          // feature's toast handler.
          const userRole = authStore.user()?.roleCode;
          if (userRole && message.toLowerCase().includes(userRole)) {
            authStore.expireSession();
            void router.navigateByUrl('/auth/login');
          }
        }
        return throwError(() => new AppError(code, message, err.status));
      }
      return throwError(() => err);
    }),
  );
};
