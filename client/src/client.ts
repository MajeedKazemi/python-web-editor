import "monaco-editor/esm/vs/editor/editor.all.js";

// support all editor features
import "monaco-editor/esm/vs/editor/standalone/browser/accessibilityHelp/accessibilityHelp.js";
import "monaco-editor/esm/vs/editor/standalone/browser/inspectTokens/inspectTokens.js";
import "monaco-editor/esm/vs/editor/standalone/browser/iPadShowKeyboard/iPadShowKeyboard.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneHelpQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoLineQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneGotoSymbolQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickAccess/standaloneCommandsQuickAccess.js";
import "monaco-editor/esm/vs/editor/standalone/browser/quickInput/standaloneQuickInputService.js";
import "monaco-editor/esm/vs/editor/standalone/browser/referenceSearch/standaloneReferenceSearch.js";
import "monaco-editor/esm/vs/editor/standalone/browser/toggleHighContrast/toggleHighContrast.js";
import "monaco-editor/esm/vs/basic-languages/python/python.contribution.js";

import * as monaco from "monaco-editor";

import { buildWorkerDefinition } from "monaco-editor-workers";
buildWorkerDefinition("dist", new URL("", window.location.href).href, false);

import {
    MonacoLanguageClient,
    CloseAction,
    ErrorAction,
    MonacoServices,
    MessageTransports,
} from "monaco-languageclient";
import {
    toSocket,
    WebSocketMessageReader,
    WebSocketMessageWriter,
} from "@codingame/monaco-jsonrpc";
import normalizeUrl from "normalize-url";

// register Monaco languages
monaco.languages.register({
    id: "python",
    extensions: [".py"],
    aliases: ["Python", "py"],
    firstLine: "^#!/.*\\bpython[0-9.-]*\\b",
    mimetypes: ["application/text"],
});

monaco.languages.setMonarchTokensProvider("python", {
    defaultToken: "",
    tokenPostfix: ".python",

    keywords: [
        "and",
        "as",
        "assert",
        "break",
        "class",
        "continue",
        "def",
        "del",
        "elif",
        "else",
        "except",
        "exec",
        "finally",
        "for",
        "from",
        "global",
        "if",
        "import",
        "in",
        "is",
        "lambda",
        "None",
        "not",
        "or",
        "pass",
        "print",
        "raise",
        "return",
        "self",
        "try",
        "while",
        "with",
        "yield",

        "int",
        "float",
        "long",
        "complex",
        "hex",

        "abs",
        "all",
        "any",
        "apply",
        "basestring",
        "bin",
        "bool",
        "buffer",
        "bytearray",
        "callable",
        "chr",
        "classmethod",
        "cmp",
        "coerce",
        "compile",
        "complex",
        "delattr",
        "dict",
        "dir",
        "divmod",
        "enumerate",
        "eval",
        "execfile",
        "file",
        "filter",
        "format",
        "frozenset",
        "getattr",
        "globals",
        "hasattr",
        "hash",
        "help",
        "id",
        "input",
        "intern",
        "isinstance",
        "issubclass",
        "iter",
        "len",
        "locals",
        "list",
        "map",
        "max",
        "memoryview",
        "min",
        "next",
        "object",
        "oct",
        "open",
        "ord",
        "pow",
        "print",
        "property",
        "reversed",
        "range",
        "raw_input",
        "reduce",
        "reload",
        "repr",
        "reversed",
        "round",
        "set",
        "setattr",
        "slice",
        "sorted",
        "staticmethod",
        "str",
        "sum",
        "super",
        "tuple",
        "type",
        "unichr",
        "unicode",
        "vars",
        "xrange",
        "zip",

        "True",
        "False",

        "__dict__",
        "__methods__",
        "__members__",
        "__class__",
        "__bases__",
        "__name__",
        "__mro__",
        "__subclasses__",
        "__init__",
        "__import__",
    ],

    escapes:
        /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

    brackets: [
        { open: "{", close: "}", token: "delimiter.curly" },
        { open: "[", close: "]", token: "delimiter.bracket" },
        { open: "(", close: ")", token: "delimiter.parenthesis" },
    ],

    tokenizer: {
        root: [
            { include: "@whitespace" },
            { include: "@numbers" },
            { include: "@strings" },

            [/[,:;]/, "delimiter"],
            [/[{}\[\]()]/, "@brackets"],

            [/@[a-zA-Z]\w*/, "tag"],
            [
                /[a-zA-Z]\w*/,
                {
                    cases: {
                        "@keywords": "keyword",
                        "@default": "identifier",
                    },
                },
            ],
        ],

        // Deal with white space, including single and multi-line comments
        whitespace: [
            [/\s+/, "white"],
            [/(^#.*$)/, "comment"],
            [/('''.*''')|(""".*""")/, "string"],
            [/'''.*$/, "string", "@endDocString"],
            [/""".*$/, "string", "@endDblDocString"],
        ],
        endDocString: [
            [/\\'/, "string"],
            [/.*'''/, "string", "@popall"],
            [/.*$/, "string"],
        ],
        endDblDocString: [
            [/\\"/, "string"],
            [/.*"""/, "string", "@popall"],
            [/.*$/, "string"],
        ],

        // Recognize hex, negatives, decimals, imaginaries, longs, and scientific notation
        numbers: [
            [/-?0x([abcdef]|[ABCDEF]|\d)+[lL]?/, "number.hex"],
            [/-?(\d*\.)?\d+([eE][+\-]?\d+)?[jJ]?[lL]?/, "number"],
        ],

        // Recognize strings, including those broken across lines with \ (but not without)
        strings: [
            [/'$/, "string.escape", "@popall"],
            [/'/, "string.escape", "@stringBody"],
            [/"/, "string", "@string_double"],
            [/"/, "string.escape", "@dblStringBody"],
            [/f'/, "string", "@string_backtick"],
        ],
        stringBody: [
            [/[^\\']+$/, "string", "@popall"],
            [/[^\\']+/, "string"],
            [/\\./, "string"],
            [/'/, "string.escape", "@popall"],
            [/\\$/, "string"],
        ],
        dblStringBody: [
            [/[^\\"]+$/, "string", "@popall"],
            [/[^\\"]+/, "string"],
            [/\\./, "string"],
            [/"/, "string.escape", "@popall"],
            [/\\$/, "string"],
        ],

        string_double: [
            [/[^\\"]+/, "string"],
            [/\\./, "string.escape.invalid"],
            [/"/, "string", "@pop"],
        ],

        string_backtick: [
            [/\{/, { token: "delimiter.curly", next: "@bracketCounting" }],
            [/[^\\']/, "string"],
            [/@escapes/, "string.escape"],
            [/\\./, "string.escape.invalid"],
            [/'/, "string", "@pop"],
        ],

        bracketCounting: [
            [/\{/, "delimiter.curly", "@bracketCounting"],
            [/\}/, "delimiter.curly", "@pop"],
            { include: "root" },
        ],
    },
});

const editor = monaco.editor.create(document.getElementById("container")!, {
    value: 'x = input("Enter a number: ")\nprint(x)',
    language: "python",
    minimap: { enabled: false },
    fontSize: 18,
    lineHeight: 30,
});

// install Monaco language client services
MonacoServices.install(monaco);

// create the web socket
const url = createUrl("localhost", 3000, "/sampleServer");

const urlPythonShell = createUrl("localhost", 3000, "/pythonShell");

const webSocketPythonShell = new WebSocket(urlPythonShell);

webSocketPythonShell.onmessage = (message) => {
    const consoleOut = document.getElementById("console-out");

    if (consoleOut) {
        // parse message -> show in console

        const data = JSON.parse(message.data);
        console.log("message: ", data);

        if (data.type === "stdout") {
            consoleOut.innerHTML += data.line + "<br/>";
        }

        if (data.type === "stderr") {
            const err = document.createElement("p");
            err.innerHTML = data.message;
            consoleOut.innerHTML += err.innerHTML + "<br/>";
        }
    }
};

webSocketPythonShell.onopen = () => {
    console.log("[client] connected to Python shell");

    document.getElementById("run-btn")?.addEventListener("click", () => {
        webSocketPythonShell.send(
            JSON.stringify({ type: "run", code: editor.getValue() })
        );
    });

    document.getElementById("send-console")?.addEventListener("click", () => {
        const consoleIn = document.getElementById("console-in") as any;

        if (consoleIn) {
            console.log("consoleIn.nodeValue: ", consoleIn.value);

            webSocketPythonShell.send(
                JSON.stringify({
                    type: "stdin",
                    code: (consoleIn as any).value,
                })
            );
        }
    });
};

const webSocket = new WebSocket(url);

webSocket.onopen = () => {
    const socket = toSocket(webSocket);
    const reader = new WebSocketMessageReader(socket);
    const writer = new WebSocketMessageWriter(socket);
    const languageClient = createLanguageClient({
        reader,
        writer,
    });
    languageClient.start();
    reader.onClose(() => languageClient.stop());
};

function createLanguageClient(
    transports: MessageTransports
): MonacoLanguageClient {
    return new MonacoLanguageClient({
        name: "Sample Language Client",
        clientOptions: {
            // use a language id as a document selector
            documentSelector: ["python"],
            // disable the default error handler
            errorHandler: {
                error: () => ({ action: ErrorAction.Continue }),
                closed: () => ({ action: CloseAction.DoNotRestart }),
            },
        },
        // create a language client connection from the JSON RPC connection on demand
        connectionProvider: {
            get: () => {
                return Promise.resolve(transports);
            },
        },
    });
}

function createUrl(hostname: string, port: number, path: string): string {
    const protocol = location.protocol === "https:" ? "wss" : "ws";
    return normalizeUrl(`${protocol}://${hostname}:${port}${path}`);
}
