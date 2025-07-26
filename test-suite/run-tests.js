#!/usr/bin/env node

import * as mason from "../js/mason.js"
import fs from "fs";

let tests = 0;
let successes = 0;
function runJsonTests(dir) {
	for (const name of fs.readdirSync(dir)) {
		let expectSuccess;
		if (name.startsWith("y_")) {
			expectSuccess = true;
		} else if (name.startsWith("n_")) {
			expectSuccess = false;
		} else {
			console.log(`${dir}/${name}: Unknown file name prefix`);
			continue;
		}

		const content = fs.readFileSync(`${dir}/${name}`, "utf-8");
		let parseError = null;
		try {
			mason.parse(content);
		} catch (err) {
			parseError = err;
		}

		tests += 1;
		if (expectSuccess && parseError) {
			console.log(`${dir}/${name}: Expected success, but failed`);
			console.log(parseError.stack);
		} else if (!expectSuccess && !parseError) {
			console.log(`${dir}/${name}: Expected failure, but succeeded`);
		} else {
			successes += 1;
		}
	}
}

function transformBinaryStrings(obj) {
	if (obj instanceof Uint8Array) {
		return Buffer.from(obj).toString("base64");
	} else if (typeof obj == "object") {
		for (const i in obj) {
			if (!obj.hasOwnProperty(i)) {
				continue;
			}

			obj[i] = transformBinaryStrings(obj[i]);
		}
		return obj;
	} else {
		return obj;
	}
}

function runMasonTransformTest(dir, masonName) {
	let jsonName = masonName.replace(/\.mason$/, ".json");

	const masonContent = fs.readFileSync(`${dir}/${masonName}`, "utf-8");
	const jsonContent = fs.readFileSync(`${dir}/${jsonName}`, "utf-8").trim();

	tests += 1;
	let transformedContent;
	try {
		const obj = transformBinaryStrings(mason.parse(masonContent))
		transformedContent = JSON.stringify(obj);
	} catch (err) {
		console.log(`${dir}/${masonName}: Expected success, but failed`);
		console.log(err.stack);
		return;
	}

	if (transformedContent != jsonContent.trim()) {
		console.log(`${dir}/${masonName}: JSON transform failure`);
		console.log("Expected:", jsonContent);
		console.log("Got:     ", transformedContent);
		return;
	}

	successes += 1;
}

function runMasonTests(dir) {
	for (const name of fs.readdirSync(dir)) {
		if (name.endsWith(".json")) {
			continue;
		}

		if (name.startsWith("y_")) {
			runMasonTransformTest(dir, name);
			continue;
		} else if (!name.startsWith("n_")) {
			console.log(`${dir}/${name}: Unknown file name prefix`);
			continue;
		}

		const content = fs.readFileSync(`${dir}/${name}`, "utf-8");
		tests += 1;
		try {
			mason.parse(content);
			console.log(`${dir}/${name}: Expected failure, but succeeded`);
		} catch {
			successes += 1;
		}
	}
}

runJsonTests("json-suite");
runJsonTests("alt-json-suite");
runMasonTests("mason-suite");
console.log(`${successes}/${tests} tests succeeded.`);
if (successes != tests) {
	process.exit(1);
}
