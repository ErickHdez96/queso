import { span } from "./common";
import { parse_str } from "./parser";

test("parse_str simple expressions", () => {
  expect(parse_str("(define a 3)")).toEqual({
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
        },
      },
    ],
  });

  expect(parse_str("(define a ())")).toEqual({
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
          kind: "unit",
          span: span(10, 12),
        },
      },
    ],
  });

  expect(parse_str("(define a #t)")).toEqual({
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
        },
      },
    ],
  });

  expect(parse_str("(define a #f)")).toEqual({
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
          value: false,
        },
      },
    ],
  });
});

test("parse_str lambda", () => {
  expect(parse_str("(define a (λ (x) x))")).toEqual({
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
          kind: "lambda",
          span: span(10, 19),
          parameters: [
            {
              span: span(14, 15),
              value: "x",
            },
          ],
          body: [],
          retexpr: {
            kind: "id",
            span: span(17, 18),
            value: "x",
          },
        },
      },
    ],
  });
});

test("parse_str application", () => {
  expect(parse_str("(define a (id 1))")).toEqual({
    span: span(0, 17),
    items: [
      {
        kind: "define",
        span: span(0, 17),
        name: {
          span: span(8, 9),
          value: "a",
        },
        body: {
          kind: "application",
          span: span(10, 16),
          fn: {
            kind: "id",
            span: span(11, 13),
            value: "id",
          },
          arguments: [
            {
              kind: "number",
              span: span(14, 15),
              value: "1",
            },
          ],
        },
      },
    ],
  });

  expect(parse_str("(define two (+ 1 1))")).toEqual({
    span: span(0, 20),
    items: [
      {
        kind: "define",
        span: span(0, 20),
        name: {
          span: span(8, 11),
          value: "two",
        },
        body: {
          kind: "application",
          span: span(12, 19),
          fn: {
            kind: "id",
            span: span(13, 14),
            value: "+",
          },
          arguments: [
            {
              kind: "number",
              span: span(15, 16),
              value: "1",
            },
            {
              kind: "number",
              span: span(17, 18),
              value: "1",
            },
          ],
        },
      },
    ],
  });
});
