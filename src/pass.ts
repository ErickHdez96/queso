import * as ast from "./ast";
import * as hir from "./hir";
import * as cps from "./cps";
import { lower_mod } from "./lower_ast";
import { parse_str } from "./parser";
import fs from "fs";
import { lower_hir } from "./lower_hir";
import { TyEnv, ValEnv, builtin_types, builtin_values } from "./builtins";

export interface PassInterfaceRequired {
  path: string;
  string: string;
  ast: ast.Mod;
  tyenv: TyEnv;
  valenv: ValEnv;
  hir: hir.Mod;
  cps: cps.CExpr;
}

export type PassInterface = Partial<PassInterfaceRequired>;

export type Pass = (c: PassInterface) => PassInterface;

export const pass_read_path: Pass = (input) => ({
  string: fs.readFileSync(get_pass_input(input, "path"), {
    encoding: "utf8",
  }),
});

export const pass_parse_package_from_string: Pass = (input) => ({
  ast: parse_str(get_pass_input(input, "string")),
});

export const pass_append_builtin_tyenv: Pass = (input) => ({
  ...input,
  tyenv: builtin_types.new_child(),
});

export const pass_append_builtin_valenv: Pass = (input) => ({
  ...input,
  valenv: builtin_values.new_child(),
});

export const pass_lower_ast: Pass = (input) => {
  const [tyenv, valenv, mod] = lower_mod(
    get_pass_input(input, "ast"),
    get_pass_input(input, "tyenv"),
    get_pass_input(input, "valenv")
  );
  return {
    tyenv,
    valenv,
    hir: mod,
  };
};

export const pass_lower_hir: Pass = (input) => ({
  cps: lower_hir(get_pass_input(input, "hir")),
});

function get_pass_input<T extends keyof PassInterfaceRequired>(
  input: PassInterface,
  key: T
): PassInterfaceRequired[T] {
  const value = input[key];
  if (value === undefined) {
    throw new Error(
      `Invalid input to pass, expected ${key}, got [${Object.keys(input).join(
        ", "
      )}]: ${JSON.stringify(input, null, "  ")}`
    );
  }
  return value;
}
