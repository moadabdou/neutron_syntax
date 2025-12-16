// Copyright 2026 (c) Yasakei. All rights reserved.
//
// Licensed under Neutron Public License v1.0 (the "License");

class NeutronParser {
  constructor() {
    this.tokens = [];
    this.current = 0;
  }

  // Tokenize the input source code
  tokenize(source) {
    const tokens = [];
    let i = 0;

    while (i < source.length) {
      const char = source[i];

      // Skip whitespace
      if (/\s/.test(char)) {
        i++;
        continue;
      }

      // Comments
      if (char === '/' && source[i + 1] === '/') {
        // Single-line comment
        while (i < source.length && source[i] !== '\n') {
          i++;
        }
        continue;
      }

      if (char === '/' && source[i + 1] === '*') {
        // Multi-line comment
        i += 2;
        while (i < source.length - 1 && !(source[i] === '*' && source[i + 1] === '/')) {
          i++;
        }
        i += 2;
        continue;
      }

      // String literals
      if (char === '"' || char === "'") {
        const start = i;
        const quote = char;
        i++; // skip opening quote

        while (i < source.length && source[i] !== quote) {
          if (source[i] === '\\') {
            i += 2; // skip escape sequence
          } else {
            i++;
          }
        }

        if (i >= source.length) {
          throw new Error(`Unterminated string literal at position ${start}`);
        }

        tokens.push({
          type: 'STRING',
          value: source.substring(start, i + 1),
          position: start
        });
        i++; // skip closing quote
        continue;
      }

      // Numbers (int and float)
      if (/[0-9]/.test(char)) {
        const start = i;
        while (i < source.length && /[0-9.]/.test(source[i])) {
          i++;
        }
        tokens.push({
          type: 'NUMBER',
          value: source.substring(start, i),
          position: start
        });
        continue;
      }

      // Identifiers and keywords
      if (/[a-zA-Z_$]/.test(char)) {
        const start = i;
        while (i < source.length && /[a-zA-Z0-9_$]/.test(source[i])) {
          i++;
        }
        const value = source.substring(start, i);
        const type = this.isKeyword(value) ? 'KEYWORD' : 'IDENTIFIER';
        tokens.push({
          type: type,
          value: value,
          position: start
        });
        continue;
      }

      // Multi-character operators
      if (i < source.length - 1) {
        const twoChar = source.substring(i, i + 2);
        if (twoChar === '==') {
          tokens.push({ type: 'OPERATOR', value: '==', position: i });
          i += 2;
          continue;
        }
        if (twoChar === '!=') {
          tokens.push({ type: 'OPERATOR', value: '!=', position: i });
          i += 2;
          continue;
        }
        if (twoChar === '<=') {
          tokens.push({ type: 'OPERATOR', value: '<=', position: i });
          i += 2;
          continue;
        }
        if (twoChar === '>=') {
          tokens.push({ type: 'OPERATOR', value: '>=', position: i });
          i += 2;
          continue;
        }
        if (twoChar === '&&' || twoChar === 'and') {
          tokens.push({ type: 'OPERATOR', value: twoChar, position: i });
          i += 2;
          continue;
        }
        if (twoChar === '||' || twoChar === 'or') {
          tokens.push({ type: 'OPERATOR', value: twoChar, position: i });
          i += 2;
          continue;
        }
      }

      // Single character tokens
      if ('=<>!+-*/%()[]{};,'.includes(char)) {
        tokens.push({
          type: 'OPERATOR',
          value: char,
          position: i
        });
        i++;
        continue;
      }

      // If we get here, we found an unrecognized character
      throw new Error(`Unexpected character '${char}' at position ${i}`);
    }

    return tokens;
  }

  isKeyword(value) {
    const keywords = [
      'var', 'if', 'elif', 'else', 'while', 'for', 'return', 'break', 'continue',
      'class', 'fun', 'this', 'and', 'or', 'not', 'in', 'new', 'match', 'case',
      'default', 'use', 'using', 'int', 'float', 'string', 'bool', 'array',
      'object', 'any', 'true', 'false', 'nil'
    ];
    return keywords.includes(value);
  }

  // Parse tokens into an AST
  parse(source) {
    this.tokens = this.tokenize(source);
    this.current = 0;
    const statements = [];

    while (this.current < this.tokens.length) {
      statements.push(this.parseStatement());
    }

    return {
      type: 'Program',
      body: statements
    };
  }

  parseStatement() {
    const token = this.peek();

    // Variable declaration with type annotation: var int x = 5;
    if (token.type === 'KEYWORD' && token.value === 'var') {
      return this.parseVariableDeclaration();
    }

    // Function declaration
    if (token.type === 'KEYWORD' && token.value === 'fun') {
      return this.parseFunctionDeclaration();
    }

    // If statement
    if (token.type === 'KEYWORD' && token.value === 'if') {
      return this.parseIfStatement();
    }

    // While statement
    if (token.type === 'KEYWORD' && token.value === 'while') {
      return this.parseWhileStatement();
    }

    // Return statement
    if (token.type === 'KEYWORD' && token.value === 'return') {
      return this.parseReturnStatement();
    }

    // Expression statement
    return {
      type: 'ExpressionStatement',
      expression: this.parseExpression()
    };
  }

  parseVariableDeclaration() {
    this.advance(); // consume 'var'
    
    // Check if there's a type annotation
    let typeAnnotation = null;
    if (this.peek().type === 'KEYWORD' && this.isTypeKeyword(this.peek().value)) {
      typeAnnotation = this.advance().value;
    }

    // Variable name
    const nameToken = this.expect('IDENTIFIER');
    const name = nameToken.value;

    // Assignment
    let init = null;
    if (this.peek().value === '=') {
      this.advance(); // consume '='
      init = this.parseExpression();
    }

    // Optional semicolon
    if (this.peek().value === ';') {
      this.advance(); // consume ';'
    }

    return {
      type: 'VariableDeclaration',
      typeAnnotation: typeAnnotation,
      name: name,
      init: init
    };
  }

  parseFunctionDeclaration() {
    this.advance(); // consume 'fun'

    const name = this.expect('IDENTIFIER').value;

    this.expect('OPERATOR', '(');
    const params = [];

    if (this.peek().value !== ')') {
      params.push(this.expect('IDENTIFIER').value);

      while (this.peek().value === ',') {
        this.advance(); // consume ','
        params.push(this.expect('IDENTIFIER').value);
      }
    }

    this.expect('OPERATOR', ')');

    // For now, we don't parse the function body in detail, just mark it as a block
    let body;
    if (this.peek().value === '{') {
      // Just skip the body for now in our type analysis
      body = {
        type: 'BlockStatement',
        body: [] // We'll add more detailed parsing later
      };
    }

    return {
      type: 'FunctionDeclaration',
      name: name,
      params: params,
      body: body
    };
  }

  parseIfStatement() {
    this.advance(); // consume 'if'
    this.expect('OPERATOR', '(');
    const test = this.parseExpression();
    this.expect('OPERATOR', ')');

    const consequent = this.parseStatement();

    let alternate = null;
    if (this.peek().type === 'KEYWORD' && 
        (this.peek().value === 'else' || this.peek().value === 'elif')) {
      if (this.peek().value === 'elif') {
        // Recursively parse elif as nested if-else
        alternate = this.parseIfStatement();
      } else {
        this.advance(); // consume 'else'
        alternate = this.parseStatement();
      }
    }

    return {
      type: 'IfStatement',
      test: test,
      consequent: consequent,
      alternate: alternate
    };
  }

  parseWhileStatement() {
    this.advance(); // consume 'while'
    this.expect('OPERATOR', '(');
    const test = this.parseExpression();
    this.expect('OPERATOR', ')');

    const body = this.parseStatement();

    return {
      type: 'WhileStatement',
      test: test,
      body: body
    };
  }

  parseReturnStatement() {
    this.advance(); // consume 'return'
    const argument = this.parseExpression();

    // Optional semicolon
    if (this.peek().value === ';') {
      this.advance(); // consume ';'
    }

    return {
      type: 'ReturnStatement',
      argument: argument
    };
  }

  parseExpression() {
    return this.parseAssignment();
  }

  parseAssignment() {
    const left = this.parseLogicalOr();

    if (this.peek().value === '=') {
      this.advance(); // consume '='
      const right = this.parseAssignment();
      return {
        type: 'AssignmentExpression',
        left: left,
        operator: '=',
        right: right
      };
    }

    return left;
  }

  parseLogicalOr() {
    let expr = this.parseLogicalAnd();

    while (this.peek().value === 'or' || this.peek().value === '||') {
      const op = this.advance().value;
      const right = this.parseLogicalAnd();
      expr = {
        type: 'LogicalExpression',
        operator: op,
        left: expr,
        right: right
      };
    }

    return expr;
  }

  parseLogicalAnd() {
    let expr = this.parseEquality();

    while (this.peek().value === 'and' || this.peek().value === '&&') {
      const op = this.advance().value;
      const right = this.parseEquality();
      expr = {
        type: 'LogicalExpression',
        operator: op,
        left: expr,
        right: right
      };
    }

    return expr;
  }

  parseEquality() {
    let expr = this.parseRelational();

    while (this.peek().value === '==' || this.peek().value === '!=') {
      const op = this.advance().value;
      const right = this.parseRelational();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right: right
      };
    }

    return expr;
  }

  parseRelational() {
    let expr = this.parseAdditive();

    while (['<', '<=', '>', '>='].includes(this.peek().value)) {
      const op = this.advance().value;
      const right = this.parseAdditive();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right: right
      };
    }

    return expr;
  }

  parseAdditive() {
    let expr = this.parseMultiplicative();

    while (this.peek().value === '+' || this.peek().value === '-') {
      const op = this.advance().value;
      const right = this.parseMultiplicative();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right: right
      };
    }

    return expr;
  }

  parseMultiplicative() {
    let expr = this.parseUnary();

    while (this.peek().value === '*' || this.peek().value === '/' || this.peek().value === '%') {
      const op = this.advance().value;
      const right = this.parseUnary();
      expr = {
        type: 'BinaryExpression',
        operator: op,
        left: expr,
        right: right
      };
    }

    return expr;
  }

  parseUnary() {
    if (this.peek().value === 'not' || this.peek().value === '!') {
      const op = this.advance().value;
      const argument = this.parseUnary();
      return {
        type: 'UnaryExpression',
        operator: op,
        argument: argument
      };
    }

    return this.parsePrimary();
  }

  parsePrimary() {
    const token = this.peek();

    if (token.type === 'NUMBER') {
      this.advance();
      const numValue = parseFloat(token.value);
      return {
        type: 'Literal',
        value: numValue,
        raw: token.value
      };
    }

    if (token.type === 'STRING') {
      this.advance();
      // Remove quotes from string value
      const stringValue = token.value.slice(1, -1);
      return {
        type: 'Literal',
        value: stringValue,
        raw: token.value
      };
    }

    if (token.value === 'true' || token.value === 'false') {
      this.advance();
      return {
        type: 'Literal',
        value: token.value === 'true',
        raw: token.value
      };
    }

    if (token.value === 'nil') {
      this.advance();
      return {
        type: 'Literal',
        value: null,
        raw: token.value
      };
    }

    if (token.type === 'IDENTIFIER') {
      this.advance();
      let expr = {
        type: 'Identifier',
        name: token.value
      };

      // Check for function calls or member access
      while (this.peek().value === '(' || this.peek().value === '.') {
        if (this.peek().value === '(') {
          expr = this.parseCallExpression(expr);
        } else if (this.peek().value === '.') {
          expr = this.parseMemberExpression(expr);
        }
      }

      return expr;
    }

    if (token.value === '(') {
      this.advance(); // consume '('
      const expr = this.parseExpression();
      this.expect('OPERATOR', ')');
      return expr;
    }

    if (token.value === '[') {
      return this.parseArrayLiteral();
    }

    if (token.value === '{') {
      return this.parseObjectLiteral();
    }

    throw new Error(`Unexpected token: ${token.value} at position ${token.position}`);
  }

  parseCallExpression(callee) {
    this.expect('OPERATOR', '(');
    const args = [];

    if (this.peek().value !== ')') {
      args.push(this.parseExpression());

      while (this.peek().value === ',') {
        this.advance(); // consume ','
        args.push(this.parseExpression());
      }
    }

    this.expect('OPERATOR', ')');

    return {
      type: 'CallExpression',
      callee: callee,
      arguments: args
    };
  }

  parseMemberExpression(object) {
    this.expect('OPERATOR', '.');
    const property = this.expect('IDENTIFIER');

    return {
      type: 'MemberExpression',
      object: object,
      property: {
        type: 'Identifier',
        name: property.value
      }
    };
  }

  parseArrayLiteral() {
    this.expect('OPERATOR', '[');
    const elements = [];

    if (this.peek().value !== ']') {
      elements.push(this.parseExpression());

      while (this.peek().value === ',') {
        this.advance(); // consume ','
        elements.push(this.parseExpression());
      }
    }

    this.expect('OPERATOR', ']');

    return {
      type: 'ArrayExpression',
      elements: elements
    };
  }

  parseObjectLiteral() {
    this.expect('OPERATOR', '{');
    const properties = [];

    if (this.peek().value !== '}') {
      // Parse a property: "key": value
      const key = this.parseExpression();
      this.expect('OPERATOR', ':');
      const value = this.parseExpression();
      properties.push({
        type: 'Property',
        key: key,
        value: value
      });

      while (this.peek().value === ',') {
        this.advance(); // consume ','
        const nextKey = this.parseExpression();
        this.expect('OPERATOR', ':');
        const nextValue = this.parseExpression();
        properties.push({
          type: 'Property',
          key: nextKey,
          value: nextValue
        });
      }
    }

    this.expect('OPERATOR', '}');

    return {
      type: 'ObjectExpression',
      properties: properties
    };
  }

  peek() {
    if (this.current >= this.tokens.length) {
      return { type: 'EOF', value: '', position: -1 };
    }
    return this.tokens[this.current];
  }

  advance() {
    if (this.current < this.tokens.length) {
      return this.tokens[this.current++];
    }
    return null;
  }

  expect(type, value = null) {
    const token = this.peek();
    if (token.type !== type || (value !== null && token.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` "${value}"` : ''}, but got ${token.type} "${token.value}" at position ${token.position}`);
    }
    return this.advance();
  }

  isTypeKeyword(value) {
    const typeKeywords = ['int', 'float', 'string', 'bool', 'array', 'object', 'any'];
    return typeKeywords.includes(value);
  }
}

module.exports = NeutronParser;