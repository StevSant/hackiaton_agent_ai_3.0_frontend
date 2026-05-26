export type RoleCode = 'analista' | 'antifraude';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: string;
  roleCode: RoleCode;
  sucursal: string;
  initials: string;
}
