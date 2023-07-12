import * as hir from "./hir";
import * as cps from "./cps";
import { Span, span } from "./common";

export function lower_hir(hir: hir.Mod): cps.CExpr {
  return lower_items(hir.items);
}

function lower_items(items: hir.Item[]): cps.CExpr {
  const item = items[0];

  if (item === undefined) {
    return {
      kind: "app",
      span: span(0, 0),
      fn: {
        kind: "label",
        span: span(0, 0),
        value: "main",
      },
      args: [],
    };
  }

  switch (item.kind) {
    case "function":
      return lower_expr(
        item.body,
        (_) => lower_items(items.splice(1)),
        item.span,
        item.name.value
      );
  }
}

type Cont = (_: cps.Value) => cps.CExpr;
type ContList = (_: cps.Value[]) => cps.CExpr;

function lower_expr(
  expr: hir.Expr,
  c: Cont,
  span?: Span,
  name?: string
): cps.CExpr {
  switch (expr.kind) {
    case "number":
      return c({
        kind: "number",
        span: expr.span,
        value: expr.value,
      });
    case "boolean":
      return c({
        kind: "boolean",
        span: expr.span,
        value: expr.value,
      });
    case "unit":
      return c({
        kind: "unit",
        span: expr.span,
      });
    case "id":
      return c({
        kind: "var",
        span: expr.span,
        value: expr.value,
      });
    case "binaryop": {
      const result_name = var_name();
      return lower_expr(expr.left, (l) =>
        lower_expr(expr.right, (r) => ({
          kind: "primop",
          span: expr.span,
          primop: expr.op,
          args: [l, r],
          results: [result_name],
          branches: [
            c({
              kind: "var",
              span: expr.span,
              value: result_name,
            }),
          ],
        }))
      );
    }
    case "function": {
      const fn = name ?? fn_name();
      const k = cont_name();
      return {
        kind: "fix",
        span: span ?? expr.span,
        fns: [
          [
            fn,
            [...expr.parameters.map((p) => p[0].value), k],
            lower_expr(expr.retexpr, (v) => ({
              kind: "app",
              span: expr.span,
              fn: {
                kind: "var",
                span: expr.span,
                value: k,
              },
              args: [v],
            })),
          ],
        ],
        cexpr: c({
          kind: "label",
          span: expr.span,
          value: fn,
        }),
      };
    }
    case "application": {
      const return_address = cont_name();
      const ret_var = var_name();

      if (expr.args.length === 0) {
        return {
          kind: "fix",
          span: expr.span,
          fns: [
            [
              return_address,
              [ret_var],
              c({
                kind: "var",
                span: expr.span,
                value: ret_var,
              }),
            ],
          ],
          cexpr: lower_expr(expr.fn, (f) => ({
            kind: "app",
            span: expr.fn.span,
            fn: f,
            args: [
              {
                kind: "label",
                span: expr.span,
                value: return_address,
              },
            ],
          })),
        };
      }

      return {
        kind: "fix",
        span: expr.span,
        fns: [
          [
            return_address,
            [ret_var],
            c({
              kind: "var",
              span: expr.span,
              value: ret_var,
            }),
          ],
        ],
        cexpr: lower_expr(expr.fn, (f) =>
          lower_expression_list(expr.args, (vals) => ({
            kind: "app",
            span: expr.fn.span,
            fn: f,
            args: [
              ...vals,
              {
                kind: "label",
                span: expr.span,
                value: return_address,
              },
            ],
          }))
        ),
      };
    }
  }
}

function lower_expression_list(exprs: hir.Expr[], c: ContList): cps.CExpr {
  function g(exprs: hir.Expr[], acc: cps.Value[]): cps.CExpr {
    const e = exprs[0];
    if (e === undefined) return c(acc);
    return lower_expr(e, (v) => g(exprs.splice(1), [...acc, v]));
  }
  return g(exprs, []);
}

let fn_name_id = 0;
export function fn_name(): string {
  const id = fn_name_id;
  fn_name_id += 1;
  return `@@f-${id}`;
}

let cont_name_id = 0;
export function cont_name(): string {
  const id = cont_name_id;
  cont_name_id += 1;
  return `@@k-${id}`;
}

let var_name_id = 0;
export function var_name(): string {
  const id = var_name_id;
  var_name_id += 1;
  return `@@x-${id}`;
}
