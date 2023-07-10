import { Env } from "./env";
import { Ty, Types, tyvar } from "./ty";

export type TyEnv = Env<Ty>;
export type ValEnv = Env<Value>;

export interface Value {
  ty: Ty;
}

export const builtin_types = build_builtin_types();
export function build_builtin_types(): TyEnv {
  const builtin_types: TyEnv = new Env();
  builtin_types.mapping = {
    number: Types.number,
    boolean: Types.boolean,
  };
  return builtin_types;
}

export const builtin_values = build_builtin_values();
export function build_builtin_values(): ValEnv {
  const builtin_values: ValEnv = new Env();
  const generics = [tyvar(), tyvar(), tyvar()] as const;
  builtin_values.mapping = {
    debug: {
      ty: {
        kind: "forall",
        generics: [generics[0].id],
        scheme: {
          kind: "fn",
          id: Symbol("debug"),
          instantiations: [],
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
          id: Symbol("log"),
          instantiations: [],
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
          id: Symbol("+"),
          instantiations: [],
          parameters: [Types.number, Types.number],
          result: Types.number,
        },
      },
    },
    "=": {
      ty: {
        kind: "forall",
        generics: [generics[2].id],
        scheme: {
          kind: "fn",
          id: Symbol("="),
          instantiations: [],
          parameters: [generics[2], generics[2]],
          result: Types.boolean,
        },
      },
    },
    iszero: {
      ty: {
        kind: "forall",
        generics: [],
        scheme: {
          kind: "fn",
          id: Symbol("iszero"),
          instantiations: [],
          parameters: [Types.number],
          result: Types.boolean,
        },
      },
    },
    and: {
      ty: {
        kind: "forall",
        generics: [],
        scheme: {
          kind: "fn",
          id: Symbol("and"),
          instantiations: [],
          parameters: [Types.boolean, Types.boolean],
          result: Types.boolean,
        },
      },
    },
  };
  return builtin_values;
}
