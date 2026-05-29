import type { Provider } from '@shared/models';

export function buildProviderWelcomeMessage(provider: Provider): string {
  const nombre = provider.nombre || provider.id;
  const restrictivaNote = provider.listaRestrictiva
    ? ' — **figura en lista restrictiva**'
    : '';
  const riskPct =
    provider.casos > 0 ? Math.round((provider.alertas / provider.casos) * 100) : 0;

  return (
    `Estoy revisando al proveedor **${nombre}** (${provider.tipo} · ${provider.ciudad})${restrictivaNote}.\n\n` +
    `Tiene **${provider.casos} casos** asociados, de los cuales **${provider.alertas} generaron alertas** ` +
    `(${riskPct}% de riesgo).\n\n` +
    `¿Qué te gustaría analizar de este proveedor?`
  );
}

export const PROVIDER_CHAT_SUGGESTIONS = [
  '¿Por qué tiene tantas alertas?',
  '¿Qué ramos concentra?',
  '¿Hay casos similares con este proveedor?',
  'Resume sus señales más comunes',
  '¿Está en lista restrictiva o cerca?',
] as const;
