"use strict";
const fs = require("fs").promises;

const WebSocket = require("ws");


var config;

async function client() {
    let content = await fs.readFile("client-config.json", "utf8");
    config = JSON.parse(content);
    let cert = config.cert ? await fs.readFile(config.cert) : null;

    let options = {
        headers: { "Authorization": config.token },
    }
    if (cert) {
        options.ca = cert;
    }
    if (/(\d+\.){3}\d+/.test(new URL(config.url).hostname)) {
        // Overzealous ws lib adds SNI for IP hosts.
        options.servername = "";
    }

    let ws = new WebSocket(config.url, options);
    ws.on("open", function() {
        ws.send(JSON.stringify({ "hello": "from client" }));
    });

    ws.on("message", function(msg) {
        let data = JSON.parse(msg);
        console.log(data);
    });

    ws.on("close", function() {
        console.log("Connection lost");
    });
}

if (require.main === module) {
    client().catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
}
