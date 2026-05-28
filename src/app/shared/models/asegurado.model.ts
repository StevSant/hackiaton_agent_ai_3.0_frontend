export interface Asegurado {
  id: string;
  nombre: string;
  segmento: string | null;
  ciudad: string;
  antiguedad: number | null;
  num_polizas: number;
  reclamos_ultimos_12_meses: number;
  mora_actual: boolean;
  score_cliente_simulado: number | null;
  casos: number;
  alertas: number;
  monto: number;
  ramos: string[];
  color: string;
}
