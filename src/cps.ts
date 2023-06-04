export type Value =
  | VarValue
  | LabelValue
  | UnitValue
  | NumberValue
  | BooleanValue;

export interface VarValue {
  kind: "var";
  value: string;
}

export interface LabelValue {
  kind: "label";
  value: string;
}

export interface UnitValue {
  kind: "unit";
}

export interface NumberValue {
  kind: "number";
  value: string;
}

export interface BooleanValue {
  kind: "boolean";
  value: boolean;
}

export type CExpr = AppCExpr | FixCExpr;

export interface AppCExpr {
  kind: "app";
  fn: Value;
  args: Value[];
}

export interface FixCExpr {
  kind: "fix";
  fns: [string, string[], CExpr][];
  cexpr: CExpr;
}

/*
export interface SwitchCExpr {
  kind: "switch";
  value: Value;
  branches: CExpr[];
}

export interface PrimOpCExpr {
  kind: "primop";
  primop: PrimOp;
  args: Value[];
  results: string[];
  branches: CExpr[];
}
*/
