import { builtin_values } from "./builtins";
import { Span } from "./common";
import { UnitTy, ConstantTy, InstTy, TyScheme } from "./ty";

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

export type Expr =
  | UnitExpr
  | BinaryOpExpr
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
  value: number;
  ty: ConstantTy;
}

export interface IdExpr {
  kind: "id";
  span: Span;
  value: string;
  ty: InstTy;
}

export interface BinaryOpExpr {
  kind: "binaryop";
  span: Span;
  op: "+";
  left: Expr;
  right: Expr;
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
  ty: TyScheme;
  parameters: [Ident, InstTy][];
  body: Expr[];
  retexpr: Expr;
}

export interface Ident {
  span: Span;
  value: string;
}

export const try_to_binary_op = (e: Expr): BinaryOpExpr["op"] | undefined => {
  if (e.kind === "id") {
    const e_ty = e.ty;
    const builtin_ty = builtin_values.get(e.value)?.ty;
    if (
      is_binary_op(e.value) &&
      e_ty.kind === "fn" &&
      builtin_ty?.kind === "forall" &&
      e_ty.id === builtin_ty.scheme.id
    ) {
      return e.value;
    }
  }
  return undefined;
};

function is_binary_op(op: string): op is BinaryOpExpr["op"] {
  return op === "+";
}
