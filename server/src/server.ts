import * as ws from "ws";
import * as http from "http";
import * as net from "net";
import express from "express";
import * as rpc from "@codingame/monaco-jsonrpc";
import { launch } from "./json-server-launcher";
import * as url from "url";
import { PythonShell } from "python-shell";
import * as fs from "fs";
import { Transform } from "stream";

process.on("uncaughtException", function (err: any) {
    console.error("Uncaught Exception: ", err.toString());
    if (err.stack) {
        console.error(err.stack);
    }
});

// create the express application
const app = express();
// server the static content, i.e. index.html
app.use(express.static(__dirname));
// start the server
const server = app.listen(3000);

// create the web socket
const wss = new ws.Server({
    noServer: true,
    perMessageDeflate: false,
});

const wss1 = new ws.Server({ noServer: true });
var pyshell: PythonShell;

wss1.on("connection", (ws: ws) => {
    ws.on("message", (message: string) => {
        const data = JSON.parse(message);

        if (data.type === "run") {
            try {
                fs.writeFileSync("main.py", data.code);
            } catch (err) {
                console.error("fs: ", err);
            }

            pyshell = new PythonShell(
                "main.py",
                {},
                new Transform({
                    transform(chunk, encoding, callback) {
                        callback(null, chunk.toString());
                    },
                })
            );

            pyshell.on("error", (err: any) => {
                console.error("error: ", err);
            });

            pyshell.on("pythonError", (err: any) => {
                let error = "";

                if (err.traceback && err.traceback !== "") {
                    error = err.traceback.replace(
                        `/Users/majeed/Documents/projects/monaco-languageclient/packages/examples/node/`,
                        ""
                    );
                } else {
                    error = err.message.replace(
                        `/Users/majeed/Documents/projects/monaco-languageclient/packages/examples/node/`,
                        ""
                    );
                }

                ws.send(JSON.stringify({ type: "stderr", message: error }));
            });

            pyshell.on("message", (message) => {
                ws.send(JSON.stringify({ type: "stdout", line: message }));
            });
        } else if (data.type === "stdin" && pyshell) {
            pyshell.send(data.code);
        }
    });
});

// This event is fired whenever our Express server—a plain HTTP server—receives a request for an endpoint using the websockets protocol. "Upgrade" here is saying, "we need to upgrade this request to handle websockets."
server.on(
    "upgrade",
    (request: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
        const pathname = request.url
            ? url.parse(request.url).pathname
            : undefined;

        if (pathname === "/sampleServer") {
            wss.handleUpgrade(request, socket, head, (webSocket) => {
                const socket: rpc.IWebSocket = {
                    send: (content) =>
                        webSocket.send(content, (error) => {
                            if (error) {
                                throw error;
                            }
                        }),
                    onMessage: (cb) => webSocket.on("message", cb),
                    onError: (cb) => webSocket.on("error", cb),
                    onClose: (cb) => webSocket.on("close", cb),
                    dispose: () => webSocket.close(),
                };
                // launch the server when the web socket is opened
                if (webSocket.readyState === webSocket.OPEN) {
                    launch(socket);
                } else {
                    webSocket.on("open", () => launch(socket));
                }
            });
        } else if (pathname === "/pythonShell") {
            wss.handleUpgrade(request, socket, head, (webSocket) => {
                wss1.emit("connection", webSocket);
            });
        }
    }
);
