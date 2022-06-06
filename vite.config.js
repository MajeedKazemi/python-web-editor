"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const vite_1 = require("vite");
const path_1 = tslib_1.__importDefault(require("path"));
exports.default = (0, vite_1.defineConfig)({
    resolve: {
        alias: [
            {
                find: 'vscode',
                replacement: path_1.default.resolve(__dirname, './node_modules/monaco-languageclient/lib/vscode-compatibility')
            }
        ]
    },
    optimizeDeps: {
        // we need this as it is locally referenced/linked by the examples
        // if it is regular dependency resolved from npmjs this is not required
        include: ['monaco-languageclient']
    },
    build: {
        rollupOptions: {
            input: {
                client: path_1.default.resolve(__dirname, '/packages/examples/client/index.html'),
                browser: path_1.default.resolve(__dirname, '/packages/examples/browser/index.html')
            }
        },
        commonjsOptions: {
            include: [/monaco-languageclient/, /node_modules/]
        }
    },
    server: {
        port: 8080
    }
});
//# sourceMappingURL=vite.config.js.map