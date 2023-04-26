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
          span: span(10, 11),
          value: "3",
        },
      },
    ],
  });
});
