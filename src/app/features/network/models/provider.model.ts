export interface Provider {
  id: string;
  nombre: string;
  tipo: string;
  ciudad: string;
  casos: number;
  alertas: number;
  monto: number;
  listaRestrictiva: boolean;
  color: string;
}
