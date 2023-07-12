import * as cps from "./cps";
import { Compiler, CompilerBuilder } from "./compiler";
import {
  pass_append_builtin_tyenv,
  pass_append_builtin_valenv,
  pass_lower_ast,
  pass_lower_hir,
  pass_parse_package_from_string,
} from "./pass";
import { span } from "./common";

let compiler!: Compiler;

beforeEach(() => {
  compiler = new CompilerBuilder()
    .pass(pass_parse_package_from_string)
    .pass(pass_append_builtin_tyenv)
    .pass(pass_append_builtin_valenv)
    .pass(pass_lower_ast)
    .pass(pass_lower_hir)
    .build();
});

describe("simple functions", () => {
  test("number", () => {
    const result = compiler.run_on_string("(define constant (λ () 3))");
    expect(result.cps).toEqual(
      cps.fix(
        [
          [
            "constant",
            ["@@k-0"],
            cps.app(
              cps.vvar("@@k-0", span(17, 25)),
              [cps.number(3, span(23, 24))],
              span(17, 25)
            ),
          ],
        ],
        cps.app(cps.label("main", span(0, 0)), [], span(0, 0)),
        span(0, 26)
      )
    );
  });

  test("boolean", () => {
    const result = compiler.run_on_string("(define constant (λ () #t))");
    expect(result.cps).toEqual(
      cps.fix(
        [
          [
            "constant",
            ["@@k-1"],
            cps.app(
              cps.vvar("@@k-1", span(17, 26)),
              [cps.boolean(true, span(23, 25))],
              span(17, 26)
            ),
          ],
        ],
        cps.app(cps.label("main", span(0, 0)), [], span(0, 0)),
        span(0, 27)
      )
    );
  });

  test("id", () => {
    const result = compiler.run_on_string("(define id (λ (x) x))");
    expect(result.cps).toEqual(
      cps.fix(
        [
          [
            "id",
            ["x", "@@k-2"],
            cps.app(
              cps.vvar("@@k-2", span(11, 20)),
              [cps.vvar("x", span(18, 19))],
              span(11, 20)
            ),
          ],
        ],
        cps.app(cps.label("main", span(0, 0)), [], span(0, 0)),
        span(0, 21)
      )
    );
  });

  test("addition", () => {
    const result = compiler.run_on_string("(define add (λ (x y) (+ x y)))");
    expect(result.cps).toEqual(
      cps.fix(
        [
          [
            "add",
            ["x", "y", "@@k-3"],
            cps.primop(
              cps.PrimOp["+"],
              [cps.vvar("x", span(24, 25)), cps.vvar("y", span(26, 27))],
              ["@@x-0"],
              [
                cps.app(
                  cps.vvar("@@k-3", span(12, 29)),
                  [cps.vvar("@@x-0", span(21, 28))],
                  span(12, 29)
                ),
              ],
              span(21, 28)
            ),
          ],
        ],
        cps.app(cps.label("main", span(0, 0)), [], span(0, 0)),
        span(0, 30)
      )
    );
  });

  test("double call", () => {
    const result = compiler.run_on_string(
      "(define double-call (λ (x) (debug (debug x))))"
    );
    expect(result.cps).toEqual(
      cps.fix(
        [
          [
            "double-call",
            ["x", "@@k-4"],
            cps.fix(
              [
                [
                  "@@k-5",
                  ["@@x-1"],
                  cps.app(
                    cps.vvar("@@k-4", span(20, 45)),
                    [cps.vvar("@@x-1", span(27, 44))],
                    span(20, 45)
                  ),
                ],
              ],
              cps.fix(
                [
                  [
                    "@@k-6",
                    ["@@x-2"],
                    cps.app(
                      cps.vvar("debug", span(28, 33)),
                      [
                        cps.vvar("@@x-2", span(34, 43)),
                        cps.label("@@k-5", span(27, 44)),
                      ],
                      span(28, 33)
                    ),
                  ],
                ],
                cps.app(
                  cps.vvar("debug", span(35, 40)),
                  [
                    cps.vvar("x", span(41, 42)),
                    cps.label("@@k-6", span(34, 43)),
                  ],
                  span(35, 40)
                ),
                span(34, 43)
              ),
              span(27, 44)
            ),
          ],
        ],
        cps.app(cps.label("main", span(0, 0)), [], span(0, 0)),
        span(0, 46)
      )
    );
  });
});
