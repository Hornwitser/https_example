"use strict";
const crypto = require("crypto");
const fs = require("fs").promises;
const https = require("https");
const util = require("util");

const jwt = require("jsonwebtoken");
const express = require("express");


var config;
var secret;

const app = express();
app.use(function(req, res, next) {
    let token = req.header("Authorization");
    if (!token) {
        res.sendStatus(401);
        return;
    }

    try {
        jwt.verify(token, secret);

    } catch (err) {
        res.sendStatus(401);
        return;
    }

    next();
});
app.use(express.json());


app.post("/data", function(req, res) {
    console.log(req.body);
    res.sendStatus(200);
});


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
            url: "https://localhost:1234",
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
    }, app);

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
