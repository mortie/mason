#!/usr/bin/env node

import { spawn } from "child_process";
import fs from "fs";

if (process.argv.length < 3) {
	console.log("Usage: run-tests.js <parser command...>");
	process.exit(1);
}
const argv = process.argv.slice(2);
const cmd = argv[0];
const params = argv.slice(1);
params.push("<file>");
let tests = 0;
let successes = 0;

function runMasonParser(path) {
	return new Promise((resolve, reject) => {
		params[params.length - 1] = path;
		const child = spawn(cmd, params);

		const stdouts = [];
		const stderrs = [];
		child.stdout.on("data", d => stdouts.push(d));
		child.stderr.on("data", d => stderrs.push(d));
		child.on("exit", (code, status) => {
			const stdout = Buffer.concat(stdouts).toString("utf-8");
			const stderr = Buffer.concat(stderrs).toString("utf-8");
			if (status != null) {
				reject(new Error(`Exited with status ${status}, stderr:\n${stderr}`));
				return;
			}

			if (code != 0) {
				reject(new Error(`Exited with code ${code}, stderr:\n${stderr}`));
				return;
			}

			try {
				resolve(JSON.parse(stdout));
			} catch (err) {
				reject(new Error(`Invalid JSON; stderr:\n${stderr}`));
			}
		});
	});
}

function deepEqual(a, b) {
	const ta = typeof a;
	const tb = typeof b;
	if (ta != tb) {
		return false;
	}

	if (ta == "string" || ta == "boolean" || ta == "number" || a == null || b == null) {
		return a == b;
	}

	if (a instanceof Array) {
		if (!b instanceof Array) {
			return false;
		}

		if (a.length != b.length) {
			return false;
		}

		for (let i = 0; i < a.length; ++i) {
			if (!deepEqual(a[i], b[i])) {
				return false;
			}
		}

		return true;
	}

	const keys = new Set();
	for (const i in a) {
		if (!a.hasOwnProperty(i)) {
			continue;
		}

		if (!b.hasOwnProperty(i)) {
			return false;
		}

		if (!deepEqual(a[i], b[i])) {
			return false;
		}

		keys.add(i);
	}

	for (const i in b) {
		if (!b.hasOwnProperty(i)) {
			continue;
		}

		if (!keys.has(i)) {
			return false;
		}
	}

	return true;
}

async function runJsonTests(dir) {
	const promises = [];
	const promiseMap = new Map();
	let count = 0;

	async function run(name) {
		let expectSuccess;
		if (name.startsWith("y_")) {
			expectSuccess = true;
		} else if (name.startsWith("n_")) {
			expectSuccess = false;
		} else {
			console.log(`${dir}/${name}: Unknown file name prefix`);
		}

		tests += 1;
		process.stderr.write(`\r[${tests}] `);

		let parseError = null;
		try {
			await runMasonParser(`${dir}/${name}`);
		} catch (err) {
			parseError = err;
		}

		if (expectSuccess && parseError) {
			console.log(`${dir}/${name}: Expected success, but failed`);
			console.log(parseError.stack);
		} else if (!expectSuccess && !parseError) {
			console.log(`${dir}/${name}: Expected failure, but succeeded`);
		} else {
			successes += 1;
		}

		return name;
	}

	for (const name of fs.readdirSync(dir)) {
		if (count >= 10) {
			const res = await Promise.any(promises);
			promises.splice(promises.indexOf(promiseMap.get(res)), 1);
			promiseMap.delete(res);
			count -= 1;
		}

		count += 1;
		const promise = run(name);
		promises.push(promise);
		promiseMap.set(name, promise);
	}
}

async function runMasonTransformTest(dir, masonName) {
	let jsonName = masonName.replace(/\.mason$/, ".json");
	const jsonContent = fs.readFileSync(`${dir}/${jsonName}`, "utf-8").trim();
	const jsonObj = JSON.parse(jsonContent);

	let masonObj;
	try {
		masonObj = await runMasonParser(`${dir}/${masonName}`);
	} catch (err) {
		console.log(`${dir}/${masonName}: Expected success, but failed`);
		console.log(err);
		return;
	}

	if (!deepEqual(masonObj, jsonObj)) {
		console.log(`${dir}/${masonName}: JSON transform failure`);
		console.log("Expected:", jsonContent);
		console.log("Got:     ", JSON.stringify(masonObj));
		return;
	}

	successes += 1;
}

async function runMasonTests(dir) {
	for (const name of fs.readdirSync(dir)) {
		if (name.endsWith(".json")) {
			continue;
		}

		if (!name.startsWith("n_") && !name.startsWith("y_")) {
			console.log(`${dir}/${name}: Unknown file name prefix`);
			continue;
		}

		tests += 1;
		process.stderr.write(`\r[${tests}] `);

		if (name.startsWith("y_")) {
			await runMasonTransformTest(dir, name);
			continue;
		}

		try {
			await runMasonParser(`${dir}/${name}`);
			console.log(`${dir}/${name}: Expected failure, but succeeded`);
		} catch {
			successes += 1;
		}
	}
}

async function runTests() {
	await runJsonTests("json-suite");
	await runJsonTests("alt-json-suite");
	await runMasonTests("mason-suite");

	console.log(`${successes}/${tests} tests succeeded.`);
	if (successes != tests) {
		process.exit(1);
	}
}
runTests();
