// Test static variables and variable redeclaration
const fs = require('fs');
const NeutronParser = require('./server/parser.js');
const TypeChecker = require('./server/typeChecker.js');

// Test 1: Static variable reassignment should cause error
console.log("Test 1: Static variable reassignment (should error)");
const testContent1 = `static var x = 10;
x = 20;  // This should cause an error since x is static and already assigned`;

console.log("Input code:");
console.log(testContent1);

const mockDocument1 = { getText: function() { return testContent1; } };

const parser = new NeutronParser();
const ast1 = parser.parse(testContent1);

console.log("\nParsed AST (first few lines):");
console.log(JSON.stringify(ast1, null, 2).substring(0, 200) + "...");

const typeChecker = new TypeChecker();
const errors1 = [];
typeChecker.check(ast1, mockDocument1, errors1);

console.log("\nType checking completed.");
console.log("Errors found:", errors1.length);
if (errors1.length > 0) {
    console.log("Errors:");
    errors1.forEach((error, index) => {
        console.log(`${index + 1}. Severity: ${error.severity}, Message: ${error.message}`);
    });
} else {
    console.log("No errors found - this may indicate the feature is not working properly.");
}

// Test 2: Regular variable assignment should work fine
console.log("\n" + "=".repeat(60));
console.log("Test 2: Regular variable reassignment (should NOT error)");
const testContent2 = `var y = 10;
y = 20;  // This should be OK for regular variables`;

console.log("Input code:");
console.log(testContent2);

const mockDocument2 = { getText: function() { return testContent2; } };

const ast2 = parser.parse(testContent2);
const errors2 = [];
typeChecker.check(ast2, mockDocument2, errors2);

console.log("\nType checking completed.");
console.log("Errors found:", errors2.length);
if (errors2.length > 0) {
    console.log("Errors:");
    errors2.forEach((error, index) => {
        console.log(`${index + 1}. Severity: ${error.severity}, Message: ${error.message}`);
    });
} else {
    console.log("No errors found - this is expected for regular variable reassignment.");
}

// Test 3: Variable redeclaration should cause error
console.log("\n" + "=".repeat(60));
console.log("Test 3: Variable redeclaration (should error)");
const testContent3 = `var z = 10;
var z = 20;  // This should cause an error - redeclaration`;

console.log("Input code:");
console.log(testContent3);

const mockDocument3 = { getText: function() { return testContent3; } };

const ast3 = parser.parse(testContent3);
const errors3 = [];
typeChecker.check(ast3, mockDocument3, errors3);

console.log("\nType checking completed.");
console.log("Errors found:", errors3.length);
if (errors3.length > 0) {
    console.log("Errors:");
    errors3.forEach((error, index) => {
        console.log(`${index + 1}. Severity: ${error.severity}, Message: ${error.message}`);
    });
} else {
    console.log("No errors found - this may indicate the feature is not working properly.");
}

// Test 4: Static variable without type annotation
console.log("\n" + "=".repeat(60));
console.log("Test 4: Static variable without type");
const testContent4 = `static var name = "Alice";
name = "Bob";  // This should cause an error`;

console.log("Input code:");
console.log(testContent4);

const mockDocument4 = { getText: function() { return testContent4; } };

const ast4 = parser.parse(testContent4);
const errors4 = [];
typeChecker.check(ast4, mockDocument4, errors4);

console.log("\nType checking completed.");
console.log("Errors found:", errors4.length);
if (errors4.length > 0) {
    console.log("Errors:");
    errors4.forEach((error, index) => {
        console.log(`${index + 1}. Severity: ${error.severity}, Message: ${error.message}`);
    });
} else {
    console.log("No errors found - this may indicate the feature is not working properly.");
}

// Test 5: Valid single static assignment (should not cause error)
console.log("\n" + "=".repeat(60));
console.log("Test 5: Valid single static assignment");
const testContent5 = `static var value = 42;  // Only assigned once`;

console.log("Input code:");
console.log(testContent5);

const mockDocument5 = { getText: function() { return testContent5; } };

const ast5 = parser.parse(testContent5);
const errors5 = [];
typeChecker.check(ast5, mockDocument5, errors5);

console.log("\nType checking completed.");
console.log("Errors found:", errors5.length);
if (errors5.length > 0) {
    console.log("Errors:");
    errors5.forEach((error, index) => {
        console.log(`${index + 1}. Severity: ${error.severity}, Message: ${error.message}`);
    });
} else {
    console.log("No errors found - this is expected for valid single static assignment.");
}