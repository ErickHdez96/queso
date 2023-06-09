import { span } from "./common";
import { Token, is_keyword } from "./token";

interface Lexer {
  input: string;
  offset: number;
}

export function tokenize_str(input: string): Token[] {
  const l: Lexer = {
    input,
    offset: 0,
  };

  const tokens: Token[] = [];

  while (!at_eof(l)) {
    skip_trivia(l);

    const lo = l.offset;
    const c = next(l);
    let tok: Token;
    switch (c) {
      case "(":
      case ")": {
        tok = { span: span(lo, l.offset), kind: "literal", value: c };
        break;
      }
      case "#": {
        const t = peek(l);
        if (t === "t" && is_delimiter(peekn(l, 1))) {
          next(l);
          tok = { span: span(lo, l.offset), kind: "literal", value: "#t" };
          break;
        } else if (t === "f" && is_delimiter(peekn(l, 1))) {
          next(l);
          tok = { span: span(lo, l.offset), kind: "literal", value: "#f" };
          break;
        } else {
          tok = { span: span(lo, l.offset), kind: "unknown", value: c };
          break;
        }
      }
      default: {
        if (is_number(c)) {
          const value = eat_number(l, lo);
          tok = { span: span(lo, l.offset), kind: "number", value };
        } else if (is_ident(c)) {
          const value = eat_ident(l, lo);
          if (is_keyword(value)) {
            tok = { span: span(lo, l.offset), kind: "keyword", value };
          } else {
            tok = { span: span(lo, l.offset), kind: "id", value };
          }
        } else if (c === "\0" && at_eof(l)) {
          continue;
        } else {
          tok = { span: span(lo, l.offset), kind: "unknown", value: c };
        }
        break;
      }
    }

    tokens.push(tok);
  }

  const last_span = tokens[tokens.length - 1]?.span;
  tokens.push({
    span: span(last_span?.lo ?? 0, last_span?.hi ?? 1),
    kind: "eof",
  });

  return tokens;
}

const at_eof = (l: Lexer) => l.offset >= l.input.length;
const peek = (l: Lexer) => l.input.charAt(l.offset) || "\0";
const peekn = (l: Lexer, n: number) => l.input.charAt(l.offset + n) || "\0";
const next = (l: Lexer) => {
  if (at_eof(l)) return "\0";
  l.offset += 1;
  return l.input.charAt(l.offset - 1);
};
const skip_trivia = (l: Lexer) => {
  while (!at_eof(l)) {
    if (is_trivia(peek(l))) {
      next(l);
      continue;
    }
    return;
  }
};

const is_trivia = (c: string) => {
  switch (c) {
    case " ":
    case "\t":
    case "\n":
    case "\r":
    case "\0":
      return true;
  }
  return false;
};

const is_delimiter = (c: string) => {
  return !is_ident(c);
};

const is_number = (c: string) => {
  return c >= "0" && c <= "9";
};

const eat_number = (l: Lexer, start: number) => {
  while (is_number(peek(l))) {
    next(l);
  }
  return l.input.substring(start, l.offset);
};

const is_ident = (c: string) => {
  return (
    c === "!" ||
    (c >= "#" && c <= "&") || // # $ % &
    c === "*" ||
    c === "+" ||
    (c >= "-" && c <= "/") || // - . /
    (c >= "0" && c <= "9") ||
    (c >= ":" && c <= "@") || // : ; < = > ? @
    (c >= "A" && c <= "Z") ||
    c === "\\" ||
    c === "^" ||
    c === "_" ||
    (c >= "a" && c <= "z") ||
    c === "|" ||
    c === "~" ||
    c === "λ"
  );
};

const eat_ident = (l: Lexer, start: number) => {
  while (is_ident(peek(l))) {
    next(l);
  }
  return l.input.substring(start, l.offset);
};
