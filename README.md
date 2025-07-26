# MASON: Mort's Adorable and Sensible Object Notation

MASON is a JSON variant which aims to be well-suited for humans to read and write.
Its main purpose is for config files and other human-written mediums,
while being (almost entirely) backwards compatible with JSON.

## Features

MASON example:

```
name: "My Document"
windowsPath: r"C:\Users\MASON\"
fileMode: 0o755 // World readable, owner-writable
tags: [
    "cool"
    "mason"
    "document"
]
content: b"abcd\x45\xf7"
```

The main things which differentiate MASON from JSON are:

* Object keys can be unquoted identifiers: `{hello: "world"}`
* The outermost layer of braces can be omitted:

```
look: "ma"
no: "braces"
```

* Values can be separated by newlines instead of commas:

```
hello: "world"
this: "is MASON"
and: "this", is: "MASON"
```

* Also in arrays:

```
myarray: [
    "Lots of values"
    "separated by newlines"
    "and some by comma",
    1, 2, 3, 4,
]
```

* Comments:

```
// This is a comment
this: "is a value" // Another comment
```

* Raw strings: `{regex: r"\s*MASON\s*"}`
* Rust-style raw strings: `r##"This "string" can fit so many #"quotes"# :)"##`
* Binary strings: `b"look at my values: \xff\xfe\xef\x00"`
* Hex, binary and octal: `0xffef`, `0b00101101`, `0o755`
* Decimals with omitted leading zero: `.34`
* Leading positive sign: `+0.3'`, `-.7`, `+.9`

## Syntax

See [mason.bnf](./mason.bnf) for a description of the MASON syntax in BNF.

See [mason.png](./mason.png) for a railroad diagram rendered from the BNF.

## Implementation

See [js/mason.js](./js/mason.js) for a reference implementation of a MASON
praser written in JavaScript.

## Comparison with other JSON-like formats

### JSON5

Before making MASON, [JSON5](https://json5.org/) was my preferred JSON-like format.
I even wrote [Json5Cpp](https://github.com/mortie/json5cpp),
a parser and serializer for it.
I think it's pretty good, but there are a few things that annoy me:

* I don't like that it requires comma separators.
  Removing the commas gives the file a much cleaner look, in my opinion.
* I don't like that its spec relies on Unicode character classes.
  When writing a parser, I do *not* want to add a dependency on a
  Unicode character database.
  If a program uses JSON5 for its config file format,
  the JSON5 parser would, in many cases, be the *only* reason for it to depend
  on a Unicode character database.
* Since JSON5 defers to the ECMAScript spec for identifier names,
  it has weird rules like disallowing using the words "default" or "with" as
  unquoted identifiers.
  (Even JavaScript object syntax doesn't have this restriction!)

### Hjson

[Hjson](https://hjson.github.io/) is another JSON alternative that's meant to
be nicer for humans to read and write than JSON.
I like this one less than JSON5,
mostly because it allows unquoted strings.
I *really* don't like unquoted strings in schemaless formats.
It gives rise to issues like
[YAML's infamous Norway problem](https://www.bram.us/2022/01/11/yaml-the-norway-problem/).
It also makes it difficult for me as a human to parse a document since I need
to memorize rules for which exact symbols are allowed in which parts of
an unquoted string.
No thanks.

### YAML

Just... No.

## Incompatibilities with JSON

The only known incompatibility with JSON is related to how
the high Unicode code points are handled in string escapes.
In JSON, Unicode code points outside of the basic multilingual plane
(the first 2^16 code points)
can be represented as a pair of `\u` escapes using UTF-16 surrogate pairs.
For example, the emoji "🙃" ("Upside-Down Face") has the code point U+1F643.
This is too big to fit in a single `\u` escape.
In JSON, we have to realize that U+0001F643 can be represented using
the UTF-16 surrogate U+D83D and U+DE43,
and then encode it as `"\uD83D\uDE43"`.

In MASON, you would represent it using the `\U` escape: `"\U01F643"`.

The JSON approach is strictly worse: it's harder for the human to write
and it's really annoying for parser authors to write parsers for.
It happens to work alright in UTF-16-native environments like
JavaScript, but most of the world these days is UTF-8-native.

The "two surrogate pair escapes resulting in a single code point" encoding
of high code points appears rarely enough in the wild that I don't mind
losing compatibility with it.
When most people want emoji in their JSON,
they just put the emoji character directly in the string.

## Semantics

* MASON parsers MUST be able to uniquely parse all numbers that IEEE 754
  double-precision floating point numbers can represent.
* MASON parsers MAY preserve the ordering of key-value pairs in objects,
  but are not required to.
  Changing the order of keys is not considered a change
  in the semantic meaning of the document.
* Whether or not the outermost layer of braces are omitted has no effect
  on the semantic meaning of a MASON document.
* A string can represent any sequence of Unicode code points.
  This includes U+0000.
* A binary string can represent any arbitrary sequence of bytes.
  This includes the 0 byte, and it includes byte sequences which are invalid UTF-8.
* When converting a MASON document to a JSON document,
  binary strings SHOULD be encoded as base64 in accordance with RFC 4648.
