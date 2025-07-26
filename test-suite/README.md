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
