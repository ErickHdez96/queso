#!/usr/bin/env node

import { replace_symbol } from "./common";
import { CompilerBuilder } from "./compiler";
import {
  pass_append_builtin_tyenv,
  pass_append_builtin_valenv as pass_append_builtin_valenv,
  pass_lower_ast,
  pass_parse_package_from_string,
  pass_read_path,
} from "./pass";

interface Command {
  input_path: string;
}

class CommandBuilder {
  input_path?: string;

  help_and_bail(exit_code = 1): never {
    console.error(`USAGE queso (SUBCOMMAND) [INPUT]`);
    process.exit(exit_code);
  }

  handle_arg(arg: string): this {
    this.input_path = arg;
    return this;
  }

  build(): Command {
    if (this.input_path === undefined) this.help_and_bail();

    return {
      input_path: this.input_path,
    };
  }
}

function parse_args(): Command {
  const args = process.argv.splice(2);

  let builder = new CommandBuilder();
  for (const arg of args) {
    builder = builder.handle_arg(arg);
  }

  return builder.build();
}

function main() {
  const cmd = parse_args();
  const compiler = new CompilerBuilder()
    .pass(pass_read_path)
    .pass(pass_parse_package_from_string)
    .pass(pass_append_builtin_tyenv)
    .pass(pass_append_builtin_valenv)
    .pass(pass_lower_ast)
    .build();

  const result = compiler.run_on_path(cmd.input_path);
  console.log(JSON.stringify(replace_symbol(result), null, "  "));
}

main();
