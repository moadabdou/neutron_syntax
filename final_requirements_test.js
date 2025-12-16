// Final requirements test
const fs = require('fs');
const NeutronParser = require('./server/parser.js');
const TypeChecker = require('./server/typeChecker.js');

const parser = new NeutronParser();

// Test 1: var x = 10; x = 20; should be ALLOWED (regular variable reassignment)
console.log("Test 1: var x = 10; x = 20; (should be ALLOWED)");
const code1 = `var x = 10;
x = 20;`;
const doc1 = { getText: () => code1 };
const ast1 = parser.parse(code1);
const checker1 = new TypeChecker();
const errors1 = [];
checker1.check(ast1, doc1, errors1);
console.log(`Result: ${errors1.length} error(s) - ${errors1.length === 0 ? 'PASS' : 'FAIL'}`);
if (errors1.length > 0) {
    errors1.forEach((e, i) => console.log(`  Error ${i+1}: ${e.message}`));
}
console.log();

// Test 2: static var x = 10; x = 20; should NOT be allowed (static variable reassignment)
console.log("Test 2: static var x = 10; x = 20; (should NOT be allowed)");
const code2 = `static var x = 10;
x = 20;`;
const doc2 = { getText: () => code2 };
const ast2 = parser.parse(code2);
const checker2 = new TypeChecker();
const errors2 = [];
checker2.check(ast2, doc2, errors2);
console.log(`Result: ${errors2.length} error(s) - ${errors2.length > 0 ? 'PASS' : 'FAIL'}`);
if (errors2.length > 0) {
    errors2.forEach((e, i) => console.log(`  Error ${i+1}: ${e.message}`));
}
console.log();

// Test 3: var x = 10; var x = 20; should NOT be allowed (variable redeclaration)
console.log("Test 3: var x = 10; var x = 20; (should NOT be allowed)");
const code3 = `var x = 10;
var x = 20;`;
const doc3 = { getText: () => code3 };
const ast3 = parser.parse(code3);
const checker3 = new TypeChecker();
const errors3 = [];
checker3.check(ast3, doc3, errors3);
console.log(`Result: ${errors3.length} error(s) - ${errors3.length > 0 ? 'PASS' : 'FAIL'}`);
if (errors3.length > 0) {
    errors3.forEach((e, i) => console.log(`  Error ${i+1}: ${e.message}`));
}
console.log();

console.log("All tests completed!");