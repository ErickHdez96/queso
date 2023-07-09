export class Env<T> {
  mapping: Record<string, T> = {};
  parent: Env<T> | undefined = undefined;

  new_child(): Env<T> {
    const e = new Env<T>();
    e.parent = this;
    return e;
  }

  insert(key: string, val: T) {
    this.mapping[key] = val;
  }

  get(key: string): T | undefined {
    if (key in this.mapping) {
      return this.mapping[key];
    }
    return this.parent?.get(key);
  }

  clone_self(): Env<T> {
    const new_env = new Env<T>();
    new_env.parent = this.parent;
    new_env.mapping = clone_value(this.mapping);
    return new_env;
  }
}

function clone_value<T>(o: T): T {
  switch (typeof o) {
    case "object": {
      if (o === null) {
        return o;
      }
      if (Array.isArray(o)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return o.map((e) => clone_value(e)) as T;
      }
      const new_o = {} as T;
      for (const [key, value] of Object.entries(o)) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
        (new_o as any)[key] = clone_value(value);
      }
      return new_o;
    }
    default:
      return o;
  }
}
