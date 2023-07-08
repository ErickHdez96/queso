import { Span } from "./common";
import { Ty, UnitTy, ConstantTy, InstTy } from "./ty";

export interface Mod {
  span: Span;
  items: Item[];
}

export type Item = FunctionItem;

export interface FunctionItem {
  kind: "function";
  span: Span;
  name: Ident;
  body: FunctionExpr;
}

export interface StaticItem {
  kind: "static";
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
  | FunctionExpr;

export interface UnitExpr {
  kind: "unit";
  span: Span;
  ty: UnitTy;
}

export interface BooleanExpr {
  kind: "boolean";
  span: Span;
  value: boolean;
  ty: ConstantTy;
}

export interface NumberExpr {
  kind: "number";
  span: Span;
  value: string;
  ty: ConstantTy;
}

export interface IdExpr {
  kind: "id";
  span: Span;
  value: string;
  ty: InstTy;
}

export interface ApplicationExpr {
  kind: "application";
  span: Span;
  fn: Expr;
  args: Expr[];
  ty: InstTy;
}

export interface FunctionExpr {
  kind: "function";
  span: Span;
  ty: Ty;
  parameters: [Ident, InstTy][];
  body: Expr[];
  retexpr: Expr;
}

export interface Ident {
  span: Span;
  value: string;
}
