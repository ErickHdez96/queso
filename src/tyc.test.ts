import { parse_str } from "./parser";
import { TyScheme, Types, lower_mod } from "./tyc";

const lmod = (s: string) => lower_mod(parse_str(s));

test("lower_mod simple inference", () => {
  {
    const [_tenv, venv] = lmod("(define a 3)");
    expect(venv.get("a")?.ty).toEqual(Types.number);
  }
  {
    const [_tenv, venv] = lmod("(define a #t)");
    expect(venv.get("a")?.ty).toEqual(Types.boolean);
  }
  {
    const [_tenv, venv] = lmod("(define a 3) (define b a)");
    expect(venv.get("b")?.ty).toEqual(Types.number);
  }
});

describe("lower_mod lambda inference", () => {
  test("id", () => {
    const [_tenv, venv] = lmod("(define a (λ (x) x))");
    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(1);
    const g = (l.ty as TyScheme).generics[0];
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
  });

  test("(= (+ x y) y)", () => {
    const [_tenv, venv] = lmod("(define a (λ (x y) (= (+ x 1) y)))");
    const l = venv.get("a")!;
    expect(l).toBeDefined();
    expect(l.ty).toHaveProperty("generics");
    expect((l.ty as TyScheme).generics).toHaveLength(1);
    const g = (l.ty as TyScheme).generics[0];
    expect(l.ty).toEqual({
      generics: [g],
      kind: "forall",
      scheme: {
        kind: "fn",
        parameters: [Types.number, { kind: "var", id: g }],
        result: Types.boolean,
      },
    });
  });
});
