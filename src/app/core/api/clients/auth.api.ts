import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../config/env';

export type BackendRole = 'analista' | 'antifraude';

export interface LoginRequestBody {
  email: string;
  password: string;
}

export interface LoginUserPayload {
  email: string;
  role: BackendRole;
  full_name: string;
}

export interface LoginResponseBody {
  access_token: string;
  token_type: string;
  expires_in: number;
  user: LoginUserPayload;
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${environment.backendUrl}${environment.apiPrefix}/auth/login`;

  login(body: LoginRequestBody): Observable<LoginResponseBody> {
    return this.http.post<LoginResponseBody>(this.url, body);
  }
}
