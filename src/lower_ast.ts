import * as ast from "./ast";
import * as hir from "./hir";
import { Span } from "./common";
import { SpanError } from "./error";
import {
  FunctionTy,
  InstTy,
  Ty,
  TyScheme,
  Types,
  VariableTy,
  ty_str,
  tyvar,
} from "./ty";
import { TyEnv, ValEnv, builtin_types, builtin_values } from "./builtins";

type Constraint = EqConstraint;

interface EqConstraint {
  kind: "eq";
  left: InstTy;
  right: InstTy;
  span: Span;
}

export class InferEngine {
  constructor(
    public substs: Record<symbol, InstTy> = {},
    public cnsts: Constraint[] = []
  ) {}

  new_varty(): VariableTy {
    return tyvar();
  }

  unify(lty: InstTy, rty: InstTy, span: Span): void {
    if (lty.kind === "var") {
      if (rty.kind === "var" && lty.id === rty.id) {
        return;
      }
      if (occurs(lty.id, rty)) {
        throw new SpanError(span, `Self-referential type ${ty_str(lty)}`);
      }
      const subst = this.substs[lty.id];
      if (subst === undefined) {
        this.substs[lty.id] = rty;
        return;
      } else {
        return this.unify(subst, rty, span);
      }
    }

    if (rty.kind === "var") {
      if (occurs(rty.id, lty)) {
        throw new SpanError(span, `Self-referential type ${ty_str(rty)}`);
      }
      const subst = this.substs[rty.id];
      if (subst === undefined) {
        this.substs[rty.id] = lty;
        return;
      } else {
        return this.unify(lty, subst, span);
      }
    }

    if (
      lty.kind === "constant" &&
      rty.kind === "constant" &&
      lty.name === rty.name
    ) {
      return;
    }

    if (lty.kind === "unit" && rty.kind === "unit") {
      return;
    }

    if (lty.kind === "fn" && rty.kind === "fn") {
      if (lty.parameters.length === rty.parameters.length) {
        for (let i = 0; i < lty.parameters.length; ++i) {
          this.unify(lty.parameters[i]!, rty.parameters[i]!, span);
        }
        this.unify(lty.result, rty.result, span);
        return;
      }
    }

    throw new SpanError(span, `Expected ${ty_str(lty)}, found ${ty_str(rty)}`);
  }

  constrain(kind: Constraint["kind"], lty: InstTy, rty: InstTy, span: Span) {
    this.cnsts.push({
      kind,
      left: lty,
      right: rty,
      span,
    });
  }

  solve_constraints() {
    for (const c of this.cnsts) {
      switch (c.kind) {
        case "eq": {
          this.unify(c.left, c.right, c.span);
          break;
        }
      }
    }
    this.cnsts = [];
    for (const name of Object.getOwnPropertySymbols(this.substs)) {
      // TODO: optimize
      this.substs[name] = this.substitute(this.substs[name]!);
    }
  }

  substitute<T extends Ty>(_t: T): T {
    let bound: symbol[] = [];
    const inner = <T extends Ty>(t: T): T => {
      switch (t.kind) {
        case "var":
          if (bound.includes(t.id)) {
            return t;
          }
          return (this.substs[t.id] as T | undefined) ?? t;
        case "fn": {
          const instantiations = t.instantiations;
          for (const insts of instantiations) {
            for (let i = 0; i < insts.length; ++i) {
              insts[i] = inner(insts[i]!);
            }
          }
          const fnty: FunctionTy = {
            kind: "fn",
            id: t.id,
            instantiations,
            parameters: t.parameters.map((p) => this.substitute(p)),
            result: this.substitute(t.result),
          };
          return fnty as T;
        }
        case "unit":
        case "constant":
          return t;
        case "forall": {
          bound = t.generics;
          const tyscheme: TyScheme = {
            kind: "forall",
            generics: t.generics,
            scheme: inner(t.scheme),
          };
          return tyscheme as T;
        }
      }
    };

    return inner(_t);
  }

  substitute_expr(expr: hir.Expr): hir.Expr {
    switch (expr.kind) {
      case "number":
      case "boolean":
      case "unit":
        return expr;
      case "id":
        return {
          kind: "id",
          span: expr.span,
          value: expr.value,
          ty: this.substitute(expr.ty),
        };
      case "binaryop":
        return {
          kind: "binaryop",
          span: expr.span,
          op: expr.op,
          left: this.substitute_expr(expr.left),
          right: this.substitute_expr(expr.right),
          ty: this.substitute(expr.ty),
        };
      case "application":
        return {
          kind: "application",
          span: expr.span,
          args: expr.args.map((a) => this.substitute_expr(a)),
          fn: this.substitute_expr(expr.fn),
          ty: this.substitute(expr.ty),
        };
      case "function":
        return {
          kind: "function",
          span: expr.span,
          parameters: expr.parameters.map((p) => [p[0], this.substitute(p[1])]),
          body: expr.body.map((b) => this.substitute_expr(b)),
          retexpr: this.substitute_expr(expr.retexpr),
          ty: this.substitute(expr.ty),
        };
    }
  }
}

export function lower_mod(
  mod: ast.Mod,
  tenv?: TyEnv,
  venv?: ValEnv
): [TyEnv, ValEnv, hir.Mod] {
  if (tenv === undefined) {
    tenv = builtin_types.new_child();
  }
  if (venv === undefined) {
    venv = builtin_values.new_child();
  }
  const infer_engine = new InferEngine();
  const items: hir.Item[] = [];

  for (const item of mod.items) {
    items.push(lower_item(item, tenv, venv, infer_engine));
  }

  const mod_span: Span = {
    lo: items[0]?.span?.lo ?? 0,
    hi: items[items.length - 1]?.span?.hi ?? 1,
  };

  return [
    tenv,
    venv,
    {
      span: mod_span,
      items,
    },
  ];
}

function lower_item(
  item: ast.Item,
  tenv: TyEnv,
  venv: ValEnv,
  infer_engine: InferEngine
): hir.Item {
  switch (item.kind) {
    case "define": {
      const val = lower_expr(item.body, tenv, venv, infer_engine);
      if (val.kind === "function") {
        val.ty.scheme.id = Symbol(item.name.value);
      }
      venv.insert(item.name.value, {
        ty: val.ty,
      });
      infer_engine.solve_constraints();
      const body = infer_engine.substitute_expr(val);
      if (body.kind !== "function") {
        throw new SpanError(
          item.span,
          `Expected a function, found a ${body.kind}`
        );
      }
      return {
        kind: "function",
        name: item.name,
        span: item.span,
        body,
      };
    }
  }
}

function lower_expr(
  expr: ast.Expr,
  tenv: TyEnv,
  venv: ValEnv,
  infer_engine: InferEngine
): hir.Expr {
  switch (expr.kind) {
    case "unit":
      return {
        kind: "unit",
        span: expr.span,
        ty: Types.unit,
      };
    case "number":
      return {
        kind: "number",
        span: expr.span,
        ty: Types.number,
        value: expr.value,
      };
    case "boolean":
      return {
        kind: "boolean",
        span: expr.span,
        ty: Types.boolean,
        value: expr.value,
      };
    case "id": {
      const id = venv.get(expr.value);
      if (id === undefined) {
        throw new SpanError(expr.span, `Undefined variable ${expr.value}`);
      }
      return {
        kind: "id",
        span: expr.span,
        value: expr.value,
        ty: instantiate_ty(id.ty, infer_engine),
      };
    }
    case "application": {
      const fn_expr = lower_expr(expr.fn, tenv, venv, infer_engine);
      const fnty = instantiate_ty(fn_expr.ty, infer_engine);
      const args: hir.Expr[] = [];
      for (const arg of expr.arguments) {
        args.push(lower_expr(arg, tenv, venv, infer_engine));
      }

      const retty = tyvar();
      const inferred_ty: FunctionTy = {
        kind: "fn",
        id: retty.id,
        instantiations: [],
        parameters: args.map((a) => instantiate_ty(a.ty, infer_engine)),
        result: retty,
      };
      infer_engine.constrain("eq", fnty, inferred_ty, expr.span);

      const binary_op = hir.try_to_binary_op(fn_expr);
      if (binary_op) {
        let e: hir.Expr = {
          kind: "binaryop",
          span: expr.span,
          op: binary_op,
          left: args[0]!,
          right: args[1]!,
          ty: retty,
        };

        for (let i = 2; i < args.length; ++i) {
          e = {
            kind: "binaryop",
            span: expr.span,
            op: binary_op,
            left: e,
            right: args[i]!,
            ty: retty,
          };
        }

        return e;
      }

      return {
        kind: "application",
        span: expr.span,
        fn: fn_expr,
        args: args,
        ty: retty,
      };
    }
    case "lambda": {
      const tenv_ = tenv.new_child();
      const venv_ = venv.new_child();
      const params: [hir.Ident, InstTy][] = [];
      for (const param of expr.parameters) {
        const party = tyvar();
        venv_.insert(param.value, {
          ty: party,
        });
        params.push([param, party]);
      }
      const resty = tyvar();
      const fnty: FunctionTy = {
        kind: "fn",
        id: resty.id,
        instantiations: [],
        parameters: params.map((p) => p[1]),
        result: resty,
      };

      const body: hir.Expr[] = [];
      for (const e of expr.body) {
        body.push(lower_expr(e, tenv_, venv_, infer_engine));
      }
      const ret_expr = lower_expr(expr.retexpr, tenv_, venv_, infer_engine);
      const ret_expr_ty = instantiate_ty(ret_expr.ty, infer_engine);
      infer_engine.constrain("eq", ret_expr_ty, resty, expr.retexpr.span);

      infer_engine.solve_constraints();
      const genty = generalize(infer_engine.substitute(fnty), venv);
      return {
        kind: "function",
        span: expr.span,
        ty: genty,
        parameters: params,
        body,
        retexpr: ret_expr,
      };
    }
  }
}

function generalize(ty: FunctionTy, valenv: ValEnv): TyScheme {
  const free_ty_variables_ty = free_type_variables_in_type(ty);
  const free_ty_variables_env = free_type_variables_in_env(valenv);
  return {
    kind: "forall",
    generics: Array.from(
      set_difference(free_ty_variables_ty, free_ty_variables_env)
    ),
    scheme: ty,
  };
}

function instantiate_ty(scheme: Ty, infer_engine: InferEngine): InstTy {
  if (!("generics" in scheme)) {
    return scheme;
  }

  function substitute_ty(ty: InstTy, substs: Record<symbol, InstTy>): InstTy {
    switch (ty.kind) {
      case "constant":
      case "unit":
        return ty;
      case "fn":
        return {
          ...ty,
          parameters: ty.parameters.map((t) => substitute_ty(t, substs)),
          result: substitute_ty(ty.result, substs),
        };
      case "var": {
        return substs[ty.id] ?? ty;
      }
    }
  }

  const substs: Record<symbol, InstTy> = {};
  const new_vartys: VariableTy[] = [];
  for (const s of scheme.generics) {
    const varty = infer_engine.new_varty();
    substs[s] = varty;
    new_vartys.push(varty);
  }

  const fty = substitute_ty(scheme.scheme, substs) as FunctionTy;
  if (new_vartys.length) {
    fty.instantiations.push(new_vartys);
  }
  return fty;
}

function free_type_variables_in_type(ty: InstTy): Set<symbol> {
  switch (ty.kind) {
    case "constant":
    case "unit":
      return new Set();
    case "fn":
      return new Set([
        ...ty.parameters.reduce<symbol[]>(
          (acc, p) => [...acc, ...Array.from(free_type_variables_in_type(p))],
          []
        ),
        ...Array.from(free_type_variables_in_type(ty.result)),
      ]);
    case "var":
      return new Set([ty.id]);
  }
}

function set_difference<T>(a: Set<T>, b: Set<T>): Set<T> {
  const res = new Set<T>();
  for (const el of a) {
    if (!b.has(el)) {
      res.add(el);
    }
  }
  return res;
}

function free_type_variables_in_scheme(tyscheme: TyScheme): Set<symbol> {
  return set_difference(
    free_type_variables_in_type(tyscheme.scheme),
    new Set(tyscheme.generics)
  );
}

function free_type_variables_in_env(env: ValEnv): Set<symbol> {
  const ftypes = new Set<symbol>();
  for (const val of Object.values(env.mapping)) {
    const ty = val.ty;
    if ("generics" in ty) {
      for (const el of free_type_variables_in_scheme(ty)) {
        ftypes.add(el);
      }
    } else {
      for (const el of free_type_variables_in_type(ty)) {
        ftypes.add(el);
      }
    }
  }
  if (env.parent) {
    return new Set([
      ...Array.from(ftypes),
      ...Array.from(free_type_variables_in_env(env.parent)),
    ]);
  }
  return ftypes;
}

/**
 * Tests if `varty` appears withing `ty`.
 */
function occurs(varty: symbol, ty: InstTy): boolean {
  switch (ty.kind) {
    case "constant":
    case "unit":
      return false;
    case "fn":
      return (
        ty.parameters.some((t) => occurs(varty, t)) || occurs(varty, ty.result)
      );
    case "var":
      return ty.id === varty;
  }
}
