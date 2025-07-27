# MASON Test Suite

This suite contains test documents to test MASON parsers.

The folder `json-suite` contains files taken from
[nst/JSONTestSuite](https://github.com/nst/JSONTestSuite)'s
`test_parsing` directory.
Files starting with `y_` should parse, files starting with `n_` should not.
Files from JSONTestSuite which are inapplicable to MASON have been removed.

The folder `alt-json-suite` contains files which were marked with `n_`
in JSONTestSuite, but which are valid MASON files and therefore changed
to start with `y_`.

The folder `mason-suite` contains MASON-specific files. This folder contains:

* Files starting with `n_`, which should be rejected by MASON parsers
* Pairs of files starting with `y_`, one ending in `.mason` and one ending in `.json`.
  A MASON parser should parse the `.mason` file into a value that's identical
  to how a JSON parser parses the `.json` file.

## Using the test runner

The `run-test.js` script works as a test runner.
Run it with: `./run-test.js <program>`,
where `<program>` is a command-line program with your parser implementation.

The program is expected to accept a path to a MASON file,
and output a JSON string to stdout.
The requirements are:

* If parsing is successful, the program must exit with exit code 0.
* If parsing is successful, the program must output a JSON string to stdout.
* The JSON string that's written to stdout must represent byte strings as
  base64-encoded JSON strings.
* If parsing fails, the program must exit with a non-zero exit code, or a signal.
