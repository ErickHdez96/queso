import { Span } from "./common";

export interface Mod {
  span: Span;
  items: Item[];
}

export type Item = DefineItem;

export interface DefineItem {
  span: Span;
  name: Ident;
  body: Expr;
}

export type Expr = NumberExpr | IdExpr | ApplicationExpr | LambdaExpr;

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
}

export interface Ident {
  span: Span;
  value: string;
}
