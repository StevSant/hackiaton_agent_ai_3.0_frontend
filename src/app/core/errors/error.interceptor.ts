import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { catchError, throwError } from 'rxjs';

import { AppError } from './app-error';

export const errorInterceptor: HttpInterceptorFn = (req, next) =>
  next(req).pipe(
    catchError((err: unknown) => {
      if (err instanceof HttpErrorResponse) {
        const code = (err.error as { code?: string } | null)?.code ?? 'http_error';
        const message =
          (err.error as { message?: string } | null)?.message ?? err.message ?? 'Request failed';
        return throwError(() => new AppError(code, message, err.status));
      }
      return throwError(() => err);
    }),
  );
