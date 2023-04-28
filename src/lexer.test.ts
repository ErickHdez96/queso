import { tokenize_str } from "./lexer";
import { eoftok, idtok, kwtok, littok, numtok } from "./token";

test("tokenize_str simple tokens", () => {
  expect(tokenize_str("( )")).toEqual([
    littok(0, 1, "("),
    littok(2, 3, ")"),
    eoftok(2, 3),
  ]);
});

test("tokenize_str numbers", () => {
  expect(tokenize_str("1")).toEqual([numtok(0, 1, "1"), eoftok(0, 1)]);
});

test("tokenize_str identifiers", () => {
  expect(tokenize_str("hola")).toEqual([idtok(0, 4, "hola"), eoftok(0, 4)]);
});

test("tokenize_str keywords", () => {
  expect(tokenize_str("define lambda λ")).toEqual([
    kwtok(0, 6, "define"),
    kwtok(7, 13, "lambda"),
    kwtok(14, 15, "λ"),
    eoftok(14, 15),
  ]);
});
