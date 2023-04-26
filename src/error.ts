import { Span } from "./common";

export class SpanError extends Error {
  constructor(public span: Span, public message: string) {
    super(message);
  }
}

export class Todo extends Error {
  constructor() {
    super("TODO");
  }
}
