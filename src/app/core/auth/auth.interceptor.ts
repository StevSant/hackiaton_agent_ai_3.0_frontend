import { type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';

import { environment } from '../config/env';
import { AuthStore } from './auth.store';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const isApiRequest =
    req.url.startsWith(environment.backendUrl) || req.url.startsWith(environment.apiPrefix);

  if (!isApiRequest) {
    return next(req);
  }

  const token = inject(AuthStore).accessToken();
  if (!token) {
    return next(req);
  }

  return next(
    req.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    }),
  );
};
