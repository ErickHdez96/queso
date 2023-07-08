export interface Span {
  lo: number;
  hi: number;
}

export const span = (lo: number, hi: number): Span => ({ lo, hi });

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const replace_symbol = (o: unknown): any => {
  if (typeof o === "symbol") {
    return o.description;
  }

  if (Array.isArray(o)) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return o.map(replace_symbol);
  }

  if (typeof o !== "object" || o === null) {
    return o;
  }

  for (const [key, value] of Object.entries(o)) {
    if (typeof value === "symbol") {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (o as any)[key] = value.description;
    } else {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
      (o as any)[key] = replace_symbol(value);
    }
  }

  return o;
};
