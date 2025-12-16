// Copyright 2026 (c) Yasakei. All rights reserved.
//
// Licensed under Neutron Public License v1.0 (the "License");

class NeutronParser {
    constructor() {
        this.tokens = [];
        this.position = 0;
        this.errors = [];  // Track parsing errors including missing semicolons
    }

    // Tokenize the input text
    tokenize(input) {
        this.input = input; // Store input so findEndOfLine can access it
        const tokens = [];
        let current = 0;

        while (current < input.length) {
            let char = input[current];

            // Skip whitespace
            if (/\s/.test(char)) {
                current++;
                continue;
            }

            // Comments
            if (char === '/' && input[current + 1] === '/') {
                // Single line comment
                while (current < input.length && input[current] !== '\n') {
                    current++;
                }
                continue;
            }

            if (char === '/' && input[current + 1] === '*') {
                // Multi-line comment
                current += 2; // Skip /*
                while (current < input.length - 1 && 
                      !(input[current] === '*' && input[current + 1] === '/')) {
                    current++;
                }
                current += 2; // Skip */
                continue;
            }

            // Strings
            if (char === '"' || char === "'") {
                const start = current;
                const quote = char;
                current++; // Skip opening quote

                while (current < input.length && input[current] !== quote) {
                    if (input[current] === '\\') {
                        current += 2; // Skip escape sequence
                    } else {
                        current++;
                    }
                }

                if (current >= input.length) {
                    throw new Error(`Unterminated string at position ${start}`);
                }

                current++; // Skip closing quote
                tokens.push({
                    type: 'STRING',
                    value: input.slice(start, current),
                    start: start,
                    end: current
                });
                continue;
            }

            // Numbers (int and float), including negative numbers
            if (/[0-9]/.test(char)) {
                const start = current;
                while (current < input.length && /[0-9.]/.test(input[current])) {
                    current++;
                }
                tokens.push({
                    type: 'NUMBER',
                    value: input.slice(start, current),
                    start: start,
                    end: current
                });
                continue;
            }
            
            // Handle negative numbers (when '-' is followed by a digit)
            if (char === '-' && current + 1 < input.length && /[0-9]/.test(input[current + 1])) {
                const start = current;  // Include the minus sign
                current++;  // Skip the minus sign
                while (current < input.length && /[0-9.]/.test(input[current])) {
                    current++;
                }
                tokens.push({
                    type: 'NUMBER',
                    value: input.slice(start, current),  // Include the minus sign in the number
                    start: start,
                    end: current
                });
                continue;
            }

            // Identifiers and keywords
            if (/[a-zA-Z_$]/.test(char)) {
                const start = current;
                while (current < input.length && /[a-zA-Z0-9_$]/.test(input[current])) {
                    current++;
                }
                const value = input.slice(start, current);
                
                const type = this.isKeyword(value) ? 'KEYWORD' : 'IDENTIFIER';
                tokens.push({
                    type: type,
                    value: value,
                    start: start,
                    end: current
                });
                continue;
            }

            // Two-character operators
            if (char === '=' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '==',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '!' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '!=',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '>' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '>=',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '<' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '<=',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '&' && input[current + 1] === '&') {
                tokens.push({
                    type: 'OPERATOR',
                    value: 'and',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '|' && input[current + 1] === '|') {
                tokens.push({
                    type: 'OPERATOR',
                    value: 'or',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            // Single-character tokens
            tokens.push({
                type: 'SYMBOL',
                value: char,
                start: current,
                end: current + 1
            });
            current++;
        }

        return tokens;
    }

    isKeyword(value) {
        const keywords = [
            'var', 'int', 'float', 'string', 'bool', 'array', 'object', 'any',
            'if', 'elif', 'else', 'while', 'for', 'return', 'break', 'continue',
            'class', 'fun', 'this', 'and', 'or', 'not', 'in', 'new', 'match',
            'case', 'default', 'use', 'using', 'true', 'false', 'nil', 'static'
        ];
        return keywords.includes(value);
    }

    // Parse tokens into an AST
    parse(input) {
        if (!input || input.trim() === '') {
            return {
                type: 'Program',
                body: []
            };
        }
        
        this.tokens = this.tokenize(input);
        this.position = 0;
        const statements = [];

        while (this.position < this.tokens.length) {
            const stmt = this.parseStatement();
            if (stmt) {
                statements.push(stmt);
            }
        }

        return {
            type: 'Program',
            body: statements,
            errors: this.errors  // Include any syntax errors found
        };
    }
    
    addError(message, start, end) {
        this.errors.push({
            message: message,
            start: start,
            end: end
        });
    }
    
    findEndOfLine(pos) {
        // Find the end of the line containing the given position
        for (let i = pos; i < this.input.length; i++) {
            if (this.input[i] === '\n' || this.input[i] === '\r') {
                return i;
            }
        }
        // If no newline found, return the end of input
        return this.input.length;
    }
    
    // Set the input for the findEndOfLine method to work properly
    tokenize(input) {
        this.input = input; // Store input so findEndOfLine can access it
        const tokens = [];
        let current = 0;

        while (current < input.length) {
            let char = input[current];

            // Skip whitespace
            if (/\s/.test(char)) {
                current++;
                continue;
            }

            // Comments
            if (char === '/' && input[current + 1] === '/') {
                // Single line comment
                while (current < input.length && input[current] !== '\n') {
                    current++;
                }
                continue;
            }

            if (char === '/' && input[current + 1] === '*') {
                // Multi-line comment
                current += 2; // Skip /*
                while (current < input.length - 1 && 
                      !(input[current] === '*' && input[current + 1] === '/')) {
                    current++;
                }
                current += 2; // Skip */
                continue;
            }

            // Strings
            if (char === '"' || char === "'") {
                const start = current;
                const quote = char;
                current++; // Skip opening quote

                while (current < input.length && input[current] !== quote) {
                    if (input[current] === '\\') {
                        current += 2; // Skip escape sequence
                    } else {
                        current++;
                    }
                }

                if (current >= input.length) {
                    throw new Error(`Unterminated string at position ${start}`);
                }

                current++; // Skip closing quote
                tokens.push({
                    type: 'STRING',
                    value: input.slice(start, current),
                    start: start,
                    end: current
                });
                continue;
            }

            // Numbers (int and float), including negative numbers
            if (/[0-9]/.test(char)) {
                const start = current;
                while (current < input.length && /[0-9.]/.test(input[current])) {
                    current++;
                }
                tokens.push({
                    type: 'NUMBER',
                    value: input.slice(start, current),
                    start: start,
                    end: current
                });
                continue;
            }
            
            // Handle negative numbers (when '-' is followed by a digit)
            if (char === '-' && current + 1 < input.length && /[0-9]/.test(input[current + 1])) {
                const start = current;  // Include the minus sign
                current++;  // Skip the minus sign
                while (current < input.length && /[0-9.]/.test(input[current])) {
                    current++;
                }
                tokens.push({
                    type: 'NUMBER',
                    value: input.slice(start, current),  // Include the minus sign in the number
                    start: start,
                    end: current
                });
                continue;
            }

            // Identifiers and keywords
            if (/[a-zA-Z_$]/.test(char)) {
                const start = current;
                while (current < input.length && /[a-zA-Z0-9_$]/.test(input[current])) {
                    current++;
                }
                const value = input.slice(start, current);
                
                const type = this.isKeyword(value) ? 'KEYWORD' : 'IDENTIFIER';
                tokens.push({
                    type: type,
                    value: value,
                    start: start,
                    end: current
                });
                continue;
            }

            // Two-character operators
            if (char === '=' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '==',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '!' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '!=',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '>' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '>=',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '<' && input[current + 1] === '=') {
                tokens.push({
                    type: 'OPERATOR',
                    value: '<=',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '&' && input[current + 1] === '&') {
                tokens.push({
                    type: 'OPERATOR',
                    value: 'and',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            if (char === '|' && input[current + 1] === '|') {
                tokens.push({
                    type: 'OPERATOR',
                    value: 'or',
                    start: current,
                    end: current + 2
                });
                current += 2;
                continue;
            }

            // Single-character tokens
            tokens.push({
                type: 'SYMBOL',
                value: char,
                start: current,
                end: current + 1
            });
            current++;
        }

        return tokens;
    }

    parseStatement() {
        const token = this.currentToken();
        if (!token) return null;

        try {
            if (token.value === 'static' || token.value === 'var') {
                return this.parseVariableDeclaration();
            } else if (token.value === 'if') {
                return this.parseIfStatement();
            } else if (token.value === 'while') {
                return this.parseWhileStatement();
            } else if (token.value === 'do') {
                return this.parseDoWhileStatement();
            } else if (token.value === 'for') {
                return this.parseForStatement();
            } else if (token.value === 'fun') {
                return this.parseFunctionDeclaration();
            } else if (token.value === 'class') {
                return this.parseClassDeclaration();
            } else if (token.value === 'return') {
                return this.parseReturnStatement();
            } else if (token.value === 'match') {
                return this.parseMatchStatement();
            } else if (token.value === 'retry') {
                return this.parseRetryStatement();
            } else if (token.value === 'try') {
                return this.parseTryStatement();
            } else if (token.type === 'IDENTIFIER') {
                return this.parseExpressionStatement();
            } else {
                // Skip to the next statement (look for ; or newline equivalent)
                this.skipToNextStatement();
                return null;
            }
        } catch (e) {
            // If there's a parsing error, add it to our errors and try to recover
            this.addError(e.message, token.start, token.end);
            this.skipToNextStatement();
            return null;
        }
    }
    
    // Helper method to skip tokens until we find a reasonable statement boundary
    skipToNextStatement() {
        while (this.currentToken()) {
            const token = this.currentToken();
            if (token.value === ';') {
                this.nextToken(); // consume the semicolon
                return;
            } else if (token.value === '}' || token.value === '{') {
                // We've reached block boundaries, return to let higher level handle
                return;
            } else if (this.isStatementStart(token)) {
                // We've reached the start of the next statement
                return;
            }
            this.nextToken();
        }
    }
    
    // Helper method to check if a token starts a statement
    isStatementStart(token) {
        const statementStarters = ['var', 'if', 'while', 'do', 'for', 'fun', 'class', 'return', 'match', 'retry', 'try'];
        return statementStarters.includes(token.value) || token.type === 'IDENTIFIER';
    }

    parseVariableDeclaration() {
        let isStatic = false;
        const startToken = this.currentToken();

        // Check if this is a static variable declaration
        if (this.currentToken().value === 'static') {
            isStatic = true;
            this.nextToken(); // skip 'static'

            // After 'static', we expect 'var'
            if (this.currentToken() && this.currentToken().value !== 'var') {
                throw new Error(`Expected 'var' after 'static' at position ${this.currentToken().start}`);
            }
            this.nextToken(); // skip 'var'
        } else {
            this.nextToken(); // skip 'var'
        }

        // Check if there's a type annotation
        let declaredType = null;
        if (this.currentToken() && this.isTypeKeyword(this.currentToken().value)) {
            declaredType = this.currentToken().value;
            this.nextToken(); // skip type
        }

        if (!this.currentToken() || this.currentToken().type !== 'IDENTIFIER') {
            throw new Error(`Expected identifier at position ${this.currentToken().start}`);
        }

        const name = this.currentToken().value;
        const nameToken = this.currentToken();
        this.nextToken(); // skip identifier

        // Check if there's an assignment
        let init = null;
        if (this.currentToken() && this.currentToken().value === '=') {
            this.nextToken(); // skip '='
            init = this.parseExpression();
        }

        // Check for semicolon after variable declaration
        if (this.currentToken() && this.currentToken().value === ';') {
            this.nextToken(); // consume the semicolon
            return {
                type: 'VariableDeclaration',
                declaredType: declaredType,
                name: name,
                init: init,
                isStatic: isStatic,  // Add isStatic flag
                start: startToken.start,
                end: this.currentToken() ? this.currentToken().start : nameToken.end + 1  // +1 for the semicolon character
            };
        } else {
            // Find the end of the current line to highlight the entire line
            const lineEnd = this.findEndOfLine(nameToken.end);
            // Report missing semicolon error
            this.addError(`Missing semicolon at end of variable declaration`, nameToken.end, lineEnd);

            return {
                type: 'VariableDeclaration',
                declaredType: declaredType,
                name: name,
                init: init,
                isStatic: isStatic,  // Add isStatic flag
                start: startToken.start,
                end: nameToken.end
            };
        }
    }

    isTypeKeyword(value) {
        return ['int', 'float', 'string', 'bool', 'array', 'object', 'any'].includes(value);
    }

    parseIfStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'if'

        if (!this.currentToken() || this.currentToken().value !== '(') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected '(' after 'if'`, errorPos, errorPos + 1);
            // Try to recover by looking for the opening parenthesis
            while (this.currentToken() && this.currentToken().value !== '(' && this.currentToken().value !== '{' && this.currentToken().value !== ';') {
                this.nextToken();
            }
            if (!this.currentToken()) {
                return {
                    type: 'IfStatement',
                    test: null,
                    consequent: null,
                    alternate: null,
                    start: startToken.start,
                    end: startToken.end
                };
            }
        }

        this.nextToken(); // skip '('
        const test = this.parseExpression();

        if (!this.currentToken() || this.currentToken().value !== ')') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected ')' after if condition`, errorPos, errorPos + 1);
            // Try to recover by looking for the closing parenthesis
            while (this.currentToken() && this.currentToken().value !== ')' && this.currentToken().value !== '{' && this.currentToken().value !== ';') {
                this.nextToken();
            }
            if (this.currentToken() && this.currentToken().value === ')') {
                this.nextToken(); // skip ')'
            }
        } else {
            this.nextToken(); // skip ')'
        }

        const consequent = this.parseBlock();

        let alternate = null;
        if (this.currentToken() && this.currentToken().value === 'else') {
            this.nextToken(); // skip 'else'
            if (this.currentToken() && this.currentToken().value === 'if') {
                // Handle elif
                alternate = this.parseIfStatement();
            } else {
                alternate = this.parseBlock();
            }
        }

        return {
            type: 'IfStatement',
            test: test,
            consequent: consequent,
            alternate: alternate,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : (consequent ? consequent.end : startToken.end)
        };
    }

    parseBlock() {
        if (this.currentToken() && this.currentToken().value === '{') {
            this.nextToken(); // skip '{'
            const body = [];

            while (this.position < this.tokens.length && this.currentToken().value !== '}') {
                const stmt = this.parseStatement();
                if (stmt) {
                    body.push(stmt);
                }
            }

            if (this.currentToken()) {
                this.nextToken(); // skip '}'
            }

            return {
                type: 'BlockStatement',
                body: body
            };
        } else {
            // Single statement block
            const stmt = this.parseStatement();
            return {
                type: 'BlockStatement',
                body: [stmt]
            };
        }
    }

    parseWhileStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'while'

        if (!this.currentToken() || this.currentToken().value !== '(') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected '(' after 'while'`, errorPos, errorPos + 1);
            // Try to recover by looking for the opening parenthesis or skipping to next statement
            while (this.currentToken() && this.currentToken().value !== '(' && this.currentToken().value !== '{' && this.currentToken().value !== ';') {
                this.nextToken();
            }
            if (!this.currentToken()) {
                return {
                    type: 'WhileStatement',
                    test: null,
                    body: null,
                    start: startToken.start,
                    end: startToken.end
                };
            }
        }

        this.nextToken(); // skip '('
        const test = this.parseExpression();

        if (!this.currentToken() || this.currentToken().value !== ')') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected ')' after while condition`, errorPos, errorPos + 1);
            // Try to recover by looking for the closing parenthesis
            while (this.currentToken() && this.currentToken().value !== ')' && this.currentToken().value !== '{' && this.currentToken().value !== ';') {
                this.nextToken();
            }
            if (this.currentToken() && this.currentToken().value === ')') {
                this.nextToken(); // skip ')'
            }
        } else {
            this.nextToken(); // skip ')'
        }

        const body = this.parseBlock();

        return {
            type: 'WhileStatement',
            test: test,
            body: body,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : (body ? body.end : startToken.end)
        };
    }

    parseForStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'for'

        if (!this.currentToken() || this.currentToken().value !== '(') {
            throw new Error(`Expected '(' after 'for' at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '('
        
        let init = null;
        if (this.currentToken().value !== ';') {
            if (this.currentToken().value === 'var') {
                init = this.parseVariableDeclaration();
            } else {
                init = this.parseExpression();
            }
        }
        
        if (!this.currentToken() || this.currentToken().value !== ';') {
            throw new Error(`Expected ';' after for init at position ${this.currentToken().start}`);
        }
        this.nextToken(); // skip ';'
        
        let test = null;
        if (this.currentToken().value !== ';') {
            test = this.parseExpression();
        }
        
        if (!this.currentToken() || this.currentToken().value !== ';') {
            throw new Error(`Expected ';' after for test at position ${this.currentToken().start}`);
        }
        this.nextToken(); // skip ';'
        
        let update = null;
        if (this.currentToken().value !== ')') {
            update = this.parseExpression();
        }
        
        if (!this.currentToken() || this.currentToken().value !== ')') {
            throw new Error(`Expected ')' after for update at position ${this.currentToken().start}`);
        }
        this.nextToken(); // skip ')'

        const body = this.parseBlock();

        return {
            type: 'ForStatement',
            init: init,
            test: test,
            update: update,
            body: body,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : startToken.end
        };
    }

    parseExpression() {
        return this.parseLogicalOr();
    }
    
    // Check if we're at the start of a potential function call after an expression
    checkForPossibleFunctionCallAfterExpression(expr) {
        // After parsing an expression like 'fmt.type', if the next token is '('
        // it should be part of a function call, not a separate statement
        if (expr && expr.type === 'MemberExpression' && this.currentToken() && this.currentToken().value === '(') {
            // This looks like it should be a function call
            return this.parseCallExpression(expr);
        }
        return expr;
    }

    parseLogicalOr() {
        let expr = this.parseLogicalAnd();

        while (this.currentToken() && this.currentToken().value === 'or') {
            const opToken = this.currentToken();
            this.nextToken(); // skip 'or'
            const right = this.parseLogicalAnd();
            expr = {
                type: 'LogicalExpression',
                operator: 'or',
                left: expr,
                right: right,
                start: expr.start,
                end: right.end
            };
        }

        return expr;
    }

    parseLogicalAnd() {
        let expr = this.parseEquality();

        while (this.currentToken() && this.currentToken().value === 'and') {
            const opToken = this.currentToken();
            this.nextToken(); // skip 'and'
            const right = this.parseEquality();
            expr = {
                type: 'LogicalExpression',
                operator: 'and',
                left: expr,
                right: right,
                start: expr.start,
                end: right.end
            };
        }

        return expr;
    }

    parseEquality() {
        let expr = this.parseRelational();

        while (this.currentToken() && 
               (this.currentToken().value === '==' || this.currentToken().value === '!=')) {
            const opToken = this.currentToken();
            this.nextToken(); // skip operator
            const right = this.parseRelational();
            expr = {
                type: 'BinaryExpression',
                operator: opToken.value,
                left: expr,
                right: right,
                start: expr.start,
                end: right.end
            };
        }

        return expr;
    }

    parseRelational() {
        let expr = this.parseAdditive();

        while (this.currentToken() && 
               ['<', '<=', '>', '>='].includes(this.currentToken().value)) {
            const opToken = this.currentToken();
            this.nextToken(); // skip operator
            const right = this.parseAdditive();
            expr = {
                type: 'BinaryExpression',
                operator: opToken.value,
                left: expr,
                right: right,
                start: expr.start,
                end: right.end
            };
        }

        return expr;
    }

    parseAdditive() {
        let expr = this.parseMultiplicative();

        while (this.currentToken() && 
               (this.currentToken().value === '+' || this.currentToken().value === '-')) {
            const opToken = this.currentToken();
            this.nextToken(); // skip operator
            const right = this.parseMultiplicative();
            expr = {
                type: 'BinaryExpression',
                operator: opToken.value,
                left: expr,
                right: right,
                start: expr.start,
                end: right.end
            };
        }

        return expr;
    }

    parseMultiplicative() {
        let expr = this.parseUnary();

        while (this.currentToken() && 
               ['*', '/', '%'].includes(this.currentToken().value)) {
            const opToken = this.currentToken();
            this.nextToken(); // skip operator
            const right = this.parseUnary();
            expr = {
                type: 'BinaryExpression',
                operator: opToken.value,
                left: expr,
                right: right,
                start: expr.start,
                end: right.end
            };
        }

        return expr;
    }

    parseUnary() {
        if (this.currentToken() && this.currentToken().value === 'not') {
            const opToken = this.currentToken();
            this.nextToken(); // skip 'not'
            const argument = this.parseUnary();
            return {
                type: 'UnaryExpression',
                operator: 'not',
                argument: argument,
                start: opToken.start,
                end: argument.end
            };
        }

        return this.parsePrimary();
    }

    parsePrimary() {
        const token = this.currentToken();
        if (!token) {
            throw new Error('Unexpected end of input');
        }

        if (token.type === 'NUMBER') {
            this.nextToken();
            return {
                type: 'Literal',
                value: Number(token.value),
                raw: token.value,
                start: token.start,
                end: token.end
            };
        }

        if (token.type === 'STRING') {
            this.nextToken();
            // Check if this string contains interpolation
            if (token.value.includes('${')) {
                return this.parseTemplateLiteral(token);
            }
            return {
                type: 'Literal',
                value: token.value,
                raw: token.value,
                start: token.start,
                end: token.end
            };
        }

        if (token.value === 'true' || token.value === 'false') {
            this.nextToken();
            return {
                type: 'Literal',
                value: token.value === 'true',
                raw: token.value,
                start: token.start,
                end: token.end
            };
        }

        if (token.value === 'nil') {
            this.nextToken();
            return {
                type: 'Literal',
                value: null,
                raw: token.value,
                start: token.start,
                end: token.end
            };
        }

        if (token.type === 'IDENTIFIER') {
            const identifier = {
                type: 'Identifier',
                name: token.value,
                start: token.start,
                end: token.end
            };
            this.nextToken();

            // Check for function call
            if (this.currentToken() && this.currentToken().value === '(') {
                return this.parseCallExpression(identifier);
            }

            // Check for member access
            if (this.currentToken() && this.currentToken().value === '.') {
                return this.parseMemberExpression(identifier);
            }

            return identifier;
        }

        if (token.value === '(') {
            this.nextToken(); // skip '('
            const expr = this.parseExpression();
            if (!this.currentToken() || this.currentToken().value !== ')') {
                throw new Error(`Expected ')' at position ${this.currentToken().start}`);
            }
            this.nextToken(); // skip ')'
            return expr;
        }

        if (token.value === 'throw') {
            return this.parseThrowStatement();
        }

        if (token.value === '[') {
            return this.parseArrayExpression();
        }

        if (token.value === '{') {
            return this.parseObjectExpression();
        }

        throw new Error(`Unexpected token '${token.value}' at position ${token.start}`);
    }

    parseCallExpression(callee) {
        if (!this.currentToken() || this.currentToken().value !== '(') {
            throw new Error(`Expected '(' for function call at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '('

        const args = [];
        if (this.currentToken() && this.currentToken().value !== ')') {
            args.push(this.parseExpression());
            while (this.currentToken() && this.currentToken().value === ',') {
                this.nextToken(); // skip ','
                args.push(this.parseExpression());
            }
        }

        if (!this.currentToken() || this.currentToken().value !== ')') {
            throw new Error(`Expected ')' to close function call at position ${this.currentToken().start}`);
        }

        const endToken = this.currentToken();
        this.nextToken(); // skip ')'

        return {
            type: 'CallExpression',
            callee: callee,
            arguments: args,
            start: callee.start,
            end: endToken.end  // This should be the position right after the closing parenthesis
        };
    }

    parseMemberExpression(object) {
        if (!this.currentToken() || this.currentToken().value !== '.') {
            throw new Error(`Expected '.' for member access at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '.'

        if (!this.currentToken() || this.currentToken().type !== 'IDENTIFIER') {
            throw new Error(`Expected identifier after '.' at position ${this.currentToken().start}`);
        }

        const property = {
            type: 'Identifier',
            name: this.currentToken().value,
            start: this.currentToken().start,
            end: this.currentToken().end
        };

        this.nextToken();

        // Check if this member access is immediately followed by a function call
        if (this.currentToken() && this.currentToken().value === '(') {
            // This is actually a function call on the member expression
            const callExpr = this.parseCallExpression({
                type: 'MemberExpression',
                object: object,
                property: property,
                start: object.start,
                end: property.end
            });
            return callExpr;
        }

        return {
            type: 'MemberExpression',
            object: object,
            property: property,
            start: object.start,
            end: property.end
        };
    }

    parseArrayExpression() {
        const startToken = this.currentToken();
        this.nextToken(); // skip '['

        const elements = [];
        if (this.currentToken() && this.currentToken().value !== ']') {
            elements.push(this.parseExpression());
            while (this.currentToken() && this.currentToken().value === ',') {
                this.nextToken(); // skip ','
                elements.push(this.parseExpression());
            }
        }

        if (!this.currentToken() || this.currentToken().value !== ']') {
            throw new Error(`Expected ']' to close array at position ${this.currentToken().start}`);
        }

        const endToken = this.currentToken();
        this.nextToken(); // skip ']'

        return {
            type: 'ArrayExpression',
            elements: elements,
            start: startToken.start,
            end: endToken.end
        };
    }

    parseObjectExpression() {
        const startToken = this.currentToken();
        this.nextToken(); // skip '{'

        const properties = [];
        if (this.currentToken() && this.currentToken().value !== '}') {
            properties.push(this.parseObjectProperty());
            while (this.currentToken() && this.currentToken().value === ',') {
                this.nextToken(); // skip ','
                properties.push(this.parseObjectProperty());
            }
        }

        if (!this.currentToken() || this.currentToken().value !== '}') {
            throw new Error(`Expected '}' to close object at position ${this.currentToken().start}`);
        }

        const endToken = this.currentToken();
        this.nextToken(); // skip '}'

        return {
            type: 'ObjectExpression',
            properties: properties,
            start: startToken.start,
            end: endToken.end
        };
    }

    parseObjectProperty() {
        if (!this.currentToken() || this.currentToken().type !== 'STRING') {
            throw new Error(`Expected string key for object property at position ${this.currentToken().start}`);
        }

        const key = this.currentToken();
        this.nextToken(); // skip key

        if (!this.currentToken() || this.currentToken().value !== ':') {
            throw new Error(`Expected ':' after object property key at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip ':'

        const value = this.parseExpression();

        return {
            type: 'Property',
            key: key,
            value: value,
            start: key.start,
            end: value.end
        };
    }

    parseExpressionStatement() {
        const expr = this.parseExpression();
        
        // Check if this is an assignment
        if (expr.type === 'Identifier' && this.currentToken() && this.currentToken().value === '=') {
            return this.parseAssignmentExpression(expr);
        }
        
        // Check for semicolon - if present, consume it
        if (this.currentToken() && this.currentToken().value === ';') {
            this.nextToken(); // consume the semicolon
            return {
                type: 'ExpressionStatement',
                expression: expr,
                start: expr.start,
                end: this.currentToken() ? this.currentToken().start : expr.end + 1  // +1 for the semicolon character
            };
        } else {
            // For expression statements, don't necessarily require semicolons at end of line
            // Just return the statement without adding an error
            return {
                type: 'ExpressionStatement',
                expression: expr,
                start: expr.start,
                end: expr.end
            };
        }
    }
    
    parseAssignmentExpression(left) {
        if (!this.currentToken() || this.currentToken().value !== '=') {
            throw new Error(`Expected '=' in assignment at position ${this.currentToken().start}`);
        }
        
        const opToken = this.currentToken();
        this.nextToken(); // skip '='
        
        const right = this.parseExpression();
        
        // Check for semicolon - if present, consume it
        if (this.currentToken() && this.currentToken().value === ';') {
            this.nextToken(); // consume the semicolon
            // Return the assignment with proper end position after the semicolon
            return {
                type: 'AssignmentExpression',
                operator: '=',
                left: left,
                right: right,
                start: left.start,
                end: this.currentToken() ? this.currentToken().start : right.end + 1  // +1 for the semicolon character
            };
        } else {
            // For assignments, don't necessarily require semicolons at end of line
            return {
                type: 'AssignmentExpression',
                operator: '=',
                left: left,
                right: right,
                start: left.start,
                end: right.end
            };
        }
    }

    parseFunctionDeclaration() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'fun'

        if (!this.currentToken() || this.currentToken().type !== 'IDENTIFIER') {
            throw new Error(`Expected function name after 'fun' at position ${this.currentToken().start}`);
        }

        const name = this.currentToken().value;
        const nameToken = this.currentToken();
        this.nextToken(); // skip name

        if (!this.currentToken() || this.currentToken().value !== '(') {
            throw new Error(`Expected '(' after function name at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '('

        const params = [];
        if (this.currentToken() && this.currentToken().value !== ')') {
            if (this.currentToken().type === 'IDENTIFIER') {
                params.push(this.currentToken().value);
                this.nextToken();
            }
            
            while (this.currentToken() && this.currentToken().value === ',') {
                this.nextToken(); // skip ','
                if (this.currentToken() && this.currentToken().type === 'IDENTIFIER') {
                    params.push(this.currentToken().value);
                    this.nextToken();
                }
            }
        }

        if (!this.currentToken() || this.currentToken().value !== ')') {
            throw new Error(`Expected ')' after function parameters at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip ')'

        const body = this.parseBlock();

        return {
            type: 'FunctionDeclaration',
            id: {
                type: 'Identifier',
                name: name,
                start: nameToken.start,
                end: nameToken.end
            },
            params: params,
            body: body,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : startToken.end
        };
    }

    parseClassDeclaration() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'class'

        if (!this.currentToken() || this.currentToken().type !== 'IDENTIFIER') {
            throw new Error(`Expected class name after 'class' at position ${this.currentToken().start}`);
        }

        const name = this.currentToken().value;
        const nameToken = this.currentToken();
        this.nextToken(); // skip name

        if (!this.currentToken() || this.currentToken().value !== '{') {
            throw new Error(`Expected '{' to start class body at position ${this.currentToken().start}`);
        }

        const body = this.parseBlock();

        return {
            type: 'ClassDeclaration',
            id: {
                type: 'Identifier',
                name: name,
                start: nameToken.start,
                end: nameToken.end
            },
            body: body,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : startToken.end
        };
    }

    parseReturnStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'return'

        let argument = null;
        if (this.currentToken() && this.currentToken().value !== ';' &&
            this.currentToken().value !== '}' &&
            this.currentToken().value !== '\n') {
            argument = this.parseExpression();
        }

        // Skip semicolon if present
        if (this.currentToken() && this.currentToken().value === ';') {
            this.nextToken();
        }

        return {
            type: 'ReturnStatement',
            argument: argument,
            start: startToken.start,
            end: argument ? argument.end : startToken.end + 6 // +6 for 'return'
        };
    }

    parseThrowStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'throw'

        let argument = null;
        if (this.currentToken() && this.currentToken().value !== ';' &&
            this.currentToken().value !== '}' &&
            this.currentToken().value !== '\n') {
            argument = this.parseExpression();
        }

        // Skip semicolon if present
        if (this.currentToken() && this.currentToken().value === ';') {
            this.nextToken();
        }

        return {
            type: 'ThrowStatement',
            argument: argument,
            start: startToken.start,
            end: argument ? argument.end : startToken.end + 5 // +5 for 'throw'
        };
    }

    parseTemplateLiteral(token) {
        // This is a simplified implementation for string interpolation
        // A real implementation would require more complex parsing
        // For now, we'll return the raw string as a regular literal
        return {
            type: 'Literal',
            value: token.value,  // This would have the full string with ${...} parts
            raw: token.value,
            start: token.start,
            end: token.end
        };
    }

    parseDoWhileStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'do'

        const body = this.parseBlock();

        if (!this.currentToken() || this.currentToken().value !== 'while') {
            throw new Error(`Expected 'while' after 'do' block at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip 'while'

        if (!this.currentToken() || this.currentToken().value !== '(') {
            throw new Error(`Expected '(' after 'while' in do-while at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '('
        const test = this.parseExpression();

        if (!this.currentToken() || this.currentToken().value !== ')') {
            throw new Error(`Expected ')' after while condition at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip ')'

        // Do-while may optionally end with semicolon
        if (this.currentToken() && this.currentToken().value === ';') {
            this.nextToken(); // consume the semicolon
        }

        return {
            type: 'DoWhileStatement',
            test: test,
            body: body,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : startToken.end
        };
    }

    parseMatchStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'match'

        if (!this.currentToken() || this.currentToken().value !== '(') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected '(' after 'match'`, errorPos, errorPos + 1);
            // Try to recover by looking for the opening parenthesis
            while (this.currentToken() && this.currentToken().value !== '(' && this.currentToken().value !== '{') {
                this.nextToken();
            }
            if (!this.currentToken()) {
                return {
                    type: 'MatchStatement',
                    discriminant: null,
                    cases: [],
                    start: startToken.start,
                    end: startToken.end
                };
            }
        }

        this.nextToken(); // skip '('
        const discriminant = this.parseExpression();

        if (!this.currentToken() || this.currentToken().value !== ')') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected ')' after match expression`, errorPos, errorPos + 1);
            // Try to recover by looking for the closing parenthesis
            while (this.currentToken() && this.currentToken().value !== ')' && this.currentToken().value !== '{') {
                this.nextToken();
            }
            if (this.currentToken() && this.currentToken().value === ')') {
                this.nextToken(); // skip ')'
            }
        } else {
            this.nextToken(); // skip ')'
        }

        if (!this.currentToken() || this.currentToken().value !== '{') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected '{' to start match body`, errorPos, errorPos + 1);
            // Try to recover by looking for the opening brace
            while (this.currentToken() && this.currentToken().value !== '{') {
                this.nextToken();
            }
            if (!this.currentToken()) {
                return {
                    type: 'MatchStatement',
                    discriminant: discriminant,
                    cases: [],
                    start: startToken.start,
                    end: startToken.end
                };
            }
        }

        this.nextToken(); // skip '{'

        const cases = [];
        while (this.currentToken() && this.currentToken().value !== '}') {
            if (this.currentToken().value === 'case') {
                cases.push(this.parseMatchCase());
            } else if (this.currentToken().value === 'default') {
                cases.push(this.parseMatchDefault());
            } else {
                const errorPos = this.currentToken().start;
                this.addError(`Expected 'case' or 'default' in match statement`, errorPos, errorPos + 1);
                // Try to recover by skipping to the next case or closing brace
                while (this.currentToken() && this.currentToken().value !== 'case' &&
                       this.currentToken().value !== 'default' && this.currentToken().value !== '}') {
                    this.nextToken();
                }
                if (this.currentToken() && (this.currentToken().value === 'case' || this.currentToken().value === 'default')) {
                    // Parse the next valid case
                    if (this.currentToken().value === 'case') {
                        cases.push(this.parseMatchCase());
                    } else {
                        cases.push(this.parseMatchDefault());
                    }
                }
            }
        }

        if (!this.currentToken() || this.currentToken().value !== '}') {
            const errorPos = this.currentToken() ? this.currentToken().start : this.tokens.length - 1;
            this.addError(`Expected '}' to end match statement`, errorPos, errorPos + 1);
        } else {
            this.nextToken(); // skip '}'
        }

        return {
            type: 'MatchStatement',
            discriminant: discriminant,
            cases: cases,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : (this.tokens.length > 0 ? this.tokens[this.tokens.length - 1].end : startToken.end)
        };
    }

    parseMatchCase() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'case'

        const test = this.parseExpression();

        if (!this.currentToken() || this.currentToken().value !== '=>') {
            throw new Error(`Expected '=>' after match case at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '=>'

        let consequent;
        if (this.currentToken() && this.currentToken().value === '{') {
            consequent = this.parseBlock();
        } else {
            consequent = this.parseStatement();
        }

        return {
            type: 'MatchCase',
            test: test,
            consequent: consequent,
            start: startToken.start,
            end: consequent.end
        };
    }

    parseMatchDefault() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'default'

        if (!this.currentToken() || this.currentToken().value !== '=>') {
            throw new Error(`Expected '=>' after 'default' in match statement at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '=>'

        let consequent;
        if (this.currentToken() && this.currentToken().value === '{') {
            consequent = this.parseBlock();
        } else {
            consequent = this.parseStatement();
        }

        return {
            type: 'MatchDefault',
            consequent: consequent,
            start: startToken.start,
            end: consequent.end
        };
    }

    parseRetryStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'retry'

        if (!this.currentToken() || this.currentToken().value !== '(') {
            throw new Error(`Expected '(' after 'retry' at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '('
        const count = this.parseExpression();

        if (!this.currentToken() || this.currentToken().value !== ')') {
            throw new Error(`Expected ')' after retry count at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip ')'

        const body = this.parseBlock();

        let handler = null;
        if (this.currentToken() && this.currentToken().value === 'catch') {
            handler = this.parseCatchClause();
        }

        return {
            type: 'RetryStatement',
            count: count,
            body: body,
            handler: handler,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : startToken.end
        };
    }

    parseTryStatement() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'try'

        const block = this.parseBlock();

        const handlers = [];
        if (this.currentToken() && this.currentToken().value === 'catch') {
            handlers.push(this.parseCatchClause());
        }

        let finalizer = null;
        if (this.currentToken() && this.currentToken().value === 'finally') {
            finalizer = this.parseFinallyClause();
        }

        return {
            type: 'TryStatement',
            block: block,
            handlers: handlers,
            finalizer: finalizer,
            start: startToken.start,
            end: this.currentToken() ? this.currentToken().end : startToken.end
        };
    }

    parseCatchClause() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'catch'

        if (!this.currentToken() || this.currentToken().value !== '(') {
            throw new Error(`Expected '(' after 'catch' at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip '('

        let param = null;
        if (this.currentToken() && this.currentToken().type === 'IDENTIFIER') {
            param = {
                type: 'Identifier',
                name: this.currentToken().value,
                start: this.currentToken().start,
                end: this.currentToken().end
            };
            this.nextToken(); // skip parameter name
        }

        if (!this.currentToken() || this.currentToken().value !== ')') {
            throw new Error(`Expected ')' after catch parameter at position ${this.currentToken().start}`);
        }

        this.nextToken(); // skip ')'

        const body = this.parseBlock();

        return {
            type: 'CatchClause',
            param: param,
            body: body,
            start: startToken.start,
            end: body.end
        };
    }

    parseFinallyClause() {
        const startToken = this.currentToken();
        this.nextToken(); // skip 'finally'

        const body = this.parseBlock();

        return {
            type: 'FinallyClause',
            body: body,
            start: startToken.start,
            end: body.end
        };
    }

    currentToken() {
        return this.position < this.tokens.length ? this.tokens[this.position] : null;
    }

    nextToken() {
        if (this.position < this.tokens.length) {
            this.position++;
        }
        return this.currentToken();
    }
}

module.exports = NeutronParser;