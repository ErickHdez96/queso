import { Span } from "./common";

export type Value =
  | VarValue
  | LabelValue
  | UnitValue
  | NumberValue
  | BooleanValue;

export interface VarValue {
  kind: "var";
  span: Span;
  value: string;
}

export interface LabelValue {
  kind: "label";
  span: Span;
  value: string;
}

export interface UnitValue {
  kind: "unit";
  span: Span;
}

export interface NumberValue {
  kind: "number";
  span: Span;
  value: string;
}

export interface BooleanValue {
  kind: "boolean";
  span: Span;
  value: boolean;
}

export type CExpr = AppCExpr | FixCExpr;

export interface AppCExpr {
  kind: "app";
  span: Span;
  fn: Value;
  args: Value[];
}

export interface FixCExpr {
  kind: "fix";
  span: Span;
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

export const fix = (fns: FixCExpr["fns"], cexpr: CExpr, span: Span): CExpr => ({
  kind: "fix",
  span,
  fns,
  cexpr,
});

export const app = (fn: Value, args: Value[], span: Span): CExpr => ({
  kind: "app",
  span,
  fn,
  args,
});

export const vvar = (value: string, span: Span): Value => ({
  kind: "var",
  span,
  value,
});

export const label = (value: string, span: Span): Value => ({
  kind: "label",
  span,
  value,
});

export const number = (value: string, span: Span): Value => ({
  kind: "number",
  span,
  value,
});

export const boolean = (value: boolean, span: Span): Value => ({
  kind: "boolean",
  span,
  value,
});

export const unit = (span: Span): Value => ({
  kind: "unit",
  span,
});
