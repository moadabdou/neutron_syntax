/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */
'use strict';

const {
    createConnection,
    TextDocuments,
    Diagnostic,
    DiagnosticSeverity,
    ProposedFeatures,
    InitializeParams,
    TextDocumentSyncKind,
    Range,
    Position
} = require('vscode-languageserver/node');

const { TextDocument } = require('vscode-languageserver-textdocument');

const NeutronParser = require('./parser.js');
const TypeChecker = require('./typeChecker.js');

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents = new TextDocuments(TextDocument);

// For performance optimization, cache parsing results and implement debouncing
const parseCache = new Map(); // Cache parsed ASTs by document URI
const validationDelays = new Map(); // Track validation delays per document
const VALIDATION_DELAY_MS = 300; // Delay in ms before validating after changes

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let hasDiagnosticRelatedInformationCapability = false;

connection.onInitialize((params) => {
    const capabilities = params.capabilities;

    // Does the client support the `workspace/configuration` request?
    // If not, we will fall back using global settings
    hasConfigurationCapability = !!(
        capabilities.workspace && !!capabilities.workspace.configuration
    );
    hasWorkspaceFolderCapability = !!(
        capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );
    hasDiagnosticRelatedInformationCapability = !!(
        capabilities.textDocument &&
        capabilities.textDocument.publishDiagnostics &&
        capabilities.textDocument.publishDiagnostics.relatedInformation
    );

    const result = {
        capabilities: {
            textDocumentSync: TextDocumentSyncKind.Incremental
        }
    };
    if (hasWorkspaceFolderCapability) {
        result.capabilities.workspace = {
            workspaceFolders: {
                supported: true
            }
        };
    }
    return result;
});

connection.onInitialized(() => {
    if (hasConfigurationCapability) {
        // Register for all configuration changes.
        connection.client.register({
            method: 'workspace/didChangeConfiguration',
            registerOptions: {}
        });
    }
    if (hasWorkspaceFolderCapability) {
        connection.workspace.onDidChangeWorkspaceFolders(() => {
            connection.console.log('Workspace folder change event received.');
        });
    }
});

// The example settings
const defaultSettings = { maxNumberOfProblems: 1000 };
let globalSettings = defaultSettings;

// Cache the settings of all open documents
const documentSettings = new Map();

// Only keep settings for open documents
documents.onDidClose((e) => {
    documentSettings.delete(e.document.uri);
    // Clear any cached parsing results for this document
    parseCache.delete(e.document.uri);
    // Clear any pending validation delays
    if (validationDelays.has(e.document.uri)) {
        clearTimeout(validationDelays.get(e.document.uri));
        validationDelays.delete(e.document.uri);
    }
});

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent((change) => {
    // Implement debouncing to avoid validating on every keystroke
    const uri = change.document.uri;

    // Clear any existing timeout for this document
    if (validationDelays.has(uri)) {
        clearTimeout(validationDelays.get(uri));
    }

    // Set a new timeout
    const timeout = setTimeout(() => {
        validateTextDocument(change.document);
        validationDelays.delete(uri);
    }, VALIDATION_DELAY_MS);

    validationDelays.set(uri, timeout);
});

// Validate a Neutron text document and report type errors
async function validateTextDocument(textDocument) {
    // In this simple example we get the settings for every validate run.
    const settings = await getDocumentSettings(textDocument.uri);

    // Check if type checking is enabled
    if (settings && settings.neutron && settings.neutron.enableTypeChecking === false) {
        // If type checking is disabled, send empty diagnostics
        connection.sendDiagnostics({ uri: textDocument.uri, diagnostics: [] });
        return;
    }

    // The validator creates diagnostics for all uppercase words length 2 and more
    const text = textDocument.getText();
    const diagnostics = [];

    try {
        // Parse and validate the text for type mismatches
        const typeErrors = analyzeTypeSafety(text, textDocument);

        for (const error of typeErrors) {
            diagnostics.push({
                severity: DiagnosticSeverity.Error,
                range: error.range,
                message: error.message,
                source: 'Neutron Type Checker'
            });
        }
    } catch (e) {
        // If there's an unexpected error during validation, report it
        console.error("Validation error:", e);
        diagnostics.push({
            severity: DiagnosticSeverity.Error,
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 1 }
            },
            message: `Validation error: ${e.message}`,
            source: 'Neutron Type Checker'
        });
    }

    // Send the computed diagnostics to VSCode.
    connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Analyze the text for type safety and syntax errors with performance optimization
function analyzeTypeSafety(text, document) {
    const errors = [];
    const uri = document.uri;

    // Check if we have a cached result and the text hasn't changed significantly
    let result;
    if (parseCache.has(uri)) {
        const cached = parseCache.get(uri);
        if (cached.text === text) {
            // Text hasn't changed, reuse the cached AST
            result = cached.ast;
        } else {
            // Text has changed, re-parse and update cache
            const parser = new NeutronParser();
            result = parser.parse(text);
            parseCache.set(uri, { text, ast: result });
        }
    } else {
        // No cached result, parse and store in cache
        const parser = new NeutronParser();
        result = parser.parse(text);
        parseCache.set(uri, { text, ast: result });
    }

    // Add syntax errors (like missing semicolons) to the errors array
    if (result.errors) {
        for (const syntaxError of result.errors) {
            errors.push({
                range: {
                    start: getPositionFromIndex(document, syntaxError.start),
                    end: getPositionFromIndex(document, syntaxError.end)
                },
                message: syntaxError.message,
                severity: DiagnosticSeverity.Error
            });
        }
    }

    // Only perform type checking if we have a valid AST
    if (result && result.body) {
        // Perform type checking on the AST using the imported TypeChecker
        const typeChecker = new TypeChecker();
        typeChecker.check(result, document, errors);
    }

    return errors;
}

// Get document settings based on URI
function getDocumentSettings(resource) {
    if (!hasConfigurationCapability) {
        return Promise.resolve(globalSettings);
    }
    let result = documentSettings.get(resource);
    if (!result) {
        result = connection.workspace.getConfiguration({
            scopeUri: resource,
            section: 'neutron'
        });
        documentSettings.set(resource, result);
    }
    return result;
}

// Analyze the text for type safety and syntax errors
function analyzeTypeSafety(text, document) {
    const errors = [];
    
    try {
        const parser = new NeutronParser();
        const result = parser.parse(text);
        
        // Add syntax errors (like missing semicolons) to the errors array
        if (result.errors) {
            for (const syntaxError of result.errors) {
                errors.push({
                    range: {
                        start: getPositionFromIndex(document, syntaxError.start),
                        end: getPositionFromIndex(document, syntaxError.end)
                    },
                    message: syntaxError.message,
                    severity: DiagnosticSeverity.Error
                });
            }
        }
        
        // Only perform type checking if we have a valid AST
        if (result && result.body) {
            // Perform type checking on the AST using the imported TypeChecker
            const typeChecker = new TypeChecker();
            typeChecker.check(result, document, errors);
        }
    } catch (e) {
        // If parsing fails, we can't do type checking
        console.error("Parsing error:", e.message);
    }
    
    return errors;
}

// Helper function to convert character index to position
function getPositionFromIndex(document, index) {
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
    
    return Position.create(line, char);
}

connection.onDidChangeConfiguration((change) => {
    if (hasConfigurationCapability) {
        // Reset all cached document settings
        documentSettings.clear();
    } else {
        globalSettings = change.settings.neutron || defaultSettings;
    }

    // Revalidate all open documents
    documents.all().forEach(validateTextDocument);
});

// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();