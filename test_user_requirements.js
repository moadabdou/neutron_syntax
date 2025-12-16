// Test the exact requirements from the user
const fs = require('fs');
const NeutronParser = require('./server/parser.js');
const TypeChecker = require('./server/typeChecker.js');

console.log("Testing exact user requirements...\n");

// Test 1: static var should throw error when assigned twice
console.log("Test 1: static var should throw error when assigned twice");
console.log("Code: static var x = 10; x = 20;");
const code1 = `static var x = 10;
x = 20;`;
const doc1 = { getText: () => code1 };
const parser = new NeutronParser();
const ast1 = parser.parse(code1);
const checker1 = new TypeChecker();
const errors1 = [];
checker1.check(ast1, doc1, errors1);
console.log(`Result: ${errors1.length} error(s) - ${errors1.length > 0 ? 'PASS' : 'FAIL'}`);
if (errors1.length > 0) console.log(`  Error: ${errors1[0].message}\n`);

// Test 2: regular var should NOT throw error when assigned twice
console.log("Test 2: regular var should NOT throw error when assigned twice");
console.log("Code: var test = 10; x = 'test';");
const code2 = `var test = 10;
x = "test";`;
const doc2 = { getText: () => code2 };
const ast2 = parser.parse(code2);
const checker2 = new TypeChecker();
const errors2 = [];
checker2.check(ast2, doc2, errors2);
console.log(`Result: ${errors2.length} error(s) - ${errors2.length === 0 ? 'PASS' : 'FAIL (unexpected error)'}\n`);

// Test 3: var name should not be assignable twice (variable redeclaration)
console.log("Test 3: var name should not be assignable twice (variable redeclaration)");
console.log("Code: var x = test; var x = 'test';");
const code3 = `var x = 10;
var x = "test";`;
const doc3 = { getText: () => code3 };
const ast3 = parser.parse(code3);
const checker3 = new TypeChecker();
const errors3 = [];
checker3.check(ast3, doc3, errors3);
console.log(`Result: ${errors3.length} error(s) - ${errors3.length > 0 ? 'PASS' : 'FAIL'}`);
if (errors3.length > 0) console.log(`  Error: ${errors3[0].message}\n`);

console.log("All tests completed!");