// Simple test to verify static variable functionality
const fs = require('fs');
const NeutronParser = require('./server/parser.js');
const TypeChecker = require('./server/typeChecker.js');

// Create test file content that should trigger static variable error
const testContent = `var x = 10;
x = 20;  // This should cause an error since x was already assigned`;

console.log("Testing static variable functionality...");
console.log("Input code:");
console.log(testContent);

// Create a mock document object
const mockDocument = {
    getText: function() { return testContent; }
};

// Parse the test content
const parser = new NeutronParser();
const ast = parser.parse(testContent);

console.log("\nParsed AST:");
console.log(JSON.stringify(ast, null, 2));

// Run type checking
const typeChecker = new TypeChecker();
const errors = [];
typeChecker.check(ast, mockDocument, errors);

console.log("\nType checking completed.");
console.log("Errors found:", errors.length);
if (errors.length > 0) {
    console.log("Errors:");
    errors.forEach((error, index) => {
        console.log(`${index + 1}. Severity: ${error.severity}, Message: ${error.message}`);
        console.log(`   Range: ${JSON.stringify(error.range)}`);
    });
} else {
    console.log("No errors found - this may indicate the static var feature is not working properly.");
}

// Test with valid assignment (should not cause error)
console.log("\n" + "=".repeat(50));
console.log("Testing valid single assignment (should have no errors):");
const validContent = `var y = 30;  // Only assigned once`;
console.log("Input code:");
console.log(validContent);

const mockDocument2 = {
    getText: function() { return validContent; }
};

const ast2 = parser.parse(validContent);
const errors2 = [];
typeChecker.check(ast2, mockDocument2, errors2);

console.log("\nType checking completed.");
console.log("Errors found:", errors2.length);
if (errors2.length > 0) {
    console.log("Errors:");
    errors2.forEach((error, index) => {
        console.log(`${index + 1}. Severity: ${error.severity}, Message: ${error.message}`);
        console.log(`   Range: ${JSON.stringify(error.range)}`);
    });
} else {
    console.log("No errors found - this is expected for valid single assignment.");
}