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

export type Expr = NumberExpr;

export interface NumberExpr {
  span: Span;
  value: string;
}

export interface Ident {
  span: Span;
  value: string;
}
