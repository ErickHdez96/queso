import * as hir from "./hir";
import { parse_str } from "./parser";
import { lower_mod } from "./lower_ast";
import { TyScheme, Types } from "./ty";
import { span } from "./common";

const lmod = (s: string) => lower_mod(parse_str(s));

test("lower_mod simple inference", () => {
  {
    const [_tenv, venv, mod] = lmod("(define a 3)");
    expect(venv.get("a")?.ty).toEqual(Types.number);
    expect(mod).toEqual({
      span: span(0, 12),
      items: [
        {
          kind: "define",
          span: span(0, 12),
          name: {
            span: span(8, 9),
            value: "a",
          },
          body: {
            kind: "number",
            span: span(10, 11),
            value: "3",
            ty: Types.number,
          },
        },
      ],
    });
  }
  {
    const [_tenv, venv, mod] = lmod("(define a #t)");
    expect(venv.get("a")?.ty).toEqual(Types.boolean);
    expect(mod).toEqual({
      span: span(0, 13),
      items: [
        {
          kind: "define",
          span: span(0, 13),
          name: {
            span: span(8, 9),
            value: "a",
          },
          body: {
            kind: "boolean",
            span: span(10, 12),
            value: true,
            ty: Types.boolean,
          },
        },
      ],
    });
  }
  {
    const [_tenv, venv, mod] = lmod("(define a 3) (define b a)");
    expect(venv.get("b")?.ty).toEqual(Types.number);
    expect(mod).toEqual({
      span: span(0, 25),
      items: [
        {
          kind: "define",
          span: span(0, 12),
          name: {
            span: span(8, 9),
            value: "a",
          },
          body: {
            kind: "number",
            span: span(10, 11),
            value: "3",
            ty: Types.number,
          },
        },
        {
          kind: "define",
          span: span(13, 25),
          name: {
            span: span(21, 22),
            value: "b",
          },
          body: {
            kind: "id",
            span: span(23, 24),
            value: "a",
            ty: Types.number,
          },
        },
      ],
    });
  }
});

describe("lower_mod lambda inference", () => {
  test("id", () => {
    const [_tenv, venv, mod] = lmod("(define a (λ (x) x))");
    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(1);
    const g = (l.ty as TyScheme).generics[0]!;
    expect(l.ty).toEqual({
      generics: [g],
      kind: "forall",
      scheme: {
        kind: "fn",
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

    expect(mod).toEqual({
      span: span(0, 20),
      items: [
        {
          kind: "define",
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
    const [_tenv, venv, mod] = lmod("(define a (λ (x y) (= (+ x 1) y)))");
    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(0);

    const expected_mod: hir.Mod = {
      span: span(0, 34),
      items: [
        {
          kind: "define",
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
                  parameters: [Types.number, Types.number],
                  result: Types.boolean,
                },
              },
              args: [
                {
                  kind: "application",
                  span: span(22, 29),
                  ty: Types.number,
                  fn: {
                    kind: "id",
                    span: span(23, 24),
                    ty: {
                      kind: "fn",
                      parameters: [Types.number, Types.number],
                      result: Types.number,
                    },
                    value: "+",
                  },
                  args: [
                    {
                      kind: "id",
                      span: span(25, 26),
                      ty: Types.number,
                      value: "x",
                    },
                    {
                      kind: "number",
                      span: span(27, 28),
                      ty: Types.number,
                      value: "1",
                    },
                  ],
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

    expect(mod).toEqual(expected_mod);
  });
});
