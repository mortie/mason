class Reader {
	/**
	 * @param {string} str
	 */
	constructor(str) {
		this.str = str;
		this.index = 0;
	}

	/**
	 * @returns string|null
	 */
	peek() {
		if (this.index >= this.str.length) {
			return null;
		}
		return this.str[this.index];
	}

	/**
	 * @returns string|null
	 */
	peek2() {
		if (this.index + 1 >= this.str.length) {
			return null;
		}
		return this.str[this.index + 1];
	}

	/**
	 * @param {RegExp} rx
	 */
	skipRx(rx) {
		this.expectRx(rx);
		this.consume();
	}

	/**
	 * @param {string} expected
	 */
	skipCh(expected) {
		this.expectCh(expected);
		this.consume();
	}

	/**
	 * @param {RegExp} rx
	 * @returns boolean
	 */
	peekMatches(rx) {
		let ch = this.peek();
		if (!ch) {
			return false;
		}

		return rx.test(ch);
	}

	/**
	 * @param {RegExp} rx
	 */
	expectRx(rx) {
		let ch = this.peek();
		if (!ch) {
			this.err("Got unexpected EOF, expected: " + rx);
		}

		if (!rx.test(ch)) {
			this.err("Got unexpected '" + ch + "', expected: " + rx);
		}
	}

	/**
	 * @param {string} expected
	 */
	expectCh(expected) {
		let ch = this.peek();
		if (!ch) {
			this.err("Got unexpected EOF, expected: " + expected);
		}

		if (ch != expected) {
			this.err("Got unexpected '" + ch + "', expected: " + expected);
		}
	}

	/**
	 * @param {string} msg
	 */
	err(msg) {
		throw new Error("Parse error at " + this.index + ": " + msg);
	}

	consume() {
		this.index += 1;
	}

	get() {
		let ch = this.peek();
		this.index += 1;
		return ch;
	}
}

/**
 * Skip whitespace and comments.
 * @param {Reader} r
 */
function skipWhitespace(r) {
	while (true) {
		let ch = r.peek();
		if (ch == ' ' || ch == '\r' || ch == '\n' || ch == '\t') {
			r.consume();
			continue;
		}

		if (ch == '/' && r.peek2() == '/') {
			r.consume();
			r.consume();
			while (true) {
				ch = r.get();
				if (ch == '\n' || ch == null) {
					break;
				}
			}
			continue;
		}

		break;
	}
}

/**
 * Skip space and tab characters..
 * @param {Reader} r
 */
function skipSpace(r) {
	while (true) {
		let ch = r.peek();
		if (ch == ' ' || ch == '\t') {
			r.consume();
			continue;
		}

		break;
	}
}

/**
 * Skip separator.
 * @param {Reader} r
 * @returns boolean Whether a separator was found or not
 */
function skipSep(r) {
	skipSpace(r);
	let ch = r.peek();

	if (ch == ',') {
		r.consume();
		skipWhitespace(r);
		return true;
	}

	if (ch == '\n') {
		r.consume();
		skipWhitespace(r);
		return true;
	}

	if (ch == '\r' && r.peek2() == '\n') {
		r.consume();
		r.consume();
		skipWhitespace(r);
		return true;
	}

	return false;
}


/**
 * Read N hex digits.
 * @param {Reader} r
 * @param {number} n
 * @returns number
 */
function parseHex(r, n) {
	let num = 0;
	while (n > 0) {
		let ch = r.peek();
		if (ch == null) {
			r.err("Unexpected EOF");
		}

		num *= 16;
		num += parseInt(ch, 16);
		if (isNaN(num)) {
			r.err("Invalid hex character");
		}
		r.consume();

		n -= 1;
	}

	console.log("Parsed hex:", num);
	return num;
}

/**
 * Identifier: [a-zA-Z_][a-zA-Z0-9_]
 * @param {Reader} r
 * @returns string
 */
function parseIdentifier(r) {
	let ident = "";
	r.expectRx(/[a-zA-Z_]/);

	do {
		ident += r.get();
	} while (r.peekMatches(/[a-zA-Z0-9_]/));
	return ident;
}

/**
 * Parse a single character string escape
 * @param {string} ch
 * @returns string|null
 */
function parseStringEscapeChar(ch) {
	if (ch == '"') {
		return '"';
	} else if (ch == '\\') {
		return '\\';
	} else if (ch == 'b') {
		return '\b';
	} else if (ch == 'f') {
		return '\f';
	} else if (ch == 'n') {
		return '\n';
	} else if (ch == 'r') {
		return '\r';
	} else if (ch == 't') {
		return '\t';
	}

	return null;
}

/**
 * Parse escape sequence after introducer backslash
 * @param {Reader} r
 * @returns string
 */
function parseStringEscape(r) {
	let ch = r.get();
	if (ch == null) {
		r.err("Unexpected EOF");
	}

	let esc = parseStringEscapeChar(ch);
	if (esc != null) {
		return esc;
	}

	if (ch == '"') {
		return '"';
	} else if (ch == '\\') {
		return '\\';
	} else if (ch == 'b') {
		return '\b';
	} else if (ch == 'f') {
		return '\f';
	} else if (ch == 'n') {
		return '\n';
	} else if (ch == 'r') {
		return '\r';
	} else if (ch == 't') {
		return '\t';
	}

	if (ch == 'x') {
		let num = parseHex(r, 2);
		if (num > 127) {
			r.err("'\\x' escapes can only be used for 7-bit ASCII characters");
		}

		return String.fromCodePoint(num);
	}

	if (ch == 'u') {
		return String.fromCodePoint(parseHex(r, 4));
	}

	if (ch == 'U') {
		return String.fromCodePoint(parseHex(r, 6));
	}

	r.err("Unknown escape character: '" + ch + "'");
}

/**
 * String: '"' string-char* '"'
 * @param {Reader} r
 * @returns string
 */
function parseString(r) {
	let str = "";
	r.skipCh('"');
	while (true) {
		let ch = r.get();
		if (ch == null) {
			r.err("Unexpected EOF");
		}

		if (ch == '"') {
			return str;
		}

		if (ch == '\\') {
			str += parseStringEscape(r);
			continue;
		}

		str += ch;
	}
}

/**
 * Binary String: 'b"' bstring-char* '"'
 * @param {Reader} r
 * @returns Uint8Array
 */
function parseBinaryString(r) {
	let arr = [];
	r.skipCh('b');
	r.skipCh('"');

	while (true) {
		let ch = r.get();
		if (ch == null) {
			r.err("Unexpected EOF");
		}

		if (ch == '"') {
			break;
		}

		if (ch == '\\') {
			ch = r.get();
			if (ch == null) {
				r.err("Unexpected EOF");
			}

			let esc = parseStringEscapeChar(ch);
			if (esc != null) {
				arr.push(esc.codePointAt(0));
			} else if (ch == 'x') {
				arr.push(parseHex(r, 2));
			} else {
				r.err("Unknown escape character: '" + ch + "'");
			}

			continue;
		}

		let point = ch.codePointAt(0);
		if (point > 127) {
			r.err("Binary strings can only contain ASCII literals, got: '" + ch + "'");
		}
		arr.push(point);
	}

	return new Uint8Array(arr);
}

/**
 * Raw String: 'r' hashes '"' rstring-char* '"' hashes
 * @param {Reader} r
 * @returns string
 */
function parseRawString(r) {
	let str = "";
	r.skipCh('r');

	let hashes = 0;
	while (r.peek() == "#") {
		hashes += 1;
		r.consume();
	}
	r.skipCh('"');

	let hashState = -1;
	while (true) {
		let ch = r.get();
		if (ch == null) {
			r.err("Unexpected EOF");
		}

		str += ch;
		if (ch == '"') {
			hashState = 0;
		} else if (ch == '#' && hashState >= 0) {
			hashState += 1;
		} else {
			hashState = -1;
		}

		if (hashState == hashes) {
			return str.slice(0, str.length - hashes - 1);
		}
	}
}

/**
 * @param {Reader} r
 * @param {string} ch
 * @returns number
 */
function charValue(r, ch) {
	const code = ch.charCodeAt(0);
	const zero = '0'.charCodeAt(0);
	const nine = '9'.charCodeAt(0);
	if (code >= zero && code <= nine) {
		return code - zero;
	}

	const a = 'a'.charCodeAt(0);
	const f = 'f'.charCodeAt(0);
	if (code >= a && code <= f) {
		return code - a + 10;
	}

	const A = 'A'.charCodeAt(0);
	const F = 'F'.charCodeAt(0);
	if (code >= A && code <= F) {
		return code - A + 10;
	}

	r.err("Invalid digit: '" + ch + "'");
}

/*
 * @param {Reader} r
 * @param {number} radix
 * @returns number
 */
function parseInteger(r, radix) {
	r.expectRx(/[0-9a-fA-F]/);
	let num = 0;
	while (true) {
		let ch = r.peek();
		if (ch == null) {
			return num;
		}

		if (ch == '\'') {
			r.consume();
			continue;
		}

		if (!/[0-9a-zA-Z]/.test(ch)) {
			return num;
		}

		let v = charValue(r, ch);
		if (v >= radix) {
			return num;
		}

		num *= radix;
		num += charValue(r, ch);
		r.consume();
	}
}

/**
 * @param {Reader} r
 * @returns number
 */
function parseNumber(r) {
	let sign = '';
	let ch = r.peek();
	if (ch == '-') {
		sign = '-';
		r.consume();
		ch = r.peek();
	} else if (ch == '+') {
		r.consume();
		ch = r.peek();
	}

	let radix = 10;
	if (ch == '0') {
		let ch2 = r.peek2();
		if (ch2 == 'x') {
			radix = 16;
			r.consume();
			r.consume();
			ch = r.peek();
		} else if (ch2 == 'o') {
			radix = 8;
			r.consume();
			r.consume();
			ch = r.peek();
		} else if (ch2 == 'b') {
			radix = 2;
			r.consume();
			r.consume();
			ch = r.peek();
		}
	}

	let integral = 0;
	if (ch != '.') {
		integral = parseInteger(r, radix);
		ch = r.peek();
	}

	let fractional = 0;
	if (ch == '.') {
		r.consume();
		fractional = parseInteger(r, radix);
		ch = r.peek();
	}

	let exponent = 0;
	if (radix == 10 && (ch == 'e' || ch == 'E')) {
		r.consume();
		ch = r.peek();
		let exponentSign = 1;
		if (ch == '-') {
			exponentSign = -1;
			r.consume();
			ch = r.peek();
		} else if (ch == '+') {
			r.consume();
			ch = r.peek();
		}

		exponent = parseInteger(r, radix);
		if (exponentSign < 0) {
			exponent = -exponent;
		}
	}

	// Parsing floats in a way which can be round-tripped is terribly difficult.
	// Therefore, we just produce a normalized string
	// which is compatible with parseFloat,
	// and use parseFloat to do the actual float parsing.
	let normalizedString = `${sign}${integral}.${fractional}e${exponent}`;
	return parseFloat(normalizedString);
}

/**
 * Key: Identifier | String
 * @param {Reader} r
 * @returns string
 */
function parseKey(r) {
	if (r.peek() == '"') {
		return parseString(r);
	} else {
		return parseIdentifier(r);
	}
}

/**
 * @param {Reader} r
 * @returns object
 */
function parseKeyValuePairs(r) {
	let obj = {};
	while (true) {
		let key = parseKey(r);
		if (obj.hasOwnProperty(key)) {
			r.err("Duplicate key: '" + key + "'");
		}

		skipWhitespace(r);
		r.skipCh(':');
		skipWhitespace(r);
		let val = parseMasonValue(r);
		obj[key] = val;

		let hasSep = skipSep(r);
		let ch = r.peek();
		if (ch == '}' || ch == null) {
			return obj;
		}

		if (!hasSep) {
			r.err("Expected separator, '}' or EOF, got: '" + ch + "'");
		}
	}
}

/**
 * @param {Reader} r
 * @returns object
 */
function parseObject(r) {
	r.skipCh('{');
	skipWhitespace(r);
	let obj = parseKeyValuePairs(r);
	skipWhitespace(r);
	r.skipCh('}');
	return obj;
}

/**
 * @param {Reader} r
 * @returns Array
 */
function parseArray(r) {
	r.skipCh('[');
	skipWhitespace(r);

	let arr = [];
	while (true) {
		let val = parseMasonValue(r);
		arr.push(val);
		let hasSep = skipSep(r);
		let ch = r.peek();
		if (ch == ']') {
			break;
		}

		if (ch == null) {
			r.err("Unexpected EOF");
		}

		if (!hasSep) {
			r.err("Expected separator or ']', got: '" + ch + "'");
		}
	}

	skipWhitespace(r);
	r.skipCh(']');
	return obj;
}

/**
 * @param {Reader} r
 * @returns object|Array|boolean|string|Uint8Array|null
 */
function parseMasonValue(r) {
	let ch = r.peek();
	if (ch == null) {
		r.err("Unexpected EOF");
	}

	if (ch == '[') {
		return parseArray(r);
	} else if (ch == '{') {
		return parseObject(r);
	} else if (ch == '"') {
		return parseString(r);
	} else if (ch == 'r') {
		return parseRawString(r);
	} else if (ch == '+' || ch == '-' || /[0-9]/.test(ch)) {
		return parseNumber(r);
	} else if (ch == 'b' && r.peek2() == '"') {
		return parseBinaryString(r);
	}

	let ident = parseIdentifier(r);
	if (ident == "null") {
		return null;
	} else if (ident == "true") {
		return true;
	} else if (ident == "false") {
		return false;
	} else if (ident.length > 0) {
		r.err("Unexpected keyword: '" + ident + "'");
	} else {
		r.err("Unexpected character: '" + ch + "'");
	}
}

/**
 * @param {Reader} r
 * @returns object
 */
function parseMason(r) {
	skipWhitespace(r)
	let obj;
	if (r.peek() == '{') {
		obj = parseObject(r);
	} else {
		obj = parseKeyValuePairs(r);
	}

	skipWhitespace(r);
	if (r.peek() != null) {
		r.err("Trailing garbage after document");
	}

	return obj;
}

/**
 * Parse a MASON document.
 * @param {string} str
 * @returns object
 */
export function parse(str) {
	if (typeof str != "string") {
		throw new TypeError("mason.parse expects a string");
	}

	let r = new Reader(str);
	return parseMason(r);
}

/**
 * Parse a single MASON value.
 * Note: this function cannot be used to parse a MASON document,
 * since it does not support omitting the outermost layer of braces
 * from objects.
 * @param {string} str
 * @returns object|Array|boolean|string|Uint8Array|null
 */
export function parseValue(str) {
	if (typeof str != "string") {
		throw new TypeError("mason.parseValue expects a string");
	}

	let r = new Reader(str);
	skipWhitespace(r);
	let val = parseMason(r);

	skipWhitespace(r);
	if (r.peek() != null) {
		r.err("Trailing garbage after value");
	}

	return val;
}
