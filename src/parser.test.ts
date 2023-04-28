import { span } from "./common";
import { parse_str } from "./parser";

test("parse_str simple define", () => {
  expect(parse_str("(define a 3)")).toEqual({
    span: span(0, 12),
    items: [
      {
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
});

test("parse_str lambda", () => {
  expect(parse_str("(define a (λ (x) x))")).toEqual({
    span: span(0, 20),
    items: [
      {
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
          body: [
            {
              kind: "id",
              span: span(17, 18),
              value: "x",
            },
          ],
        },
      },
    ],
  });
});
