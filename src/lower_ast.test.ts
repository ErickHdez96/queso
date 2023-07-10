import * as hir from "./hir";
import { FunctionTy, InstTy, TyScheme, Types } from "./ty";
import { span } from "./common";
import { Compiler, CompilerBuilder } from "./compiler";
import {
  PassInterface,
  pass_append_builtin_tyenv,
  pass_append_builtin_valenv,
  pass_lower_ast,
  pass_parse_package_from_string,
} from "./pass";

let compiler!: Compiler;

function get_fnty(result: PassInterface, name: string): FunctionTy {
  const fnty = (result.valenv?.get(name)?.ty as TyScheme | undefined)?.scheme;
  if (fnty === undefined) {
    throw new Error(`Expected to find fn ty for ${name}`);
  }
  return fnty;
}

function get_id(result: PassInterface, name: string): symbol {
  return get_fnty(result, name).id;
}

function get_insts(result: PassInterface, name: string): InstTy[][] {
  return get_fnty(result, name).instantiations;
}

beforeEach(() => {
  compiler = new CompilerBuilder()
    .pass(pass_parse_package_from_string)
    .pass(pass_append_builtin_tyenv)
    .pass(pass_append_builtin_valenv)
    .pass(pass_lower_ast)
    .build();
});

describe("simple inference", () => {
  test("number", () => {
    const result = compiler.run_on_string("(define a (λ () 3))");
    const a_id = get_id(result, "a");
    expect(result.valenv!.get("a")?.ty).toEqual({
      kind: "forall",
      generics: [],
      scheme: {
        kind: "fn",
        id: a_id,
        instantiations: [],
        parameters: [],
        result: Types.number,
      },
    });
    expect(result.hir).toEqual({
      span: span(0, 19),
      items: [
        {
          kind: "function",
          span: span(0, 19),
          name: {
            span: span(8, 9),
            value: "a",
          },
          body: {
            kind: "function",
            span: span(10, 18),
            body: [],
            parameters: [],
            retexpr: {
              kind: "number",
              span: span(16, 17),
              ty: Types.number,
              value: "3",
            },
            ty: {
              kind: "forall",
              generics: [],
              scheme: {
                kind: "fn",
                id: a_id,
                instantiations: [],
                parameters: [],
                result: Types.number,
              },
            },
          },
        },
      ],
    });
  });

  test("boolean", () => {
    const result = compiler.run_on_string("(define a (λ () #t))");
    const a_id = get_id(result, "a");
    expect(result.valenv!.get("a")?.ty).toEqual({
      kind: "forall",
      generics: [],
      scheme: {
        kind: "fn",
        id: a_id,
        instantiations: [],
        parameters: [],
        result: Types.boolean,
      },
    });
    expect(result.hir).toEqual({
      span: span(0, 20),
      items: [
        {
          kind: "function",
          span: span(0, 20),
          name: {
            span: span(8, 9),
            value: "a",
          },
          body: {
            kind: "function",
            span: span(10, 19),
            body: [],
            parameters: [],
            retexpr: {
              kind: "boolean",
              span: span(16, 18),
              ty: Types.boolean,
              value: true,
            },
            ty: {
              kind: "forall",
              generics: [],
              scheme: {
                kind: "fn",
                id: a_id,
                instantiations: [],
                parameters: [],
                result: Types.boolean,
              },
            },
          },
        },
      ],
    });
  });
});

describe("binary_operator", () => {
  test("+", () => {
    const result = compiler.run_on_string("(define add-ones (λ () (+ 1 1)))");
    const add_ones_id = get_id(result, "add-ones");
    expect(result.hir?.items).toEqual([
      {
        kind: "function",
        name: {
          span: span(8, 16),
          value: "add-ones",
        },
        span: span(0, 32),
        body: {
          kind: "function",
          span: span(17, 31),
          parameters: [],
          body: [],
          retexpr: {
            kind: "binaryop",
            span: span(23, 30),
            op: "+",
            left: {
              kind: "number",
              span: span(26, 27),
              ty: Types.number,
              value: "1",
            },
            right: {
              kind: "number",
              span: span(28, 29),
              ty: Types.number,
              value: "1",
            },
            ty: Types.number,
          },
          ty: {
            kind: "forall",
            generics: [],
            scheme: {
              kind: "fn",
              instantiations: [],
              id: add_ones_id,
              parameters: [],
              result: Types.number,
            },
          },
        },
      },
    ]);
  });
});

describe("lambda inference", () => {
  test("id", () => {
    const result = compiler.run_on_string("(define a (λ (x) x))");
    const venv = result.valenv!;
    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(1);
    const g = (l.ty as TyScheme).generics[0]!;
    const a_id = get_id(result, "a");
    expect(l.ty).toEqual({
      generics: [g],
      kind: "forall",
      scheme: {
        kind: "fn",
        id: a_id,
        instantiations: [],
        parameters: [
          {
            id: g,
            kind: "var",
          },
        ],
        result: {
          id: g,
          kind: "var",
        },
      },
    });

    expect(result.hir).toEqual({
      span: span(0, 20),
      items: [
        {
          kind: "function",
          span: span(0, 20),
          name: {
            span: span(8, 9),
            value: "a",
          },
          body: {
            kind: "function",
            span: span(10, 19),
            ty: {
              kind: "forall",
              generics: [g],
              scheme: {
                kind: "fn",
                id: a_id,
                instantiations: [],
                parameters: [
                  {
                    kind: "var",
                    id: g,
                  },
                ],
                result: {
                  kind: "var",
                  id: g,
                },
              },
            },
            parameters: [
              [
                {
                  span: span(14, 15),
                  value: "x",
                },
                {
                  kind: "var",
                  id: g,
                },
              ],
            ],
            body: [],
            retexpr: {
              kind: "id",
              span: span(17, 18),
              value: "x",
              ty: {
                kind: "var",
                id: g,
              },
            },
          },
        },
      ],
    });
  });

  test("(= (+ x 1) y)", () => {
    const result = compiler.run_on_string("(define a (λ (x y) (= (+ x 1) y)))");
    const venv = result.valenv!;
    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(0);
    const a_id = get_id(result, "a");
    const eq_id = get_id(result, "=");

    const expected_mod: hir.Mod = {
      span: span(0, 34),
      items: [
        {
          kind: "function",
          span: span(0, 34),
          name: {
            span: span(8, 9),
            value: "a",
          },
          body: {
            kind: "function",
            span: span(10, 33),
            ty: {
              kind: "forall",
              generics: [],
              scheme: {
                kind: "fn",
                id: a_id,
                instantiations: [],
                parameters: [Types.number, Types.number],
                result: Types.boolean,
              },
            },
            parameters: [
              [
                {
                  span: span(14, 15),
                  value: "x",
                },
                Types.number,
              ],
              [
                {
                  span: span(16, 17),
                  value: "y",
                },
                Types.number,
              ],
            ],
            body: [],
            retexpr: {
              kind: "application",
              span: span(19, 32),
              ty: Types.boolean,
              fn: {
                kind: "id",
                span: span(20, 21),
                value: "=",
                ty: {
                  kind: "fn",
                  id: eq_id,
                  instantiations: [[Types.number]!],
                  parameters: [Types.number, Types.number],
                  result: Types.boolean,
                },
              },
              args: [
                {
                  kind: "binaryop",
                  span: span(22, 29),
                  op: "+",
                  ty: Types.number,
                  left: {
                    kind: "id",
                    span: span(25, 26),
                    value: "x",
                    ty: Types.number,
                  },
                  right: {
                    kind: "number",
                    span: span(27, 28),
                    value: "1",
                    ty: Types.number,
                  },
                },
                {
                  kind: "id",
                  span: span(30, 31),
                  ty: Types.number,
                  value: "y",
                },
              ],
            },
          },
        },
      ],
    };

    expect(result.hir).toStrictEqual(expected_mod);
  });

  test("(and (iszero (+ (id x) 1)) y)", () => {
    const result = compiler.run_on_string(`
      (define id (λ (x) x))
      (define a (λ (x y)
                  (and (iszero (+ (id x) 1))
                       (id y))))`);
    const venv = result.valenv!;
    const id = venv.get("id")!;
    expect(id).toBeDefined();
    expect(id.ty).toHaveProperty("generics");
    expect((id.ty as TyScheme).generics).toHaveLength(1);
    const g = (id.ty as TyScheme).generics[0]!;

    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(0);
    const id_id = get_id(result, "id");
    const iszero_id = get_id(result, "iszero");
    const and_id = get_id(result, "and");
    const a_id = get_id(result, "a");

    const expected_mod: hir.Mod = {
      span: span(7, 131),
      items: [
        {
          kind: "function",
          name: {
            span: span(15, 17),
            value: "id",
          },
          span: span(7, 28),
          body: {
            kind: "function",
            span: span(18, 27),
            ty: {
              kind: "forall",
              generics: [g],
              scheme: {
                kind: "fn",
                id: id_id,
                instantiations: [[Types.number], [Types.boolean]],
                parameters: [{ kind: "var", id: g }],
                result: { kind: "var", id: g },
              },
            },
            parameters: [
              [
                {
                  span: span(22, 23),
                  value: "x",
                },
                {
                  kind: "var",
                  id: g,
                },
              ],
            ],
            body: [],
            retexpr: {
              kind: "id",
              span: span(25, 26),
              ty: { kind: "var", id: g },
              value: "x",
            },
          },
        },
        {
          kind: "function",
          name: {
            span: span(43, 44),
            value: "a",
          },
          span: span(35, 131),
          body: {
            kind: "function",
            span: span(45, 130),
            body: [],
            ty: {
              kind: "forall",
              generics: [],
              scheme: {
                kind: "fn",
                id: a_id,
                instantiations: [],
                parameters: [Types.number, Types.boolean],
                result: Types.boolean,
              },
            },
            parameters: [
              [{ span: span(49, 50), value: "x" }, Types.number],
              [{ span: span(51, 52), value: "y" }, Types.boolean],
            ],
            retexpr: {
              kind: "application",
              fn: {
                kind: "id",
                span: span(73, 76),
                value: "and",
                ty: {
                  kind: "fn",
                  id: and_id,
                  instantiations: [],
                  parameters: [Types.boolean, Types.boolean],
                  result: Types.boolean,
                },
              },
              span: span(72, 129),
              args: [
                {
                  kind: "application",
                  span: span(77, 98),
                  ty: Types.boolean,
                  fn: {
                    kind: "id",
                    span: span(78, 84),
                    value: "iszero",
                    ty: {
                      kind: "fn",
                      id: iszero_id,
                      instantiations: [],
                      parameters: [Types.number],
                      result: Types.boolean,
                    },
                  },
                  args: [
                    {
                      kind: "binaryop",
                      span: span(85, 97),
                      op: "+",
                      ty: Types.number,
                      left: {
                        kind: "application",
                        span: span(88, 94),
                        ty: Types.number,
                        fn: {
                          kind: "id",
                          span: span(89, 91),
                          ty: {
                            kind: "fn",
                            id: id_id,
                            instantiations: [[Types.number], [Types.boolean]],
                            parameters: [Types.number],
                            result: Types.number,
                          },
                          value: "id",
                        },
                        args: [
                          {
                            kind: "id",
                            span: span(92, 93),
                            ty: Types.number,
                            value: "x",
                          },
                        ],
                      },
                      right: {
                        kind: "number",
                        span: span(95, 96),
                        ty: Types.number,
                        value: "1",
                      },
                    },
                  ],
                },
                {
                  kind: "application",
                  span: span(122, 128),
                  ty: Types.boolean,
                  fn: {
                    kind: "id",
                    span: span(123, 125),
                    ty: {
                      kind: "fn",
                      id: id_id,
                      instantiations: [[Types.number], [Types.boolean]],
                      parameters: [Types.boolean],
                      result: Types.boolean,
                    },
                    value: "id",
                  },
                  args: [
                    {
                      kind: "id",
                      span: span(126, 127),
                      ty: Types.boolean,
                      value: "y",
                    },
                  ],
                },
              ],
              ty: Types.boolean,
            },
          },
        },
      ],
    };

    expect(result.hir).toEqual(expected_mod);
  });

  test("(id x)", () => {
    const result = compiler.run_on_string(`
      (define id (λ (x) x))
      (define a (λ (x) (id x)))`);
    const venv = result.valenv!;
    const id = venv.get("id")!;
    expect(id).toBeDefined();
    expect(id.ty).toHaveProperty("generics");
    expect((id.ty as TyScheme).generics).toHaveLength(1);
    const g = (id.ty as TyScheme).generics[0]!;

    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(1);
    const h = (l.ty as TyScheme).generics[0]!;
    const id_id = get_id(result, "id");
    const a_id = get_id(result, "a");
    const id_insts = get_insts(result, "id");

    const expected_mod: hir.Mod = {
      span: span(7, 60),
      items: [
        {
          kind: "function",
          name: {
            span: span(15, 17),
            value: "id",
          },
          span: span(7, 28),
          body: {
            kind: "function",
            span: span(18, 27),
            ty: {
              kind: "forall",
              generics: [g],
              scheme: {
                kind: "fn",
                id: id_id,
                instantiations: [id_insts[0]!],
                parameters: [{ kind: "var", id: g }],
                result: { kind: "var", id: g },
              },
            },
            parameters: [
              [
                {
                  span: span(22, 23),
                  value: "x",
                },
                {
                  kind: "var",
                  id: g,
                },
              ],
            ],
            body: [],
            retexpr: {
              kind: "id",
              span: span(25, 26),
              ty: { kind: "var", id: g },
              value: "x",
            },
          },
        },
        {
          kind: "function",
          name: {
            span: span(43, 44),
            value: "a",
          },
          span: span(35, 60),
          body: {
            kind: "function",
            span: span(45, 59),
            body: [],
            ty: {
              kind: "forall",
              generics: [h],
              scheme: {
                kind: "fn",
                id: a_id,
                instantiations: [],
                parameters: [{ kind: "var", id: h }],
                result: { kind: "var", id: h },
              },
            },
            parameters: [
              [
                { span: span(49, 50), value: "x" },
                { kind: "var", id: h },
              ],
            ],
            retexpr: {
              kind: "application",
              fn: {
                kind: "id",
                span: span(53, 55),
                value: "id",
                ty: {
                  kind: "fn",
                  id: id_id,
                  instantiations: [id_insts[0]!],
                  parameters: [{ kind: "var", id: h }],
                  result: { kind: "var", id: h },
                },
              },
              span: span(52, 58),
              args: [
                {
                  kind: "id",
                  span: span(56, 57),
                  ty: { kind: "var", id: h },
                  value: "x",
                },
              ],
              ty: { kind: "var", id: h },
            },
          },
        },
      ],
    };

    expect(result.hir).toEqual(expected_mod);
  });
});

describe("binary op shadowing", () => {
  test("+", () => {
    const result = compiler.run_on_string(`
      (define + (λ (x) x))
      (define id (λ (x) (+ x)))
    `);
    expect(result.hir).toMatchObject({
      items: [
        {
          kind: "function",
          name: {
            value: "+",
          },
          body: {
            kind: "function",
            parameters: [[{ value: "x" }, {}]],
          },
        },
        {
          kind: "function",
          name: {
            value: "id",
          },
          body: {
            kind: "function",
            parameters: [[{ value: "x" }, {}]],
            body: [],
            retexpr: {
              kind: "application",
              fn: {
                kind: "id",
                value: "+",
              },
              args: [
                {
                  kind: "id",
                  value: "x",
                },
              ],
            },
          },
        },
      ],
    });
  });
});
