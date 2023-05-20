import { Span } from "./common";

export interface Mod {
  span: Span;
  items: Item[];
}

export type Item = DefineItem;

export interface DefineItem {
  kind: "define";
  span: Span;
  name: Ident;
  body: Expr;
}

export type Expr =
  | UnitExpr
  | BooleanExpr
  | NumberExpr
  | IdExpr
  | ApplicationExpr
  | LambdaExpr;

export interface UnitExpr {
  kind: "unit";
  span: Span;
}

export interface BooleanExpr {
  kind: "boolean";
  span: Span;
  value: boolean;
}

export interface NumberExpr {
  kind: "number";
  span: Span;
  value: string;
}

export interface IdExpr {
  kind: "id";
  span: Span;
  value: string;
}

export interface ApplicationExpr {
  kind: "application";
  span: Span;
  fn: Expr;
  arguments: Expr[];
}

export interface LambdaExpr {
  kind: "lambda";
  span: Span;
  parameters: Ident[];
  body: Expr[];
  retexpr: Expr;
}

export interface Ident {
  span: Span;
  value: string;
}
