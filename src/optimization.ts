import { span } from "./common";
import * as cps from "./cps";

export type OptimizationFn = (_: cps.CExpr) => cps.CExpr;

export function opt_pass_arithmetic_constant_folding(
  cps: cps.CExpr
): cps.CExpr {
  switch (cps.kind) {
    case "fix": {
      return {
        kind: "fix",
        span: cps.span,
        fns: cps.fns.map((e) => [
          e[0],
          e[1],
          opt_pass_arithmetic_constant_folding(e[2]),
        ]),
        cexpr: opt_pass_arithmetic_constant_folding(cps.cexpr),
      };
    }
    case "primop": {
      const left = cps.args[0];
      const right = cps.args[1];

      switch (cps.primop) {
        case "+": {
          if (left?.kind === "number" && right?.kind === "number") {
            const result = cps.results[0]!;
            const branch = cps.branches[0]!;
            return opt_pass_arithmetic_constant_folding(
              replace_variable_with_value_in_cexpr(branch, result, {
                kind: "number",
                span: span(left.span.lo, right.span.hi),
                value: left.value + right.value,
              })
            );
          }
        }
      }

      return {
        kind: "primop",
        primop: cps.primop,
        span: cps.span,
        args: cps.args,
        results: cps.results,
        branches: cps.branches.map(opt_pass_arithmetic_constant_folding),
      };
    }
    default:
      return cps;
  }
}

function replace_variable_with_value_in_cexpr(
  expr: cps.CExpr,
  from: string,
  to: cps.Value
): cps.CExpr {
  function replace(value: cps.Value) {
    switch (value.kind) {
      case "var": {
        if (value.value === from) {
          return to;
        }
      }
    }
    return value;
  }

  switch (expr.kind) {
    case "fix":
      return {
        kind: "fix",
        span: expr.span,
        fns: expr.fns.map(([name, params, body]) => [
          name,
          params,
          replace_variable_with_value_in_cexpr(body, from, to),
        ]),
        cexpr: replace_variable_with_value_in_cexpr(expr.cexpr, from, to),
      };
    case "app": {
      return {
        kind: "app",
        span: expr.span,
        fn: replace(expr.fn),
        args: expr.args.map(replace),
      };
    }
    case "primop": {
      return {
        kind: "primop",
        span: expr.span,
        primop: expr.primop,
        args: expr.args.map(replace),
        results: expr.results,
        branches: expr.branches.map((b) =>
          replace_variable_with_value_in_cexpr(b, from, to)
        ),
      };
    }
  }
}
