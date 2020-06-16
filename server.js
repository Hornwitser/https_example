"use strict";
const crypto = require("crypto");
const fs = require("fs").promises;
const https = require("https");
const util = require("util");

const jwt = require("jsonwebtoken");
const WebSocket = require("ws");


var config;
var secret;

const wss = new WebSocket.Server({ noServer: true });
wss.on("connection", function(ws, request) {
    console.log(`Received connection from ${request.socket.remoteAddress}`);

    ws.send(JSON.stringify({"hello": "from server"}));

    ws.on("message", function(msg) {
        let data = JSON.parse(msg);
        console.log(data);
    });

    ws.on("close", function(code, reason) {
        console.log(`Connection from ${request.socket.remoteAddress} closed`);
    });
});

function authenticate(request) {
    let token = request.headers["authorization"];
    if (!token) {
        return false;
    }

    try {
        jwt.verify(token, secret);

    } catch (err) {
        return false;
    }

    return true;
}


async function start() {
    try {
        let content = await fs.readFile("server-config.json", "utf8");
        config = JSON.parse(content);

    } catch (err) {
        if (err.code !== "ENOENT") {
            throw err;
        }

        let bytes = await util.promisify(crypto.randomBytes)(256);
        config = {
            secret: bytes.toString("base64"),
            key: "key.pem",
            cert: "cert.pem",
            port: 1234,
        }
        await fs.writeFile(
            "server-config.json", JSON.stringify(config, null, 4), "utf8"
        );

        let clientConfig = {
            url: "wss://localhost:1234",
            cert: "cert.pem",
            token: jwt.sign({}, bytes),
        };
        await fs.writeFile(
            "client-config.json", JSON.stringify(clientConfig, null, 4), "utf8"
        );
    }

    secret = Buffer.from(config.secret, "base64")
    let server = https.createServer({
        key: await fs.readFile(config.key),
        cert: await fs.readFile(config.cert),
    });

    server.on("upgrade", function(request, socket, head) {
        if (!authenticate(request)) {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, function done(ws) {
            wss.emit("connection", ws, request);
        });
    });

    await new Promise((resolve, reject) => {
        server.on("error", reject);
        server.listen(config.port, () => {
            server.off("error", reject);
            console.log(`listening on ${config.port}`);
            resolve();
        });
    });
}

if (require.main === module) {
    start().catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
}
