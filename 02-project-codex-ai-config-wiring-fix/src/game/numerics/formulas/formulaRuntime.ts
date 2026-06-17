export type FormulaVariables = Record<string, number>;

type Token =
  | { type: 'number'; value: number }
  | { type: 'identifier'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'paren'; value: '(' | ')' }
  | { type: 'comma'; value: ',' }
  | { type: 'question'; value: '?' }
  | { type: 'colon'; value: ':' };

const functionMap: Record<string, (...values: number[]) => number> = {
  abs: Math.abs,
  ceil: Math.ceil,
  clamp: (value: number, min: number, max: number) => Math.max(min, Math.min(max, value)),
  floor: Math.floor,
  max: Math.max,
  min: Math.min,
  round: Math.round,
};

const tokenizeFormula = (formula: string): Token[] => {
  const tokens: Token[] = [];
  let index = 0;

  while (index < formula.length) {
    const char = formula[index];
    const next = formula[index + 1];

    if (/\s/.test(char)) {
      index += 1;
      continue;
    }

    if (/[0-9.]/.test(char)) {
      let raw = char;
      index += 1;
      while (index < formula.length && /[0-9.]/.test(formula[index])) {
        raw += formula[index];
        index += 1;
      }
      const value = Number(raw);
      if (!Number.isFinite(value)) {
        throw new Error(`Invalid formula number "${raw}" in "${formula}".`);
      }
      tokens.push({ type: 'number', value });
      continue;
    }

    if (/[A-Za-z_]/.test(char)) {
      let raw = char;
      index += 1;
      while (index < formula.length && /[A-Za-z0-9_]/.test(formula[index])) {
        raw += formula[index];
        index += 1;
      }
      tokens.push({ type: 'identifier', value: raw });
      continue;
    }

    if (char === '(' || char === ')') {
      tokens.push({ type: 'paren', value: char });
      index += 1;
      continue;
    }

    if (char === ',') {
      tokens.push({ type: 'comma', value: char });
      index += 1;
      continue;
    }

    if (char === '?') {
      tokens.push({ type: 'question', value: char });
      index += 1;
      continue;
    }

    if (char === ':') {
      tokens.push({ type: 'colon', value: char });
      index += 1;
      continue;
    }

    const twoChar = `${char}${next}`;
    if (['>=', '<=', '==', '!='].includes(twoChar)) {
      tokens.push({ type: 'operator', value: twoChar });
      index += 2;
      continue;
    }

    if (['+', '-', '*', '/', '%', '>', '<'].includes(char)) {
      tokens.push({ type: 'operator', value: char });
      index += 1;
      continue;
    }

    throw new Error(`Unsupported formula character "${char}" in "${formula}".`);
  }

  return tokens;
};

class FormulaParser {
  private cursor = 0;

  constructor(
    private readonly tokens: Token[],
    private readonly variables: FormulaVariables,
    private readonly source: string,
  ) {}

  parse(): number {
    const value = this.parseConditional();
    if (this.peek()) {
      throw new Error(`Unexpected token in formula "${this.source}".`);
    }
    return value;
  }

  private parseConditional(): number {
    const condition = this.parseComparison();
    if (!this.match('question')) {
      return condition;
    }

    const whenTrue = this.parseConditional();
    this.expect('colon');
    const whenFalse = this.parseConditional();
    return condition !== 0 ? whenTrue : whenFalse;
  }

  private parseComparison(): number {
    let value = this.parseAdditive();
    while (
      this.peek()?.type === 'operator' &&
      ['>', '>=', '<', '<=', '==', '!='].includes((this.peek()?.value as string | undefined) ?? '')
    ) {
      const operator = this.next().value;
      const right = this.parseAdditive();
      switch (operator) {
        case '>':
          value = value > right ? 1 : 0;
          break;
        case '>=':
          value = value >= right ? 1 : 0;
          break;
        case '<':
          value = value < right ? 1 : 0;
          break;
        case '<=':
          value = value <= right ? 1 : 0;
          break;
        case '==':
          value = value === right ? 1 : 0;
          break;
        case '!=':
          value = value !== right ? 1 : 0;
          break;
      }
    }
    return value;
  }

  private parseAdditive(): number {
    let value = this.parseMultiplicative();
    while (this.peek()?.type === 'operator' && ['+', '-'].includes((this.peek()?.value as string | undefined) ?? '')) {
      const operator = this.next().value;
      const right = this.parseMultiplicative();
      value = operator === '+' ? value + right : value - right;
    }
    return value;
  }

  private parseMultiplicative(): number {
    let value = this.parseUnary();
    while (this.peek()?.type === 'operator' && ['*', '/', '%'].includes((this.peek()?.value as string | undefined) ?? '')) {
      const operator = this.next().value;
      const right = this.parseUnary();
      if ((operator === '/' || operator === '%') && right === 0) {
        throw new Error(`Formula "${this.source}" attempted division by zero.`);
      }
      if (operator === '*') {
        value *= right;
      } else if (operator === '/') {
        value /= right;
      } else {
        value %= right;
      }
    }
    return value;
  }

  private parseUnary(): number {
    if (this.peek()?.type === 'operator' && ['+', '-'].includes((this.peek()?.value as string | undefined) ?? '')) {
      const operator = this.next().value;
      const value = this.parseUnary();
      return operator === '-' ? -value : value;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): number {
    const token = this.next();
    if (token.type === 'number') {
      return token.value;
    }

    if (token.type === 'identifier') {
      if (this.match('paren', '(')) {
        const args: number[] = [];
        if (!this.match('paren', ')')) {
          do {
            args.push(this.parseConditional());
          } while (this.match('comma'));
          this.expect('paren', ')');
        }
        const fn = functionMap[token.value];
        if (!fn) {
          throw new Error(`Unknown formula function "${token.value}" in "${this.source}".`);
        }
        return fn(...args);
      }

      const value = this.variables[token.value];
      if (value === undefined) {
        throw new Error(`Missing formula variable "${token.value}" in "${this.source}".`);
      }
      if (!Number.isFinite(value)) {
        throw new Error(`Formula variable "${token.value}" must be finite.`);
      }
      return value;
    }

    if (token.type === 'paren' && token.value === '(') {
      const value = this.parseConditional();
      this.expect('paren', ')');
      return value;
    }

    throw new Error(`Unexpected token in formula "${this.source}".`);
  }

  private peek(): Token | undefined {
    return this.tokens[this.cursor];
  }

  private next(): Token {
    const token = this.tokens[this.cursor];
    if (!token) {
      throw new Error(`Unexpected end of formula "${this.source}".`);
    }
    this.cursor += 1;
    return token;
  }

  private match(type: Token['type'], value?: string): boolean {
    const token = this.peek();
    if (!token || token.type !== type || (value !== undefined && token.value !== value)) {
      return false;
    }
    this.cursor += 1;
    return true;
  }

  private expect(type: Token['type'], value?: string): void {
    if (!this.match(type, value)) {
      throw new Error(`Expected ${value ?? type} in formula "${this.source}".`);
    }
  }
}

export const evaluateNumericFormula = (formula: string, variables: FormulaVariables = {}): number => {
  const parser = new FormulaParser(tokenizeFormula(formula), variables, formula);
  const result = parser.parse();
  if (!Number.isFinite(result)) {
    throw new Error(`Formula "${formula}" produced a non-finite result.`);
  }
  return result;
};
