import { SpanError } from "./error";
import { Pass, PassInterface } from "./pass";

export class Compiler {
  private errors: SpanError[] = [];

  constructor(private passess: Pass[]) {}

  run_on_string(string: string): PassInterface {
    return this.run({
      string,
    });
  }

  run_on_path(input_path: string) {
    return this.run({
      path: input_path,
    });
  }

  run(input: Partial<PassInterface>): PassInterface {
    for (const pass of this.passess) {
      input = pass(input);
    }
    return input;
  }
}

export class CompilerBuilder {
  private passess: Pass[] = [];

  build(): Compiler {
    return new Compiler(this.passess);
  }

  pass(p: Pass): this {
    this.passess.push(p);
    return this;
  }
}
