import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

import { AuthStore } from '../auth/auth.store';
import { environment } from '../config/env';
import { AppError } from './app-error';

const LOGIN_URL = `${environment.backendUrl}${environment.apiPrefix}/auth/login`;

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authStore = inject(AuthStore);

  return next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        // 401 on a protected request means the JWT expired or was revoked.
        // The login endpoint also returns 401 on bad credentials — don't bounce
        // the user mid-login, the login page already renders that error.
        if (err.status === 401 && req.url !== LOGIN_URL) {
          authStore.expireSession();
          void router.navigateByUrl('/auth/login');
        }
        const code = (err.error as { code?: string } | null)?.code ?? 'http_error';
        const message =
          (err.error as { message?: string } | null)?.message ?? err.message ?? 'Request failed';
        return throwError(() => new AppError(code, message, err.status));
      }
      return throwError(() => err);
    }),
  );
};
