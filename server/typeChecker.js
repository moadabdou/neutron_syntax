/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

// Type checker class for Neutron
class TypeChecker {
    constructor() {
        // Symbol table to track variable types
        this.symbolTable = new Map();
        this.errors = [];
    }
    
    check(ast, document, errors) {
        this.errors = errors;
        this.symbolTable = new Map(); // Reset for each document
        
        if (ast && ast.body) {
            for (const node of ast.body) {
                this.checkNode(node, document);
            }
        }
    }
    
    checkNode(node, document) {
        if (!node) return;
        
        switch (node.type) {
            case 'VariableDeclaration':
                this.checkVariableDeclaration(node, document);
                break;
            case 'AssignmentExpression':
                this.checkAssignmentExpression(node, document);
                break;
            case 'BinaryExpression':
                this.checkBinaryExpression(node, document);
                break;
            case 'IfStatement':
                this.checkIfStatement(node, document);
                break;
            case 'WhileStatement':
                this.checkWhileStatement(node, document);
                break;
            case 'ForStatement':
                this.checkForStatement(node, document);
                break;
            case 'ExpressionStatement':
                this.checkNode(node.expression, document);
                break;
            case 'CallExpression':
                this.checkCallExpression(node, document);
                break;
            case 'ReturnStatement':
                this.checkNode(node.argument, document);
                break;
            default:
                // For other nodes, check their children
                this.checkChildren(node, document);
        }
    }
    
    checkChildren(node, document) {
        if (!node) return;
        
        for (const key in node) {
            if (node.hasOwnProperty(key)) {
                const value = node[key];
                
                if (value && typeof value === 'object') {
                    if (Array.isArray(value)) {
                        for (const item of value) {
                            this.checkNode(item, document);
                        }
                    } else {
                        this.checkNode(value, document);
                    }
                }
            }
        }
    }
    
    checkVariableDeclaration(node, document) {
        if (!node.declaredType) {
            // If no type is declared, just store that the variable exists
            if (node.name) {
                this.symbolTable.set(node.name, 'any');
            }
            // Check the init expression if it exists
            if (node.init) {
                this.checkNode(node.init, document);
            }
            return;
        }
        
        const declaredType = node.declaredType;
        const variableName = node.name;
        
        if (node.init) {
            // Check the type of the initial value
            const actualType = this.inferType(node.init);
            
            // Check for type mismatch
            if (!this.isCompatibleType(declaredType, actualType)) {
                // Create error with proper position
                const startPos = this.getPositionFromIndex(document, node.init.start);
                const endPos = this.getPositionFromIndex(document, node.init.end);
                
                this.errors.push({
                    severity: 1, // DiagnosticSeverity.Error
                    range: {
                        start: startPos,
                        end: endPos
                    },
                    message: `Type mismatch: expected ${declaredType} but got ${actualType} for variable '${variableName}'`
                });
            } else {
                // Store the variable with its type in the symbol table
                this.symbolTable.set(variableName, declaredType);
            }
        } else {
            // Variable declared without initialization, store its type
            this.symbolTable.set(variableName, declaredType);
        }
    }
    
    checkAssignmentExpression(node, document) {
        // This handles cases like x = value where x has a declared type
        if (node.left && node.left.type === 'Identifier' && node.right) {
            const varName = node.left.name;
            // Look up the declared type in the current symbol table context
            // For this basic implementation, we'll track types as we process the AST
            // In a full implementation, we'd need to maintain symbol tables per scope
            
            // First, let's check if this is a reassignment to an existing variable
            // We need to be careful about variable scoping here
            const declaredType = this.symbolTable.get(varName);
            
            if (declaredType && declaredType !== 'any') {
                const actualType = this.inferType(node.right);
                
                if (!this.isCompatibleType(declaredType, actualType)) {
                    const startPos = this.getPositionFromIndex(document, node.right.start);
                    const endPos = this.getPositionFromIndex(document, node.right.end);
                    
                    this.errors.push({
                        severity: 1, // DiagnosticSeverity.Error
                        range: {
                            start: startPos,
                            end: endPos
                        },
                        message: `Type mismatch: expected ${declaredType} but got ${actualType} when assigning to '${varName}'`
                    });
                }
            }
            
            // Also check the right side of the assignment
            this.checkNode(node.right, document);
        }
    }
    
    inferType(node) {
        if (!node) return 'any';
        
        switch (node.type) {
            case 'Literal':
                if (typeof node.value === 'number') {
                    // Check if it's an integer or float from the raw representation
                    if (node.raw && node.raw.includes('.')) {
                        return 'float';
                    } else {
                        // Determine if it's int or float based on the value
                        return Number.isInteger(node.value) ? 'int' : 'float';
                    }
                } else if (typeof node.value === 'string' && 
                          (node.raw && (node.raw.startsWith('"') || node.raw.startsWith("'")))) {
                    return 'string';
                } else if (typeof node.value === 'boolean') {
                    return 'bool';
                } else if (node.value === null) {
                    return 'any'; // nil can be assigned to any type
                }
                break;
                
            case 'ArrayExpression':
                return 'array';
                
            case 'ObjectExpression':
                return 'object';
                
            case 'Identifier':
                // Look up the type of the identifier in the symbol table
                return this.symbolTable.get(node.name) || 'any';
                
            case 'BinaryExpression':
            case 'LogicalExpression':
                // For now, these return bool or float/int depending on operator
                // In a more sophisticated system, we'd implement more detailed inference
                if (['==', '!=', '<', '<=', '>', '>=', 'and', 'or'].includes(node.operator)) {
                    return 'bool';
                } else if (['+', '-', '*', '/', '%'].includes(node.operator)) {
                    // If both operands are int, result is int, otherwise float
                    const leftType = this.inferType(node.left) || 'any';
                    const rightType = this.inferType(node.right) || 'any';
                    
                    if (leftType === 'int' && rightType === 'int' && node.operator !== '/') {
                        return 'int';
                    }
                    return 'float'; // Default to float for numeric operations
                }
                break;
                
            case 'UnaryExpression':
                if (node.operator === 'not') {
                    return 'bool';
                }
                // Other unary operations
                return this.inferType(node.argument) || 'any';
                
            case 'CallExpression':
                // Function calls would return different types based on the function
                // For now, return any, but in a real system we'd look up function return types
                return 'any';
                
            case 'MemberExpression':
                // Member access would have different types based on the object and property
                return 'any';
        }
        
        return 'any';
    }
    
    isCompatibleType(expected, actual) {
        if (expected === actual) return true;
        if (expected === 'any' || actual === 'any') return true;
        
        // Special case: int can be assigned to float
        if (expected === 'float' && actual === 'int') return true;
        
        // nil can be assigned to any type
        if (actual === 'nil') return true;
        
        return false;
    }
    
    getPositionFromIndex(document, index) {
        const text = document.getText();
        let line = 0;
        let char = 0;
        
        for (let i = 0; i < index && i < text.length; i++) {
            if (text[i] === '\n') {
                line++;
                char = 0;
            } else {
                char++;
            }
        }
        
        return {
            line: line,
            character: char
        };
    }
    
    checkIfStatement(node, document) {
        // Check the test condition
        if (node.test) {
            this.checkNode(node.test, document);
        }
        
        // Check the consequent block
        if (node.consequent) {
            this.checkNode(node.consequent, document);
        }
        
        // Check the alternate block (else)
        if (node.alternate) {
            this.checkNode(node.alternate, document);
        }
    }
    
    checkWhileStatement(node, document) {
        // Check the test condition
        if (node.test) {
            this.checkNode(node.test, document);
        }
        
        // Check the body
        if (node.body) {
            this.checkNode(node.body, document);
        }
    }
    
    checkForStatement(node, document) {
        // Check init, test, and update expressions
        if (node.init) {
            this.checkNode(node.init, document);
        }
        if (node.test) {
            this.checkNode(node.test, document);
        }
        if (node.update) {
            this.checkNode(node.update, document);
        }
        
        // Check the body
        if (node.body) {
            this.checkNode(node.body, document);
        }
    }
    
    checkBinaryExpression(node, document) {
        // Check left and right operands
        if (node.left) {
            this.checkNode(node.left, document);
        }
        if (node.right) {
            this.checkNode(node.right, document);
        }
    }
    
    checkCallExpression(node, document) {
        // Check the callee and arguments
        if (node.callee) {
            this.checkNode(node.callee, document);
        }
        if (node.arguments) {
            for (const arg of node.arguments) {
                this.checkNode(arg, document);
            }
        }
    }
}

module.exports = TypeChecker;