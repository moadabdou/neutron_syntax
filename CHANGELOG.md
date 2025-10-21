## 0.0.3 - 2025-10-21

- Add highlighting for optional type annotations in `var` declarations: `int`, `float`, `string`, `bool`, `array`, `object`, `any`.
- Improve number literal regex to support scientific notation (e.g., `1.23e-4`, `.5`, `6E10`).
- Correct constant keyword from `null` to `nil` per Neutron language.

## 0.0.4 - 2025-10-21

- Add highlighting for `match`, `case`, and `default` keywords.
- Highlight the arrow operator `=>` as an operator.
- Add example test file `tests/test_match.nt`.

## 0.0.5 - 2025-10-21

- Highlight anonymous function (lambda) parameter lists in `fun(...)` expressions.
- Highlight built-in module names in `use` statements: `sys`, `json`, `math`, `convert`, `time`, `http`.
- Support `using 'file.nt';` file import highlighting.
- Add example tests: `tests/test_lambdas_and_modules.nt`.

## 0.0.6 - 2025-10-21

- Add command "Neutron: Run Current File" and a CodeLens "Run Neutron" on `.nt` files.
- Runs `neutron {file_name}` in a dedicated terminal. Configure runtime path via `neutron.runtimePath`.
 - Default keybinding: `Ctrl+Alt+R` (Windows/Linux), `Cmd+Alt+R` (macOS).

# Change Log

All notable changes to the "neutron" extension will be documented in this file.

Check [Keep a Changelog](http://keepachangelog.com/) for recommendations on how to structure this file.

## [Unreleased]

- Initial release