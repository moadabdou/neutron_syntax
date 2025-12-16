// Debug test to see internal state
const fs = require('fs');
const NeutronParser = require('./server/parser.js');
const TypeChecker = require('./server/typeChecker.js');

// Test the problematic case
console.log("Debug: Static variable reassignment");
const testContent = `static var x = 10;
x = 20;`;

console.log("Input code:");
console.log(testContent);

const mockDocument = { getText: function() { return testContent; } };

const parser = new NeutronParser();
const ast = parser.parse(testContent);

console.log("\nParsed AST:");
console.log(JSON.stringify(ast, null, 2));

const typeChecker = new TypeChecker();
console.log("\nInitial state:");
console.log("symbolTable:", Array.from(typeChecker.symbolTable.entries()));
console.log("staticVariables:", Array.from(typeChecker.staticVariables));
console.log("assignedVariables:", Array.from(typeChecker.assignedVariables));

// Process first statement: static var x = 10
console.log("\nProcessing first statement...");
typeChecker.checkNode(ast.body[0], mockDocument);

console.log("After processing first statement:");
console.log("symbolTable:", Array.from(typeChecker.symbolTable.entries()));
console.log("staticVariables:", Array.from(typeChecker.staticVariables));
console.log("assignedVariables:", Array.from(typeChecker.assignedVariables));

// Process second statement: x = 20
console.log("\nProcessing second statement...");
typeChecker.checkNode(ast.body[1], mockDocument);

console.log("After processing second statement:");
console.log("symbolTable:", Array.from(typeChecker.symbolTable.entries()));
console.log("staticVariables:", Array.from(typeChecker.staticVariables));
console.log("assignedVariables:", Array.from(typeChecker.assignedVariables));

const errors = [];
// Reset for full check to see errors
const typeChecker2 = new TypeChecker();
typeChecker2.check(ast, mockDocument, errors);

console.log("\nFinal errors:", errors.length);
errors.forEach((error, index) => {
    console.log(`${index + 1}. ${error.message}`);
});