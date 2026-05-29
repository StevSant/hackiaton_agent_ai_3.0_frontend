/**
 * NLP read of a claim's free-text `descripcion`. Wire-compatible with the
 * backend `NarrativeAnalysis` schema (schemas/narrative_analysis.py).
 *
 * Covers the spec's NLP sub-capabilities that the rules engine assumed but
 * never had: entity extraction and description-coherence analysis. The
 * `narrativa_ilogica` verdict is the genuine source for FS-09 — surfaced here
 * as *análisis* / *posible incoherencia*, never an accusation.
 */
// Fields are optional to mirror the wire shape: the backend defaults every
// field, so the generated OpenAPI schema marks them as not-required. Consumers
// nullish-guard each field.
export interface ExtractedEntities {
  personas?: string[];
  lugares?: string[];
  fechas?: string[];
  vehiculos?: string[];
  terceros?: string[];
  montos?: string[];
}

export interface NarrativeAnalysis {
  entidades?: ExtractedEntities;
  narrativa_ilogica?: boolean;
  incoherencias?: string[];
  resumen_narrativa?: string;
}
