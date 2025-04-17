#!/usr/bin/env node

// bin/index.js - Main Entry Point

import { program } from "commander"; // For parsing command-line arguments
import colors from "picocolors"; // For coloring console output
import path from "path"; // For resolving default output path if needed (now handled by commander)
import { runCli } from "../src/cli.js"; // Import the main CLI execution logic
import * as configManager from "../src/config.js"; // Import all config management functions
import { checkForUpdates } from "../src/utils.js"; // Import the update checker utility
import { createRequire } from "module"; // Helper for reading package.json in ESM

// --- Initial Setup ---
const require = createRequire(import.meta.url);
// Load package details for version and name (provide fallback name)
const { version: currentVersion, name: packageName = "readme-gen" } = require("../package.json");
// Define the default output path if no argument is provided
const defaultOutputPath = "./README.md";

// --- Asynchronous Update Check ---
// Check for updates in the background. Don't wait for it, and don't let errors stop the main command.
checkForUpdates(currentVersion, packageName);

// --- Command Definitions using Commander ---

// Configure the main program/command (generation)
program
	.name(packageName) // Display the package name in help messages
	.version(currentVersion, "-V, --version", "Output the current version") // Add version flag
	.usage("[options] [source_or_output...]") // Customize usage string
	.description("📝 Generate files from custom templates and configurations.")
	// Define positional arguments: Optional base source and optional output path
	// '...' makes it variadic (accepts 0, 1, or 2 arguments)
	.argument(
		"[source_or_output...]",
		`Optional: Base source path/URL and/or output path (default output: ${defaultOutputPath})`
	)
	// Define options for explicit source specification or using saved names
	.option("-t, --template <source>", "Path or URL to the template file (requires -c)")
	.option("-c, --config <source>", "Path or URL to the config file (requires -t)")
	.option("-n, --name <name>", "Use a saved template configuration by name")
	// Define the action to run when the main command is invoked
	.action(async (sourceOrOutputArgs, options) => {
		// This function runs when `readme-gen` is called without a subcommand

		let baseSourceArg = null;
		let outputPathArg = defaultOutputPath; // Initialize with default

		// Interpret the positional arguments based on how many were provided
		if (sourceOrOutputArgs.length === 1) {
			// If only one arg, it's the base_source *unless* explicit flags (-t/-c or -n) are used,
			// in which case it's the output_path.
			if (!options.template && !options.config && !options.name) {
				baseSourceArg = sourceOrOutputArgs[0];
				// Output path remains the default
			} else {
				outputPathArg = sourceOrOutputArgs[0]; // It must be the output path
			}
		} else if (sourceOrOutputArgs.length === 2) {
			// If two args, it must be base_source followed by output_path
			baseSourceArg = sourceOrOutputArgs[0];
			outputPathArg = sourceOrOutputArgs[1];
		} else if (sourceOrOutputArgs.length > 2) {
			// More than two positional args is an error
			console.error(colors.red("Error: Too many positional arguments provided."));
			console.error(colors.dim("Usage: readme-gen [base_source] [output_path] [options]"));
			process.exit(1); // Exit with error code
		}
		// If sourceOrOutputArgs.length is 0, baseSourceArg remains null and outputPathArg remains defaultOutputPath.

		// --- Validate Option Combinations ---
		const usingName = !!options.name;
		const usingExplicitSources = !!(options.template || options.config); // Check if either is present initially
		const usingBaseSource = !!baseSourceArg;

		// Count how many modes are being attempted
		const modesUsedCount = [usingName, usingExplicitSources, usingBaseSource].filter(Boolean).length;

		if (modesUsedCount > 1) {
			// User provided conflicting inputs (e.g., -n and -t, or -n and base_source)
			console.error(colors.red("Error: Conflicting options. Use only one sourcing method:"));
			console.error(colors.dim("  --name <saved_name>"));
			console.error(colors.dim("  --template <path/url> --config <path/url>"));
			console.error(colors.dim("  [base_source_path_or_url]"));
			process.exit(1);
		}

		// If explicit sources are attempted, both must be provided
		if (usingExplicitSources && (!options.template || !options.config)) {
			console.error(
				colors.red("Error: Both --template and --config must be provided together when using explicit source flags.")
			);
			process.exit(1);
		}

		// --- Execute the Core CLI Logic ---
		try {
			// Call the main CLI runner from src/cli.js, passing the determined arguments/options
			await runCli(
				options.template || null, // Pass explicit template source or null
				options.config || null, // Pass explicit config source or null
				options.name || null, // Pass saved template name or null
				baseSourceArg, // Pass base source argument or null
				outputPathArg // Pass the final output path (always a string)
			);
		} catch (e) {
			// This catch block is primarily for errors *before* runCli takes over
			// (e.g., very early config manager errors, though unlikely now).
			// runCli has its own more detailed error handling.
			console.error(colors.red(`\nError during initial setup: ${e?.message || e}`));
			process.exit(1);
		}
	});

// --- Template Subcommand Definition ---
// Create a subcommand 'template' for managing saved configurations
const templateCmd = program
	.command("template")
	.description("Manage saved template configurations (local paths or URLs)");

// Action: template add
templateCmd
	.command("add <name> <source...>") // Use variadic 'source...' to capture 1 or 2 source args
	.description("Save a new template config. Provide name and EITHER base_source OR template_source config_source.")
	.on("--help", () => {
		// Add specific help text for this command
		console.log("");
		console.log("Examples:");
		console.log("  $ readme-gen template add my-local ./local/template/dir");
		console.log("  $ readme-gen template add my-repo https://github.com/user/repo");
		console.log("  $ readme-gen template add my-explicit ./tmpl.md ./conf.json");
		console.log("  $ readme-gen template add my-remote-explicit <template_url> <config_url>");
	})
	.action((name, sources) => {
		try {
			// Check the number of source arguments provided
			if (sources.length === 1) {
				// One source means it's a 'base' type template
				configManager.addTemplate(name, sources[0], null); // Pass null for the second arg
			} else if (sources.length === 2) {
				// Two sources mean it's an 'explicit' type template
				configManager.addTemplate(name, sources[0], sources[1]);
			} else {
				// Invalid number of source arguments
				console.error(colors.red("Error: Invalid number of sources provided for 'add'."));
				console.error(
					colors.dim(
						"Please provide either one base source (path/URL) or two explicit sources (template path/URL and config path/URL)."
					)
				);
				process.exit(1);
			}
		} catch (e) {
			// Catch errors from configManager (e.g., name already exists)
			console.error(colors.red(`Error adding template "${name}": ${e.message}`));
			process.exit(1);
		}
	});

// Action: template list
templateCmd
	.command("list")
	.alias("ls") // Allow using 'ls' as a shorter alias
	.description("List all saved template configurations")
	.action(() => {
		// No arguments needed, just call the list function
		try {
			configManager.listTemplates();
		} catch (e) {
			// Handle potential errors reading the config file (though unlikely with conf)
			console.error(colors.red(`Error listing templates: ${e.message}`));
			process.exit(1);
		}
	});

// Action: template remove
templateCmd
	.command("remove <name>")
	.alias("rm") // Allow using 'rm' as a shorter alias
	.description("Remove a saved template configuration by name")
	.action((name) => {
		try {
			// Call remove function, handles "not found" error internally
			configManager.removeTemplate(name);
		} catch (e) {
			// Display errors caught from configManager
			console.error(colors.red(`Error removing template "${name}": ${e.message}`));
			process.exit(1);
		}
	});

// Action: template default
templateCmd
	.command("default <name>")
	.description("Set a saved template configuration as the default")
	.action((name) => {
		try {
			// Call set default function, handles "not found" error internally
			configManager.setDefaultTemplate(name);
		} catch (e) {
			// Display errors caught from configManager
			console.error(colors.red(`Error setting default template to "${name}": ${e.message}`));
			process.exit(1);
		}
	});

// --- Parse Arguments ---
// Process the command-line arguments based on the definitions above
// Commander handles executing the appropriate .action() based on input.
program.parse(process.argv);
