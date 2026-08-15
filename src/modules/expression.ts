type Token = { type: 'identifier' | 'number' | 'string' | 'operator' | 'punctuation' | 'eof'; value: string };
type Reference = { value: unknown; owner: unknown };

const blockedIdentifiers = new Set(['globalThis', 'window', 'document', 'Function', 'eval', 'constructor', '__proto__', 'prototype', 'import', 'new']);

function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < input.length) {
    const rest = input.slice(index);
    const whitespace = rest.match(/^\s+/);
    if (whitespace) { index += whitespace[0].length; continue; }
    const string = rest.match(/^("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/);
    if (string) { tokens.push({ type: 'string', value: string[0] }); index += string[0].length; continue; }
    const number = rest.match(/^\d+(?:\.\d+)?/);
    if (number) { tokens.push({ type: 'number', value: number[0] }); index += number[0].length; continue; }
    const identifier = rest.match(/^[A-Za-z_$][\w$]*/);
    if (identifier) {
      if (blockedIdentifiers.has(identifier[0])) throw new Error(`Blocked identifier: ${identifier[0]}`);
      tokens.push({ type: 'identifier', value: identifier[0] }); index += identifier[0].length; continue;
    }
    const operator = rest.match(/^(===|!==|==|!=|>=|<=|&&|\|\||[+\-*/%><!?:.,()[\]])/);
    if (operator) {
      const value = operator[0];
      tokens.push({ type: value.match(/^[()[\].,?:]$/) ? 'punctuation' : 'operator', value });
      index += value.length; continue;
    }
    throw new Error(`Unsupported token near: ${rest.slice(0, 12)}`);
  }
  tokens.push({ type: 'eof', value: '' });
  return tokens;
}

class Parser {
  private index = 0;
  constructor(private readonly tokens: Token[], private readonly context: Record<string, unknown>) {}

  parse(): unknown {
    const result = this.parseConditional();
    if (this.peek().type !== 'eof') throw new Error(`Unexpected token: ${this.peek().value}`);
    return result;
  }

  private peek(): Token { return this.tokens[this.index]; }
  private take(value?: string): Token {
    const token = this.peek();
    if (value && token.value !== value) throw new Error(`Expected ${value}, received ${token.value}`);
    this.index += 1;
    return token;
  }

  private parseConditional(): unknown {
    const condition = this.parseOr();
    if (this.peek().value !== '?') return condition;
    this.take('?');
    const whenTrue = this.parseConditional();
    this.take(':');
    const whenFalse = this.parseConditional();
    return condition ? whenTrue : whenFalse;
  }

  private parseOr(): unknown {
    let value = this.parseAnd();
    while (this.peek().value === '||') { this.take(); const right = this.parseAnd(); value = value || right; }
    return value;
  }

  private parseAnd(): unknown {
    let value = this.parseEquality();
    while (this.peek().value === '&&') { this.take(); const right = this.parseEquality(); value = value && right; }
    return value;
  }

  private parseEquality(): unknown {
    let value = this.parseComparison();
    while (['===', '!==', '==', '!='].includes(this.peek().value)) {
      const operator = this.take().value;
      const right = this.parseComparison();
      value = operator === '===' ? value === right : operator === '!==' ? value !== right : operator === '==' ? value == right : value != right;
    }
    return value;
  }

  private parseComparison(): unknown {
    let value = this.parseTerm();
    while (['>', '<', '>=', '<='].includes(this.peek().value)) {
      const operator = this.take().value;
      const right = this.parseTerm();
      if (operator === '>') value = (value as any) > (right as any);
      if (operator === '<') value = (value as any) < (right as any);
      if (operator === '>=') value = (value as any) >= (right as any);
      if (operator === '<=') value = (value as any) <= (right as any);
    }
    return value;
  }

  private parseTerm(): unknown {
    let value = this.parseFactor();
    while (['+', '-'].includes(this.peek().value)) {
      const operator = this.take().value;
      const right = this.parseFactor();
      value = operator === '+' ? (value as any) + (right as any) : (value as any) - (right as any);
    }
    return value;
  }

  private parseFactor(): unknown {
    let value = this.parseUnary();
    while (['*', '/', '%'].includes(this.peek().value)) {
      const operator = this.take().value;
      const right = this.parseUnary();
      if (operator === '*') value = (value as any) * (right as any);
      if (operator === '/') value = (value as any) / (right as any);
      if (operator === '%') value = (value as any) % (right as any);
    }
    return value;
  }

  private parseUnary(): unknown {
    if (this.peek().value === '!') { this.take(); return !this.parseUnary(); }
    if (this.peek().value === '-') { this.take(); return -(this.parseUnary() as number); }
    if (this.peek().value === '+') { this.take(); return +(this.parseUnary() as number); }
    return this.parsePostfix().value;
  }

  private parsePostfix(): Reference {
    let reference = this.parsePrimary();
    while (this.peek().value === '.' || this.peek().value === '[' || this.peek().value === '(') {
      if (this.peek().value === '.') {
        this.take('.');
        const key = this.take().value;
        if (blockedIdentifiers.has(key)) throw new Error(`Blocked property: ${key}`);
        const owner = reference.value;
        reference = { value: owner == null ? undefined : (owner as any)[key], owner };
      } else if (this.peek().value === '[') {
        this.take('[');
        const key = this.parseConditional();
        this.take(']');
        const owner = reference.value;
        reference = { value: owner == null ? undefined : (owner as any)[key as any], owner };
      } else {
        this.take('(');
        const args: unknown[] = [];
        if (this.peek().value !== ')') {
          do { args.push(this.parseConditional()); } while (this.peek().value === ',' && (this.take(), true));
        }
        this.take(')');
        if (typeof reference.value !== 'function') throw new Error('Expression value is not callable');
        reference = { value: (reference.value as Function).apply(reference.owner ?? this.context, args), owner: this.context };
      }
    }
    return reference;
  }

  private parsePrimary(): Reference {
    const token = this.take();
    if (token.type === 'number') return { value: Number(token.value), owner: this.context };
    if (token.type === 'string') return { value: JSON.parse(token.value[0] === '"' ? token.value : `"${token.value.slice(1, -1).replace(/"/g, '\\"')}"`), owner: this.context };
    if (token.value === '(') { const value = this.parseConditional(); this.take(')'); return { value, owner: this.context }; }
    if (token.type === 'identifier') {
      if (token.value === 'true') return { value: true, owner: this.context };
      if (token.value === 'false') return { value: false, owner: this.context };
      if (token.value === 'null') return { value: null, owner: this.context };
      return { value: this.context[token.value], owner: this.context };
    }
    throw new Error(`Unexpected token: ${token.value}`);
  }
}

export function evaluateSafeExpression(expression: string, context: Record<string, unknown>): unknown {
  if (!expression.trim() || /[;{}]|=>|`/.test(expression)) return undefined;
  try {
    return new Parser(tokenize(expression), context ?? {}).parse();
  } catch {
    return undefined;
  }
}
