import { Span, span } from "./common";

interface BaseToken {
  span: Span;
}

export interface LitToken extends BaseToken {
  kind: "literal";
  value: string;
}

export const littok = (lo: number, hi: number, value: string): LitToken => ({
  span: span(lo, hi),
  kind: "literal",
  value,
});

export const Keyword = {
  define: "define",
  lambda: "lambda",
  λ: "λ",
} as const;
export type Keyword = (typeof Keyword)[keyof typeof Keyword];

export interface KeywordToken extends BaseToken {
  kind: "keyword";
  value: string;
}

export const is_keyword = (value: string): value is Keyword => value in Keyword;

export const kwtok = (
  lo: number,
  hi: number,
  value: Keyword
): KeywordToken => ({
  span: span(lo, hi),
  kind: "keyword",
  value,
});

export interface IdToken extends BaseToken {
  kind: "id";
  value: string;
}

export const idtok = (lo: number, hi: number, value: string): IdToken => ({
  span: span(lo, hi),
  kind: "id",
  value,
});

export interface NumberToken extends BaseToken {
  kind: "number";
  value: string;
}

export const numtok = (lo: number, hi: number, value: string): NumberToken => ({
  span: span(lo, hi),
  kind: "number",
  value,
});

export interface UnknownToken extends BaseToken {
  kind: "unknown";
  value: string;
}

export interface EofToken extends BaseToken {
  kind: "eof";
}

export const eoftok = (lo: number, hi: number): EofToken => ({
  span: span(lo, hi),
  kind: "eof",
});

export type Token =
  | LitToken
  | KeywordToken
  | IdToken
  | UnknownToken
  | EofToken
  | NumberToken;

export const token_kind_string = (t: Token): string => {
  switch (t.kind) {
    case "literal":
    case "keyword":
    case "unknown":
      return t.value;
    case "number":
      return "number";
    case "id":
      return "identifier";
    case "eof":
      return "<eof>";
  }
};

export type TokenKind = Token["kind"];
