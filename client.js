"use strict";
const fs = require("fs").promises;

const phin = require("phin");


var config;

async function sendData(data) {
    let response = await phin({
        url: `${config.url}/data`,
        method: "POST",
        headers: { "Authorization": config.token },
        core: { rejectUnauthorized: false, },
        data,
    });
    if (response.statusCode !== 200) {
        throw new Error(
            `Error ${response.statusCode}: ${response.body.toString()}`
        );
    }
}

async function client() {
    let content = await fs.readFile("client-config.json", "utf8");
    config = JSON.parse(content);
    await sendData({ "hello": "world" });
}

if (require.main === module) {
    client().catch(err => {
        console.error(err);
        process.exitCode = 1;
    });
}
