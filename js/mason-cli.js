#!/usr/bin/env node

import * as mason from "./mason.js"
import fs from "fs";

function usage() {
	console.log("Usage: mason-cli [--help] [file]")
}

let path = null;
for (const arg of process.argv.slice(2)) {
	if (arg == "--help") {
		usage();
		process.exit(0);
	} else if (arg.startsWith("-")) {
		console.log("Unknown option:", arg);
		usage();
		process.exit(1);
	} else if (path == null) {
		path = arg;
	} else {
		console.log("Unexpected parameter:", arg);
	}
}

function onContent(content) {
	console.log(JSON.stringify(mason.parse(content), null, 4));
}

if (path != null) {
	onContent(fs.readFileSync(path, "utf-8"));
} else {
	let content = Buffer.alloc(0);
	process.stdin.on("data", data => content = Buffer.concat([content, data]));
	process.stdin.on("end", () => onContent(content.toString("utf-8")));
}

