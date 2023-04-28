import { Expr, Ident, Item, Mod } from "./ast";
import { span } from "./common";
import { SpanError, Todo } from "./error";
import { tokenize_str } from "./lexer";
import { Keyword, Token, token_kind_string } from "./token";

interface Parser {
  tokens: Token[];
  offset: number;
}

export function parse_str(input: string): Mod {
  const p: Parser = {
    tokens: tokenize_str(input),
    offset: 0,
  };
  const items: Item[] = [];

  while (!at_eof(p)) {
    const item = parse_item(p);
    items.push(item);
  }

  const lo = items[0]?.span?.lo ?? 0;
  const hi = items[items.length - 1]?.span?.hi ?? 1;
  return {
    span: span(lo, hi),
    items,
  };
}

function parse_item(p: Parser): Item {
  const start = expect_lit(p, "(").span;
  if (maybe_expect_keyword(p, Keyword.define)) {
    const name = expect_id(p);
    const body = parse_expr(p);
    const end = expect_lit(p, ")").span;
    return {
      span: span(start.lo, end.hi),
      name,
      body,
    };
  }
  const t = peek(p);
  throw new SpanError(
    t.span,
    `Expected 'define', found ${token_kind_string(t)}`
  );
}

function parse_expr(p: Parser): Expr {
  let t = peek(p);
  if (t.kind === "number") {
    next(p);
    return {
      kind: "number",
      span: t.span,
      value: t.value,
    };
  }
  if (t.kind === "id") {
    next(p);
    return {
      kind: "id",
      span: t.span,
      value: t.value,
    };
  }
  if (t.kind === "literal" && t.value === "(") {
    const start = next(p).span;
    t = peek(p);
    if (
      t.kind === "keyword" &&
      (t.value === Keyword.lambda || t.value === Keyword.λ)
    ) {
      next(p);
      expect_lit(p, "(");
      const params: Ident[] = [];
      for (;;) {
        t = peek(p);
        if (at_eof(p) || (t.kind === "literal" && t.value === ")")) {
          break;
        }
        const ident = expect_id(p);
        params.push(ident);
      }
      expect_lit(p, ")");
      const body: Expr[] = [];
      for (;;) {
        t = peek(p);
        if (at_eof(p) || (t.kind === "literal" && t.value === ")")) {
          break;
        }
        const expr = parse_expr(p);
        body.push(expr);
      }
      const end = expect_lit(p, ")").span;
      return {
        kind: "lambda",
        span: span(start.lo, end.hi),
        parameters: params,
        body,
      };
    }
    if (can_start_expression(t)) {
      const fn = parse_expr(p);
      const args: Expr[] = [];
      for (;;) {
        t = peek(p);
        if (at_eof(p) || (t.kind === "literal" && t.value === ")")) {
          break;
        }
        const arg = parse_expr(p);
        args.push(arg);
      }
      const end = expect_lit(p, ")").span;
      return {
        kind: "application",
        span: span(start.lo, end.hi),
        fn,
        arguments: args,
      };
    }
  }
  throw new Todo();
}

function expect_lit(p: Parser, value: string): Token {
  const t = next(p);
  if (t.kind !== "literal" || t.value !== value) {
    throw new SpanError(
      t.span,
      `Expected ${value}, found ${token_kind_string(t)}`
    );
  }
  return t;
}

function expect_id(p: Parser): Ident {
  const t = next(p);
  if (t.kind !== "id") {
    throw new SpanError(
      t.span,
      `Expected identifier, found ${token_kind_string(t)}`
    );
  }
  return {
    span: t.span,
    value: t.value,
  };
}

function maybe_expect_keyword(p: Parser, kw: Keyword): Token | undefined {
  const t = peek(p);
  if (t.kind === "keyword" && t.value === kw) {
    return next(p);
  }
  return undefined;
}

const at_eof = (p: Parser) => peek(p).kind === "eof";
// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
const peek = (p: Parser) => p.tokens[p.offset]!;
const next = (p: Parser) => {
  const t = peek(p);
  if (!at_eof(p)) p.offset += 1;
  return t;
};

const can_start_expression = (t: Token): boolean => {
  switch (t.kind) {
    case "literal":
      return t.value === "(";
    case "number":
    case "id":
      return true;
    default:
      return false;
  }
};
