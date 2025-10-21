# Neutron

Neutron is a lightweight, object-oriented toy programming language designed for learning and experimentation.  
This VS Code extension provides full syntax highlighting, including keywords, variables, constants, strings, numbers, function definitions and calls, object method calls, and `use` imports.

---

## Features

- **Syntax Highlighting**
  - Keywords (`var`, `if`, `class`, `fun`, `this`, etc.) in bluish-grey
  - Variables in light blue
  - Constants (`true`, `false`, `null`, ALL_CAPS) in deep blue
  - Strings in orange/yellow
  - Numbers in cyan/purple
  - Scientific notation numbers (`1.23e-4`, `6E10`, `.5`)
  - Function definitions (`fun greet()`) in blue
  - Function calls (`say()`, `counter.increment()`) in bright yellow
  - Object method calls only highlight the method, not the object
  - `use` imports: `use` keyword in blue, module names in green
  - Optional type annotations in var declarations: `var int x = 42;` with types highlighted
  - Pattern matching keywords: `match`, `case`, `default` and the `=>` arrow operator
  - Lambda function parameters in inline `fun(...) { ... }`
  - Built-in module names highlighted in `use` statements: `sys`, `json`, `math`, `convert`, `time`, `http`
  - File imports via `using 'file.nt';`

### Example: match

```
var day = 3;
match (day) {
    case 1 => say("Monday");
    case 2 => say("Tuesday");
    case 3 => say("Wednesday");
    default => say("Other day");
}
```

### Example: lambdas and imports

```
use sys;
use json;

using 'utils.nt';

var add = fun(a, b) { return a + b; };
say(add(2, 3));
```
- **Supports object-oriented constructs**
  - Classes, methods, `this` keyword, multiple instances
- **Lightweight and easy to install**

---

## Requirements

No additional requirements are needed. Just install the extension in VS Code and open a `.neutron` file to see syntax highlighting.

---

## Extension Settings

This extension does not currently add any configurable settings.

---

## Known Issues

- No code completion, linting, or debugging support yet — purely syntax highlighting.
- Multi-line `use` statements with comments in between may not highlight perfectly.

---

## Release Notes

### 1.0.0
- Initial release of Neutron syntax highlighting extension for VS Code.
- Supports keywords, variables, constants, strings, numbers, functions, method calls, and `use` imports.

### 1.0.1
- Fixed method call highlighting: only the method name is highlighted, not the object.

---

## Working with Markdown

You can author your README using Visual Studio Code. Useful shortcuts:

* Split the editor (`Ctrl+\` on Windows/Linux, `Cmd+\` on macOS)
* Toggle preview (`Shift+Ctrl+V` or `Shift+Cmd+V`)
* Press `Ctrl+Space` to see Markdown snippet suggestions

---

## For more information

* [Visual Studio Code Markdown Support](http://code.visualstudio.com/docs/languages/markdown)
* [Markdown Syntax Reference](https://help.github.com/articles/markdown-basics/)

**Enjoy coding in Neutron!**