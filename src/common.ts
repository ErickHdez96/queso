export interface Span {
  lo: number;
  hi: number;
}

export const span = (lo: number, hi: number): Span => ({ lo, hi });
