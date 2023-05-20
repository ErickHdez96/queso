import { Expr, Item, Mod } from "./ast";
import { Span } from "./common";
import { SpanError } from "./error";

let tyvarid = 0;

type TyEnv = Env<Ty>;
type ValEnv = Env<Value>;

function clone_value<T>(o: T): T {
  switch (typeof o) {
    case "object": {
      if (o === null) {
        return o;
      }
      if (Array.isArray(o)) {
        return o.map((e) => clone_value(e)) as T;
      }
      const new_o = {} as T;
      for (const [key, value] of Object.entries(o)) {
        (new_o as any)[key] = clone_value(value);
      }
      return new_o;
    }
    default:
      return o;
  }
}

class Env<T> {
  mapping: Record<string, T> = {};
  parent: Env<T> | undefined = undefined;

  new_child(): Env<T> {
    const e = new Env<T>();
    e.parent = this;
    return e;
  }

  insert(key: string, val: T) {
    this.mapping[key] = val;
  }

  get(key: string): T | undefined {
    if (key in this.mapping) {
      return this.mapping[key];
    }
    return this.parent?.get(key);
  }

  clone_self(): Env<T> {
    const new_env = new Env<T>();
    new_env.parent = this.parent;
    new_env.mapping = clone_value(this.mapping);
    return new_env;
  }
}

/**
 * An instantiated type (i.e. no generics).
 */
type InstTy = UnitTy | ConstantTy | VariableTy | FunctionTy;
type Ty = InstTy | TyScheme;

interface UnitTy {
  kind: "unit";
}

interface ConstantTy {
  kind: "constant";
  name: string;
}

interface FunctionTy {
  kind: "fn";
  parameters: InstTy[];
  result: InstTy;
}

interface VariableTy {
  kind: "var";
  id: symbol;
}

/**
 * Generic types (for functions).
 */
export interface TyScheme {
  kind: "forall";
  generics: symbol[];
  scheme: FunctionTy;
}

export const Types = {
  boolean: {
    kind: "constant",
    name: "boolean",
  },
  number: {
    kind: "constant",
    name: "number",
  },
  unit: {
    kind: "unit",
  },
} as const;

type Substitution<T> = [symbol, T];

interface InferValue {
  substitutions: Substitution<InstTy>[];
  ty: Ty;
}

interface Value {
  ty: Ty;
}

function build_builtin_types(): TyEnv {
  const builtin_types: TyEnv = new Env();
  builtin_types.mapping = {
    number: Types.number,
    boolean: Types.boolean,
  };
  return builtin_types;
}
export const builtin_types = build_builtin_types();

function build_builtin_values(): ValEnv {
  const builtin_values: ValEnv = new Env();
  const generics = [tyvar(), tyvar(), tyvar(), tyvar()] as const;
  builtin_values.mapping = {
    debug: {
      ty: {
        kind: "forall",
        generics: [generics[0].id],
        scheme: {
          kind: "fn",
          parameters: [generics[0]],
          result: generics[0],
        },
      },
    },
    log: {
      ty: {
        kind: "forall",
        generics: [generics[1].id],
        scheme: {
          kind: "fn",
          parameters: [generics[1]],
          result: Types.unit,
        },
      },
    },
    "+": {
      ty: {
        kind: "forall",
        generics: [],
        scheme: {
          kind: "fn",
          parameters: [Types.number, Types.number],
          result: Types.number,
        },
      },
    },
    "=": {
      ty: {
        kind: "forall",
        generics: [generics[2].id, generics[3].id],
        scheme: {
          kind: "fn",
          parameters: [generics[2], generics[3]],
          result: Types.boolean,
        },
      },
    },
  };
  return builtin_values;
}
export const builtin_values = build_builtin_values();

export function lower_mod(mod: Mod): [TyEnv, ValEnv] {
  const tenv: TyEnv = builtin_types.new_child();
  const venv: ValEnv = builtin_values.new_child();

  for (const item of mod.items) {
    lower_item(item, tenv, venv);
  }

  return [tenv, venv];
}

function lower_item(item: Item, tenv: TyEnv, venv: ValEnv) {
  switch (item.kind) {
    case "define": {
      const val = lower_expr(item.body, tenv, venv);
      venv.insert(item.name.value, {
        ty: val.ty,
      });
    }
  }
}

function lower_expr(expr: Expr, tenv: TyEnv, venv: ValEnv): InferValue {
  switch (expr.kind) {
    case "unit":
      return {
        substitutions: [],
        ty: Types.unit,
      };
    case "number":
      return {
        substitutions: [],
        ty: Types.number,
      };
    case "boolean":
      return {
        substitutions: [],
        ty: Types.boolean,
      };
    case "id": {
      const id = venv.get(expr.value);
      if (id === undefined) {
        throw new SpanError(expr.span, `Undefined variable ${expr.value}`);
      }
      return {
        substitutions: [],
        ty: id.ty,
      };
    }
    case "application": {
      const { substitutions: fn_subs, ty: fn_ty } = lower_expr(
        expr.fn,
        tenv,
        venv
      );
      venv = apply_subst_valenv(fn_subs, venv);
      let substs: Substitution<InstTy>[] = fn_subs;
      const fnty = instantiate_ty(fn_ty);
      const args: InstTy[] = [];
      for (const arg of expr.arguments) {
        const { substitutions, ty } = lower_expr(arg, tenv, venv);
        venv = apply_subst_valenv(substitutions, venv);
        substs = compose_subst(substs, substitutions);
        args.push(instantiate_ty(ty));
      }

      const retty = tyvar();
      const inferred_ty: FunctionTy = {
        kind: "fn",
        parameters: args,
        result: retty,
      };
      const inferred_substs = unify(fnty, inferred_ty, expr.span);
      substs = compose_subst(substs, inferred_substs);
      return {
        substitutions: substs,
        ty: retty,
      };
    }
    case "lambda": {
      const tenv_ = tenv.new_child();
      let venv_ = venv.new_child();
      const partys: InstTy[] = [];
      for (const param of expr.parameters) {
        const party = tyvar();
        venv_.insert(param.value, {
          ty: party,
        });
        partys.push(party);
      }
      const resty = tyvar();
      let fnty: FunctionTy = {
        kind: "fn",
        parameters: partys,
        result: resty,
      };

      let substs: Substitution<InstTy>[] = [];
      for (const e of expr.body) {
        const inf = lower_expr(e, tenv_, venv_);
        venv_ = apply_subst_valenv(substs, venv_);
        substs = compose_subst(substs, inf.substitutions);
      }
      const { substitutions: ret_substs, ty: ret_ty } = lower_expr(
        expr.retexpr,
        tenv_,
        venv_
      );
      substs.push([resty.id, instantiate_ty(ret_ty)]);
      venv_ = apply_subst_valenv(substs, venv_);
      substs = compose_subst(substs, ret_substs);
      fnty = apply_subst_type(substs, fnty);
      return {
        substitutions: substs,
        ty: generalize(fnty, venv),
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

function apply_subst_type<T extends InstTy>(
  substs: Substitution<InstTy>[],
  ty: T
): T {
  let t = ty;
  for (const [s, to_type] of substs) {
    t = substitute_type_variable(t, s, to_type) as T;
  }
  return t;
}

function apply_subst_scheme(
  substs: Substitution<InstTy>[],
  ty: TyScheme
): TyScheme {
  let t = ty;
  for (const [s, to_type] of substs) {
    t = substitute_type_scheme(t, s, to_type);
  }
  return t;
}

function apply_subst_valenv(
  substs: Substitution<InstTy>[],
  valenv: ValEnv
): ValEnv {
  const newvalenv = valenv.clone_self();
  for (const [key, val] of Object.entries(newvalenv.mapping)) {
    const in_type = val.ty;
    if ("generics" in in_type) {
      newvalenv.mapping[key] = {
        ...val,
        ty: apply_subst_scheme(substs, in_type),
      };
    } else {
      newvalenv.mapping[key] = {
        ...val,
        ty: apply_subst_type(substs, in_type),
      };
    }
  }
  return newvalenv;
}

function apply_subst_substs(
  substs: Substitution<InstTy>[],
  sub: Substitution<InstTy>[]
): Substitution<InstTy>[] {
  const new_subs: Substitution<InstTy>[] = [];
  for (const [in_s, in_ty] of sub) {
    new_subs.push([in_s, apply_subst_type(substs, in_ty)]);
  }
  return new_subs;
}

function compose_subst(
  s1: Substitution<InstTy>[],
  s2: Substitution<InstTy>[]
): Substitution<InstTy>[] {
  return [...s1, ...apply_subst_substs(s1, s2)];
}

function substitute_type_variable(
  in_type: InstTy,
  from_type: symbol,
  to_type: InstTy
): InstTy {
  switch (in_type.kind) {
    case "constant":
    case "unit":
      return in_type;
    case "fn":
      return {
        kind: "fn",
        parameters: in_type.parameters.map((t) =>
          substitute_type_variable(t, from_type, to_type)
        ),
        result: substitute_type_variable(in_type.result, from_type, to_type),
      };
    case "var":
      if (in_type.id === from_type) {
        return to_type;
      }
      return in_type;
  }
}

function substitute_type_scheme(
  in_type: TyScheme,
  from_type: symbol,
  to_type: InstTy
): TyScheme {
  function inner(
    captured: Set<symbol>,
    in_type: InstTy,
    from_type: symbol,
    to_type: InstTy
  ): InstTy {
    switch (in_type.kind) {
      case "constant":
      case "unit":
        return in_type;
      case "fn":
        return {
          kind: "fn",
          parameters: in_type.parameters.map((p) =>
            inner(captured, p, from_type, to_type)
          ),
          result: inner(captured, in_type.result, from_type, to_type),
        };
      case "var":
        if (captured.has(in_type.id)) {
          return in_type;
        }
        if (in_type.id === from_type) {
          return to_type;
        }
        return in_type;
    }
  }

  return {
    kind: "forall",
    generics: in_type.generics,
    scheme: inner(
      new Set(in_type.generics),
      in_type.scheme,
      from_type,
      to_type
    ) as FunctionTy,
  };
}

function instantiate_ty(scheme: Ty): InstTy {
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
  for (const s of scheme.generics) {
    substs[s] = tyvar();
  }

  return substitute_ty(scheme.scheme, substs) as FunctionTy;
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

function unify(lty: InstTy, rty: InstTy, span: Span): Substitution<InstTy>[] {
  if (lty.kind === "var" && !occurs(lty.id, rty)) {
    return [[lty.id, rty]];
  }
  if (rty.kind === "var" && !occurs(rty.id, lty)) {
    return [[rty.id, lty]];
  }
  if (lty.kind === "constant" && rty.kind === "constant") {
    if (lty.name === rty.name) {
      return [];
    }
  }
  if (lty.kind === "unit" && rty.kind === "unit") {
    return [];
  }
  if (lty.kind === "fn" && rty.kind === "fn") {
    if (lty.parameters.length === rty.parameters.length) {
      return [
        ...lty.parameters.flatMap((lt, i) =>
          unify(lt, rty.parameters[i]!, span)
        ),
        ...unify(lty.result, rty.result, span),
      ];
    }
  }
  throw new SpanError(span, `Expected ${lty}, found ${rty}`);
}

function tyvar(): VariableTy {
  const id = tyvarid;
  tyvarid += 1;
  return {
    kind: "var",
    id: Symbol(`${id}`),
  };
}
