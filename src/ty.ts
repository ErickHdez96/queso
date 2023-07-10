let tyvarid = 0;

/**
 * An instantiated type (i.e. no generics).
 */
export type InstTy = UnitTy | ConstantTy | VariableTy | FunctionTy;
export type Ty = InstTy | TyScheme;

export interface UnitTy {
  kind: "unit";
}

export interface ConstantTy {
  kind: "constant";
  name: string;
}

export interface FunctionTy {
  kind: "fn";
  id: symbol;
  instantiations: InstTy[][];
  parameters: InstTy[];
  result: InstTy;
}

export interface VariableTy {
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

export function tyvar(): VariableTy {
  const id = tyvarid;
  tyvarid += 1;
  return {
    kind: "var",
    id: Symbol(`${id}`),
  };
}

function subst_ty(ty: InstTy, substs: [symbol, string][]): InstTy {
  switch (ty.kind) {
    case "unit":
    case "constant":
      return ty;
    case "fn":
      return {
        ...ty,
        parameters: ty.parameters.map((p) => subst_ty(p, substs)),
        result: subst_ty(ty.result, substs),
      };
    case "var":
      return {
        kind: "constant",
        name: substs.find(([s]) => s === ty.id)![1],
      };
  }
}

const generics = "abcdefghijklmnopqrstuvwxyz";
export function ty_str(ty: Ty): string {
  switch (ty.kind) {
    case "unit":
      return "unit";
    case "constant":
      return ty.name;
    case "var":
      return `$${ty.id.description!}`;
    case "fn":
      if (ty.parameters.length === 1) {
        return `${ty_str(ty.parameters[0]!)} -> ${ty_str(ty.result)}`;
      }
      return `(${ty.parameters.map(ty_str).join(", ")}) -> ${ty_str(
        ty.result
      )}`;
    case "forall": {
      if (ty.generics.length === 0) {
        return ty_str(ty.scheme);
      }
      const substs = ty.generics.map(
        (g, i) => [g, generics.charAt(i)] as [symbol, string]
      );
      return `∀ ${substs.map((s) => s[1]).join(" ")}. ${ty_str(
        subst_ty(ty.scheme, substs)
      )}`;
    }
  }
}
