export type RuleChangeKind = 'creada' | 'editada' | 'pausada' | 'reactivada' | 'umbral';

export interface RuleChange {
  id: string;
  ts: string;
  actor: string;
  ruleCode: string;
  ruleName: string;
  kind: RuleChangeKind;
  summary: string;
  before?: string;
  after?: string;
}
