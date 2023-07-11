import { Compiler, CompilerBuilder } from "./compiler";
import { opt_pass_arithmetic_constant_folding } from "./optimization";
import {
  pass_append_builtin_tyenv,
  pass_append_builtin_valenv,
  pass_lower_ast,
  pass_lower_hir,
  pass_optimizations_fn,
  pass_parse_package_from_string,
} from "./pass";

let compiler: Compiler;

beforeEach(() => {
  compiler = new CompilerBuilder()
    .pass(pass_parse_package_from_string)
    .pass(pass_append_builtin_tyenv)
    .pass(pass_append_builtin_valenv)
    .pass(pass_lower_ast)
    .pass(pass_lower_hir)
    .pass(pass_optimizations_fn(opt_pass_arithmetic_constant_folding))
    .build();
});

describe("arithmetic_constant_folding", () => {
  test("simple addition", () => {
    const result = compiler.run_on_string("(define two (λ () (+ 1 1)))");
    expect(result.cps).toMatchObject({
      kind: "fix",
      fns: [
        [
          "two",
          ["@@k-0"],
          {
            kind: "app",
            args: [
              {
                kind: "number",
                value: 2,
              },
            ],
          },
        ],
      ],
    });
  });

  test("nested addition", () => {
    const result = compiler.run_on_string(
      "(define ten (λ () (+ (+ 1 2) (+ 3 4))))"
    );
    expect(result.cps).toMatchObject({
      kind: "fix",
      fns: [
        [
          "ten",
          ["@@k-1"],
          {
            kind: "app",
            args: [
              {
                kind: "number",
                value: 10,
              },
            ],
          },
        ],
      ],
    });
  });
});
