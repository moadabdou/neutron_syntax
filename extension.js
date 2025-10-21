// Neutron completion provider
// Provides suggestions for keywords, types, built-in functions, built-in modules after `use`,
// file paths after `using`, and symbols (vars/classes/functions) found in the current document.

const vscode = require('vscode');

const KEYWORDS = [
  'var','if','else','while','for','return','break','continue','class','fun','this','and','or','not','in','new',
  'match','case','default','use','using'
];

const TYPE_KEYWORDS = ['int','float','string','bool','array','object','any'];

const BUILTIN_MODULES = ['sys','json','math','convert','time','http'];

const BUILTIN_FUNCTIONS = [
  {
    label: 'say',
    detail: 'say(value) → void',
    documentation: 'Prints a value to the console followed by a newline.'
  },
  {
    label: 'str',
    detail: 'str(number) → string',
    documentation: 'Converts a number to a string.'
  },
  {
    label: 'int',
    detail: 'int(string) → number',
    documentation: 'Converts a string to an integer.'
  },
  {
    label: 'int_to_bin',
    detail: 'int_to_bin(number) → string',
    documentation: 'Converts an integer to a binary string.'
  },
  {
    label: 'bin_to_int',
    detail: 'bin_to_int(string) → number',
    documentation: 'Converts a binary string to an integer.'
  },
  {
    label: 'char_to_int',
    detail: 'char_to_int(string) → number',
    documentation: 'Converts a single-character string to its ASCII value.'
  },
  {
    label: 'int_to_char',
    detail: 'int_to_char(number) → string',
    documentation: 'Converts an ASCII code (number) to a single-character string.'
  },
  {
    label: 'string_length',
    detail: 'string_length(string) → number',
    documentation: 'Returns the length of the string.'
  },
  {
    label: 'string_get_char_at',
    detail: 'string_get_char_at(string, index) → string',
    documentation: 'Returns the character at the given index.'
  }
];

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
  return BUILTIN_FUNCTIONS.map(f => {
    const it = new vscode.CompletionItem(f.label, vscode.CompletionItemKind.Function);
    it.detail = f.detail;
    it.documentation = new vscode.MarkdownString(f.documentation);
    return it;
  });
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
  // Optionally, suggest .nt files (basename) from workspace as modules, too
  try {
    const uris = await vscode.workspace.findFiles('**/*.nt', '**/node_modules/**', 200);
    const names = new Set();
    for (const uri of uris) {
      let base = uri.path.split('/').pop() || '';
      if (!base.toLowerCase().endsWith('.nt')) continue;
      base = base.slice(0, -3);
      if (!BUILTIN_MODULES.includes(base) && !names.has(base)) {
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

    const config = vscode.workspace.getConfiguration('neutron');
    const runtimePath = config.get('runtimePath') || 'neutron';
    const filePath = doc.fileName;

    // Quote the file path for shell safety
    const quoted = filePath.includes(' ') || filePath.includes('"')
      ? `"${filePath.replace(/"/g, '\\"')}"`
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
        title: 'Run Neutron',
        command: 'neutron.runCurrentFile'
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

function deactivate() {}

module.exports = { activate, deactivate };
