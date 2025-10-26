// Neutron completion provider and Language Server client
// Provides suggestions for keywords, types, built-in functions, built-in modules after `use`,
// file paths after `using`, and symbols (vars/classes/functions) found in the current document.
// Also provides type checking through the Language Server.

const vscode = require('vscode');
const { LanguageClient, TransportKind } = require('vscode-languageclient/node');

let client;

const KEYWORDS = [
  'var','if','else','while','for','return','break','continue','class','fun','this','and','or','not','in','new',
  'match','case','default','use','using'
];

const TYPE_KEYWORDS = ['int','float','string','bool','array','object','any'];

const BUILTIN_MODULES = ['sys','json','math','fmt','time','http','arrays'];

const BUILTIN_FUNCTIONS = [
  {
    label: 'say',
    detail: 'say(value) → void',
    documentation: 'Prints a value to the console followed by a newline.'
  }
];

// Module functions from documentation
const MODULE_FUNCTIONS = {
  sys: [
    { label: 'read', detail: 'sys.read(filename) → string', documentation: 'Reads file content' },
    { label: 'write', detail: 'sys.write(filename, content) → void', documentation: 'Writes content to file' },
    { label: 'append', detail: 'sys.append(filename, content) → void', documentation: 'Appends content to file' },
    { label: 'cp', detail: 'sys.cp(source, destination) → void', documentation: 'Copies file' },
    { label: 'mv', detail: 'sys.mv(source, destination) → void', documentation: 'Moves file' },
    { label: 'rm', detail: 'sys.rm(filename) → void', documentation: 'Removes file' },
    { label: 'exists', detail: 'sys.exists(filename) → bool', documentation: 'Checks if file exists' },
    { label: 'mkdir', detail: 'sys.mkdir(path) → void', documentation: 'Creates directory' },
    { label: 'rmdir', detail: 'sys.rmdir(path) → void', documentation: 'Removes directory' },
    { label: 'cwd', detail: 'sys.cwd() → string', documentation: 'Gets current working directory' },
    { label: 'chdir', detail: 'sys.chdir(path) → void', documentation: 'Changes working directory' },
    { label: 'env', detail: 'sys.env() → object', documentation: 'Gets environment variables' },
    { label: 'args', detail: 'sys.args() → array', documentation: 'Gets command line arguments' },
    { label: 'info', detail: 'sys.info() → object', documentation: 'Gets system information' },
    { label: 'exit', detail: 'sys.exit([code]) → void', documentation: 'Exits the program' },
    { label: 'exec', detail: 'sys.exec(command) → string', documentation: 'Executes system command' },
    { label: 'input', detail: 'sys.input() → string', documentation: 'Gets user input' }
  ],
  json: [
    { label: 'stringify', detail: 'json.stringify(value, [pretty]) → string', documentation: 'Converts to JSON string' },
    { label: 'parse', detail: 'json.parse(jsonString) → value', documentation: 'Parses JSON string' },
    { label: 'get', detail: 'json.get(jsonObject, key) → value', documentation: 'Gets value from JSON object' }
  ],
  math: [
    { label: 'add', detail: 'math.add(a, b) → number', documentation: 'Adds two numbers' },
    { label: 'subtract', detail: 'math.subtract(a, b) → number', documentation: 'Subtracts b from a' },
    { label: 'multiply', detail: 'math.multiply(a, b) → number', documentation: 'Multiplies two numbers' },
    { label: 'divide', detail: 'math.divide(a, b) → number', documentation: 'Divides a by b' },
    { label: 'pow', detail: 'math.pow(base, exponent) → number', documentation: 'Raises base to exponent' },
    { label: 'sqrt', detail: 'math.sqrt(number) → number', documentation: 'Square root' },
    { label: 'abs', detail: 'math.abs(number) → number', documentation: 'Absolute value' }
  ],
  fmt: [
    { label: 'to_str', detail: 'fmt.to_str(value) → string', documentation: 'Converts to string' },
    { label: 'to_int', detail: 'fmt.to_int(value) → number', documentation: 'Converts to integer' },
    { label: 'to_float', detail: 'fmt.to_float(value) → number', documentation: 'Converts to float' },
    { label: 'to_bin', detail: 'fmt.to_bin(value) → string', documentation: 'Converts to binary string' },
    { label: 'type', detail: 'fmt.type(value) → string', documentation: 'Gets type of value' }
  ],
  time: [
    { label: 'now', detail: 'time.now() → number', documentation: 'Gets current timestamp' },
    { label: 'format', detail: 'time.format(timestamp) → string', documentation: 'Formats timestamp' },
    { label: 'sleep', detail: 'time.sleep(milliseconds) → void', documentation: 'Sleeps for specified time' }
  ],
  http: [
    { label: 'get', detail: 'http.get(url, [headers]) → object', documentation: 'HTTP GET request' },
    { label: 'post', detail: 'http.post(url, data, [headers]) → object', documentation: 'HTTP POST request' },
    { label: 'put', detail: 'http.put(url, data, [headers]) → object', documentation: 'HTTP PUT request' },
    { label: 'delete', detail: 'http.delete(url, [headers]) → object', documentation: 'HTTP DELETE request' },
    { label: 'head', detail: 'http.head(url, [headers]) → object', documentation: 'HTTP HEAD request' },
    { label: 'patch', detail: 'http.patch(url, data, [headers]) → object', documentation: 'HTTP PATCH request' }
  ],
  arrays: [
    { label: 'new', detail: 'arrays.new() → array', documentation: 'Creates a new array' },
    { label: 'length', detail: 'arrays.length(arr) → number', documentation: 'Gets array length' },
    { label: 'push', detail: 'arrays.push(arr, value) → void', documentation: 'Adds element to array' },
    { label: 'pop', detail: 'arrays.pop(arr) → value', documentation: 'Removes and returns last element' },
    { label: 'at', detail: 'arrays.at(arr, index) → value', documentation: 'Gets element at index' },
    { label: 'set', detail: 'arrays.set(arr, index, value) → void', documentation: 'Sets element at index' },
    { label: 'slice', detail: 'arrays.slice(arr, start, end) → array', documentation: 'Returns slice of array' },
    { label: 'join', detail: 'arrays.join(arr, separator) → string', documentation: 'Joins array elements' },
    { label: 'reverse', detail: 'arrays.reverse(arr) → void', documentation: 'Reverses array' },
    { label: 'sort', detail: 'arrays.sort(arr) → void', documentation: 'Sorts array' },
    { label: 'index_of', detail: 'arrays.index_of(arr, value) → number', documentation: 'Finds index of value' },
    { label: 'contains', detail: 'arrays.contains(arr, value) → bool', documentation: 'Checks if array contains value' },
    { label: 'remove', detail: 'arrays.remove(arr, value) → bool', documentation: 'Removes first occurrence of value' },
    { label: 'remove_at', detail: 'arrays.remove_at(arr, index) → value', documentation: 'Removes element at index' },
    { label: 'clear', detail: 'arrays.clear(arr) → void', documentation: 'Clears array' },
    { label: 'clone', detail: 'arrays.clone(arr) → array', documentation: 'Creates a copy of array' },
    { label: 'to_string', detail: 'arrays.to_string(arr) → string', documentation: 'Converts array to string' },
    { label: 'flat', detail: 'arrays.flat(arr) → array', documentation: 'Flattens nested array' },
    { label: 'fill', detail: 'arrays.fill(arr, value, start, end) → void', documentation: 'Fills array with value' },
    { label: 'range', detail: 'arrays.range(start, end, [step]) → array', documentation: 'Creates array with range of numbers' },
    { label: 'shuffle', detail: 'arrays.shuffle(arr) → void', documentation: 'Shuffles array elements' }
  ]
};

/**
 * Collect symbols (vars, classes, functions) from current document text using regex heuristics
 */
function collectDocumentSymbols(text) {
  const items = [];
  const pushUnique = (label, kind, detail) => {
    if (!label) return;
    if (items.some(i => i.label === label)) return;
    items.push({ label, kind, detail });
  };

  // var declarations: var [type]? name
  const varRegex = /\bvar\s+(?:int|float|string|bool|array|object|any\s+)?([a-z_][a-zA-Z0-9_]*)/g;
  let m;
  while ((m = varRegex.exec(text))) {
    pushUnique(m[1], vscode.CompletionItemKind.Variable, 'variable');
  }

  // functions: fun name(
  const funRegex = /\bfun\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  while ((m = funRegex.exec(text))) {
    pushUnique(m[1], vscode.CompletionItemKind.Function, 'function');
  }

  // classes: class Name
  const classRegex = /\bclass\s+([A-Z][a-zA-Z0-9_]*)/g;
  while ((m = classRegex.exec(text))) {
    pushUnique(m[1], vscode.CompletionItemKind.Class, 'class');
  }

  return items;
}

function makeKeywordItems() {
  return KEYWORDS.map(k => {
    const it = new vscode.CompletionItem(k, vscode.CompletionItemKind.Keyword);
    it.insertText = k;
    return it;
  });
}

function makeTypeItems() {
  return TYPE_KEYWORDS.map(k => new vscode.CompletionItem(k, vscode.CompletionItemKind.TypeParameter));
}

function makeBuiltinFunctionItems() {
  // Include global builtin functions
  const items = BUILTIN_FUNCTIONS.map(f => {
    const it = new vscode.CompletionItem(f.label, vscode.CompletionItemKind.Function);
    it.detail = f.detail;
    it.documentation = new vscode.MarkdownString(f.documentation);
    return it;
  });

  // Include all module functions as well for general suggestions
  for (const moduleName in MODULE_FUNCTIONS) {
    const moduleFuncs = MODULE_FUNCTIONS[moduleName];
    for (const func of moduleFuncs) {
      const qualifiedName = `${moduleName}.${func.label}`;
      const it = new vscode.CompletionItem(qualifiedName, vscode.CompletionItemKind.Function);
      it.detail = func.detail;
      it.documentation = new vscode.MarkdownString(func.documentation);
      items.push(it);
    }
  }

  return items;
}

function makeBuiltinModuleItems() {
  return BUILTIN_MODULES.map(m => {
    const it = new vscode.CompletionItem(m, vscode.CompletionItemKind.Module);
    return it;
  });
}

async function suggestUseModules(prefix) {
  // Built-in modules first
  const items = makeBuiltinModuleItems();
  
  // Add modules from documentation that may not be in the hardcoded list
  const docModules = [
    'sys', 'json', 'math', 'fmt', 'time', 'http', 'arrays',
    'convert' // Keeping for backward compatibility
  ];
  
  for (const module of docModules) {
    if (!BUILTIN_MODULES.includes(module)) {
      const it = new vscode.CompletionItem(module, vscode.CompletionItemKind.Module);
      items.push(it);
    }
  }
  
  // Optionally, suggest .nt files (basename) from workspace as modules, too
  try {
    const uris = await vscode.workspace.findFiles('**/*.nt', '**/node_modules/**', 200);
    const names = new Set();
    for (const uri of uris) {
      let base = uri.path.split('/').pop() || '';
      if (!base.toLowerCase().endsWith('.nt')) continue;
      base = base.slice(0, -3);
      if (!BUILTIN_MODULES.includes(base) && !docModules.includes(base) && !names.has(base)) {
        names.add(base);
        const it = new vscode.CompletionItem(base, vscode.CompletionItemKind.Module);
        items.push(it);
      }
    }
  } catch (e) {
    // ignore
  }
  return items;
}

async function suggestUsingFiles(currentPrefix) {
  // Gather from workspace + configured importPaths
  const config = vscode.workspace.getConfiguration('neutron');
  const extraPaths = config.get('importPaths', []);
  const items = [];

  const addFile = (rel) => {
    const label = rel.replace(/\\\\/g, '/');
    const it = new vscode.CompletionItem(label, vscode.CompletionItemKind.File);
    it.insertText = label;
    return items.push(it);
  };

  try {
    // Workspace files
    const uris = await vscode.workspace.findFiles('**/*.nt', '**/node_modules/**', 500);
    for (const uri of uris) {
      const rel = vscode.workspace.asRelativePath(uri, false);
      if (rel && !rel.startsWith('.git')) addFile(rel);
    }
  } catch {}

  // Extra paths: interpret as glob roots
  if (Array.isArray(extraPaths)) {
    for (const p of extraPaths) {
      try {
        const uris = await vscode.workspace.findFiles(`${p.replace(/\\/g,'/')}/**/*.nt`, undefined, 500);
        for (const uri of uris) {
          const rel = vscode.workspace.asRelativePath(uri, false);
          if (rel) addFile(rel);
        }
      } catch {}
    }
  }

  return items;
}

function isInUsingString(linePrefix) {
  // Match: using '\n...  OR using "...
  return /\busing\s+['"][^'"]*$/.test(linePrefix);
}

function isInUse(linePrefix) {
  return /\buse\s+[a-zA-Z_0-9\.]*$/.test(linePrefix);
}

/** @param {vscode.ExtensionContext} context */
function activate(context) {
  // Start the Language Server
  const serverModule = context.asAbsolutePath('server/server.js');
  
  // The debug options for the server
  const debugOptions = { execArgv: ['--nolazy', '--inspect=6009'] };
  
  // If the extension is launched in debug mode then the debug server options are used
  // Otherwise the run options are used
  const serverOptions = {
    run: { module: serverModule, transport: TransportKind.ipc },
    debug: {
      module: serverModule,
      transport: TransportKind.ipc,
      options: debugOptions
    }
  };
  
  // Options to control the language client
  const clientOptions = {
    // Register the server for Neutron documents
    documentSelector: [{ scheme: 'file', language: 'neutron' }],
    synchronize: {
      // Notify the server about file changes to '.clientrc files contained in the workspace
      fileEvents: vscode.workspace.createFileSystemWatcher('**/.clientrc')
    }
  };
  
  // Create the language client and start the client.
  client = new LanguageClient(
    'neutronLanguageServer',
    'Neutron Language Server',
    serverOptions,
    clientOptions
  );
  
  // Start the client. This will also launch the server
  client.start();

  // Command: Run current Neutron file
  const runCmd = vscode.commands.registerCommand('neutron.runCurrentFile', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor. Open a Neutron file to run.');
      return;
    }
    const doc = editor.document;
    if (doc.languageId !== 'neutron') {
      vscode.window.showWarningMessage('Active file is not a Neutron (.nt) file.');
      return;
    }
    if (doc.isUntitled) {
      const didSave = await doc.save();
      if (!didSave) {
        vscode.window.showWarningMessage('Please save the file before running.');
        return;
      }
    } else if (doc.isDirty) {
      await doc.save();
    }

    let runtimePath;
    const isWindows = process.platform === 'win32';
    
    // Try to find the Neutron executable based on platform
    if (isWindows) {
      // On Windows, first try neutron.exe in the workspace root, then look for neutron in PATH
      const config = vscode.workspace.getConfiguration('neutron');
      const configuredPath = config.get('runtimePath');
      
      if (configuredPath) {
        runtimePath = configuredPath;
      } else {
        // Look for neutron.exe in the project root
        const path = require('path');
        const fs = require('fs');
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
        
        if (workspaceFolder) {
          const exePath = path.join(workspaceFolder.uri.fsPath, 'neutron.exe');
          if (fs.existsSync(exePath)) {
            runtimePath = `"${exePath.replace(/"/g, '\\\\\\"')}"`;
          } else {
            // Fallback to 'neutron' in PATH (for PowerShell)
            runtimePath = 'neutron';
          }
        } else {
          runtimePath = 'neutron';
        }
      }
    } else {
      // On Linux/Mac, first try ./neutron in the workspace root, then look for neutron in PATH
      const config = vscode.workspace.getConfiguration('neutron');
      const configuredPath = config.get('runtimePath');
      
      if (configuredPath) {
        runtimePath = configuredPath;
      } else {
        // Look for neutron in the project root
        const path = require('path');
        const fs = require('fs');
        const workspaceFolder = vscode.workspace.getWorkspaceFolder(doc.uri);
        
        if (workspaceFolder) {
          const localPath = path.join(workspaceFolder.uri.fsPath, 'neutron');
          if (fs.existsSync(localPath)) {
            runtimePath = `"${localPath.replace(/"/g, '\\\\\\"')}"`;
          } else {
            // Fallback to 'neutron' in PATH
            runtimePath = 'neutron';
          }
        } else {
          runtimePath = 'neutron';
        }
      }
    }

    const filePath = doc.fileName;

    // Quote the file path for shell safety
    const quoted = filePath.includes(' ') || filePath.includes('"')
      ? `"${filePath.replace(/"/g, '\\\\\\"')}"`
      : filePath;
    const command = `${runtimePath} ${quoted}`;

    // Reuse or create a terminal
    let term = vscode.window.terminals.find(t => t.name === 'Neutron');
    if (!term) {
      term = vscode.window.createTerminal({ name: 'Neutron' });
    }
    term.show(true);
    term.sendText(command, true);
  });

  const provider = {
    /** @returns {Thenable<vscode.CompletionItem[]>|vscode.CompletionItem[]} */
    provideCompletionItems: async (document, position) => {
      const text = document.getText();
      const line = document.lineAt(position).text;
      const prefix = line.substring(0, position.character);

      // Context-specific suggestions
      if (isInUsingString(prefix)) {
        return await suggestUsingFiles(prefix);
      }
      if (isInUse(prefix)) {
        return await suggestUseModules(prefix);
      }

      // Check if we're in a context where module functions should be suggested
      // Look for patterns like "moduleName."
      const dotMatch = prefix.match(/([a-zA-Z_][a-zA-Z0-9_]*)\.$/);
      if (dotMatch) {
        const moduleName = dotMatch[1];
        if (MODULE_FUNCTIONS[moduleName]) {
          // Return module-specific functions
          return MODULE_FUNCTIONS[moduleName].map(f => {
            const it = new vscode.CompletionItem(f.label, vscode.CompletionItemKind.Function);
            it.detail = f.detail;
            it.documentation = new vscode.MarkdownString(f.documentation);
            return it;
          });
        }
      }

      const out = [];
      // Keywords & types
      out.push(...makeKeywordItems());
      out.push(...makeTypeItems());
      // Built-in functions
      out.push(...makeBuiltinFunctionItems());
      // Document symbols
      for (const s of collectDocumentSymbols(text)) {
        const item = new vscode.CompletionItem(s.label, s.kind);
        if (s.detail) item.detail = s.detail;
        out.push(item);
      }
      return out;
    }
  };

  context.subscriptions.push(
    runCmd,
    vscode.languages.registerCompletionItemProvider({ language: 'neutron' }, provider, '.', '\'', '"', '_')
  );

  // CodeLens: Add a Run lens at the top of Neutron files
  const codeLensProvider = {
    provideCodeLenses(document) {
      if (document.languageId !== 'neutron') return [];
      const top = new vscode.Range(0, 0, 0, 0);
      const cmd = {
        title: '▶ Run',
        command: 'neutron.runCurrentFile',
        tooltip: 'Run this Neutron file'
      };
      return [new vscode.CodeLens(top, cmd)];
    }
  };
  context.subscriptions.push(
    vscode.languages.registerCodeLensProvider({ language: 'neutron' }, codeLensProvider)
  );

  // Status Bar: Run button, visible when a Neutron file is active
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBarItem.text = '$(play) Run Neutron';
  statusBarItem.command = 'neutron.runCurrentFile';
  context.subscriptions.push(statusBarItem);

  const updateStatusBar = () => {
    const ed = vscode.window.activeTextEditor;
    if ( ed && ed.document && ed.document.languageId === 'neutron') {
      statusBarItem.show();
    } else {
      statusBarItem.hide();
    }
  };
  updateStatusBar();
  context.subscriptions.push(vscode.window.onDidChangeActiveTextEditor(updateStatusBar));
}

function deactivate() {
  if (!client) {
    return undefined;
  }
  return client.stop();
}

module.exports = { activate, deactivate };