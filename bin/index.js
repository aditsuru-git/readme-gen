#!/usr/bin/env node

// bin/index.js - Main Entry Point & Argument Parser

import { program } from "commander"; // For parsing command-line arguments
import colors from "picocolors"; // For coloring console output
import path from "path"; // For resolving relative paths to absolute
import { runCli } from "../src/cli.js"; // Import the main CLI execution logic
import * as configManager from "../src/config.js"; // Import all config management functions
import { checkForUpdates } from "../src/utils.js"; // Import the update checker utility
import { createRequire } from "module"; // Helper for reading package.json in ESM

// --- Initial Setup ---
const require = createRequire(import.meta.url);
// Load package details for version and name (provide fallback name)
const { version: currentVersion, name: packageName = "readme-gen" } = require("../package.json");
// Define the default output path if no output argument is provided
const defaultOutputPath = "./README.md";

// --- Asynchronous Update Check ---
// Check for updates in the background. Doesn't block execution or throw errors on failure.
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

		// --- Interpret Positional Arguments ---
		// Determine if the user provided a base source, an output path, both, or neither.
		if (sourceOrOutputArgs.length === 1) {
			// If only one arg, it's the base_source *unless* specific sourcing flags (-t/-c or -n) are used,
			// in which case, we assume the user intended it as the output_path.
			if (!options.template && !options.config && !options.name) {
				baseSourceArg = sourceOrOutputArgs[0];
				// Output path remains the default defined earlier
			} else {
				outputPathArg = sourceOrOutputArgs[0]; // It must be the output path override
			}
		} else if (sourceOrOutputArgs.length === 2) {
			// If two args, it must be base_source followed by output_path
			baseSourceArg = sourceOrOutputArgs[0];
			outputPathArg = sourceOrOutputArgs[1];
		} else if (sourceOrOutputArgs.length > 2) {
			// More than two positional args is invalid for this command structure
			console.error(colors.red("Error: Too many positional arguments provided."));
			console.error(colors.dim("Usage: readme-gen [base_source] [output_path] [options]"));
			process.exit(1); // Exit with error code
		}
		// If sourceOrOutputArgs.length is 0, baseSourceArg remains null and outputPathArg remains defaultOutputPath.

		// --- Validate Option Combinations ---
		const usingName = !!options.name;
		// Check if *either* explicit flag is present (they must be used together)
		const usingExplicitSourcesFlags = !!(options.template || options.config);
		const usingBaseSourceArg = !!baseSourceArg;

		// Count how many *distinct sourcing methods* are being attempted
		const modesUsedCount = [usingName, usingExplicitSourcesFlags, usingBaseSourceArg].filter(Boolean).length;

		if (modesUsedCount > 1) {
			// User provided conflicting inputs (e.g., -n and -t, or -n and base_source)
			console.error(colors.red("Error: Conflicting options. Use only one sourcing method:"));
			console.error(colors.dim(`  --name <saved_name>`));
			console.error(colors.dim(`  --template <path/url> --config <path/url>`));
			console.error(colors.dim(`  [base_source_path_or_url]`));
			process.exit(1);
		}

		// If explicit sources are attempted via flags, *both* must be provided
		if (usingExplicitSourcesFlags && (!options.template || !options.config)) {
			console.error(
				colors.red("Error: Both --template AND --config must be provided together when using explicit source flags.")
			);
			process.exit(1);
		}

		// Prevent trying to use the reserved name for the built-in default via -n
		if (usingName && options.name === configManager.BUILT_IN_DEFAULT_NAME) {
			console.error(
				colors.red(
					`Error: Cannot directly request the "${configManager.BUILT_IN_DEFAULT_NAME}" template using -n. It's used automatically as a fallback.`
				)
			);
			process.exit(1);
		}

		// --- Resolve Local Paths to Absolute BEFORE passing to runCli ---
		// This ensures paths saved or used later are not dependent on the CWD where the command was run.
		const isUrl = (src) => typeof src === "string" && (src.startsWith("http://") || src.startsWith("https://"));

		const templateSourceFinal =
			options.template && !isUrl(options.template)
				? path.resolve(options.template) // Resolve local path
				: options.template; // Keep URL as is

		const configSourceFinal =
			options.config && !isUrl(options.config)
				? path.resolve(options.config) // Resolve local path
				: options.config; // Keep URL as is

		const baseSourceFinal =
			baseSourceArg && !isUrl(baseSourceArg)
				? path.resolve(baseSourceArg) // Resolve local path
				: baseSourceArg; // Keep URL as is
		// --- End Path Resolution ---

		// --- Execute the Core CLI Logic ---
		try {
			// Call the main CLI runner from src/cli.js, passing the determined arguments/options.
			// Note: We pass the *potentially resolved* sources here. runCli will handle
			// further resolution if a named or default template is used (which might itself
			// point to a base source that needs resolving).
			await runCli(
				templateSourceFinal || null, // Pass resolved/original template source or null
				configSourceFinal || null, // Pass resolved/original config source or null
				options.name || null, // Pass saved template name or null
				baseSourceFinal, // Pass resolved/original base source argument or null
				outputPathArg // Pass the final output path (always a string)
			);
		} catch (e) {
			// This catch block is primarily for errors during the *initial setup* or argument validation
			// before runCli takes over. runCli has its own more detailed error handling.
			console.error(colors.red(`\nError during CLI setup: ${e?.message || e}`));
			process.exit(1);
		}
	});

// --- Template Subcommand Definition ---
// Create a subcommand 'template' for managing saved configurations
const templateCmd = program
	.command("template")
	.description("Manage saved user template configurations (local paths or URLs)");

// Action: template add
templateCmd
	.command("add <name> <source...>") // Use variadic 'source...' to capture 1 or 2 source args
	.description("Save a template config. Provide name and EITHER base_source OR template_source config_source.")
	.on("--help", () => {
		// Add specific help text for this command
		console.log("");
		console.log("Examples:");
		console.log(`  $ ${packageName} template add my-local ./local/template/dir`);
		console.log(`  $ ${packageName} template add my-repo https://github.com/user/repo`);
		console.log(`  $ ${packageName} template add my-explicit ./tmpl.md ./conf.json`);
		console.log(`  $ ${packageName} template add my-remote-explicit <template_url> <config_url>`);
	})
	.action((name, sources) => {
		// Prevent using the reserved internal name
		if (name === configManager.BUILT_IN_DEFAULT_NAME) {
			console.error(
				colors.red(`Error: "${configManager.BUILT_IN_DEFAULT_NAME}" is a reserved name and cannot be used.`)
			);
			process.exit(1);
		}
		try {
			// Check the number of source arguments provided
			if (sources.length === 1) {
				// --- Resolve local base source path to ABSOLUTE before saving ---
				const baseSourceResolved = sources[0].startsWith("http") ? sources[0] : path.resolve(sources[0]);
				// Add as base source type
				configManager.addTemplate(name, baseSourceResolved, null); // Pass null for the second arg
			} else if (sources.length === 2) {
				// --- Resolve local explicit paths to ABSOLUTE before saving ---
				const templateSourceResolved = sources[0].startsWith("http") ? sources[0] : path.resolve(sources[0]);
				const configSourceResolved = sources[1].startsWith("http") ? sources[1] : path.resolve(sources[1]);
				// Add as explicit sources type
				configManager.addTemplate(name, templateSourceResolved, configSourceResolved);
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
	.description("List saved user template configurations") // Clarify user templates
	.action(() => {
		try {
			configManager.listTemplates();
		} catch (e) {
			console.error(colors.red(`Error listing templates: ${e.message}`));
			process.exit(1);
		}
	});

// Action: template remove
templateCmd
	.command("remove <name>")
	.alias("rm") // Allow using 'rm' as a shorter alias
	.description("Remove a saved user template configuration by name") // Clarify user templates
	.action((name) => {
		// Prevent removing the reserved internal name
		if (name === configManager.BUILT_IN_DEFAULT_NAME) {
			console.error(colors.red(`Error: Cannot remove the ${configManager.BUILT_IN_DEFAULT_NAME} template.`));
			process.exit(1);
		}
		try {
			configManager.removeTemplate(name);
		} catch (e) {
			// Display errors caught from configManager (e.g., not found)
			console.error(colors.red(`Error removing template "${name}": ${e.message}`));
			process.exit(1);
		}
	});

// Action: template default
templateCmd
	.command("default <name>")
	.description("Set a saved user template configuration as the default") // Clarify user templates
	.action((name) => {
		// Prevent setting the reserved internal name as default
		if (name === configManager.BUILT_IN_DEFAULT_NAME) {
			console.error(
				colors.red(
					`Error: Cannot set the ${configManager.BUILT_IN_DEFAULT_NAME} as default; it's the automatic fallback.`
				)
			);
			process.exit(1);
		}
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
// Process the command-line arguments based on the definitions above.
// Commander handles executing the appropriate .action() based on input.
// Errors within actions should call process.exit, preventing fall-through.
program.parse(process.argv);
