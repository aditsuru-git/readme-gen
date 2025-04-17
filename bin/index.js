#!/usr/bin/env node

// bin/index.js
import { program } from "commander";
import { runCli } from "../src/cli.js"; // Import the CLI runner
import { createRequire } from "module";

// --- Setup ---
const require = createRequire(import.meta.url);
const { version, name: pkgName = "readme-gen" } = require("../package.json");
const defaultOutputPath = "./README.md"; // Define default clearly

// Define CLI arguments and options
program
	.name(pkgName)
	.version(version)
	.description("📝 Generate files from custom templates and configurations.")
	// Define optional argument WITHOUT the default here, we'll handle it below
	.argument("[output_path]", "Optional output path for the generated file")
	.requiredOption("-t, --template <path>", "Path to the template file (.md)")
	.requiredOption("-c, --config <path>", "Path to the configuration file (.json)")
	.parse(process.argv);

// Extract options and arguments
const options = program.opts();
let outputPathArg = program.args[0]; // Gets user input or undefined

// --- FIX: Apply default if argument is missing ---
if (outputPathArg === undefined) {
	outputPathArg = defaultOutputPath;
}

// Run the CLI logic, passing parsed values (outputPathArg is now guaranteed to be a string)
runCli(options, outputPathArg).catch((e) => {
	// Minimal catch block for truly unexpected errors *before* runCli's own error handling
	// Use console.error directly here, as picocolors might not be available if the error is very early
	console.error(`\n${pkgName} encountered a critical unexpected error:`);
	console.error(e);
	process.exit(1);
});
