/**
 * One SHAP contributor from the supervised LightGBM model. Top-3 surfaced
 * on the detail page by `MlFactorsCard`. Wire-compatible with the backend
 * `FactorContribution` schema (see schemas/risk.py).
 *
 * - `direction: 'up'` means the feature pushed the probability of "posible
 *   fraude" higher; `'down'` means it pushed it lower.
 * - `shap_value` is the raw SHAP value; useful as a magnitude indicator
 *   in tooltips. Positive == "up", negative == "down".
 */
export interface FactorContribution {
  feature: string;
  shap_value: number;
  direction: 'up' | 'down';
}
