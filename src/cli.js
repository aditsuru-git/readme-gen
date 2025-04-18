// src/cli.js - UI Orchestration & Workflow
import path from "path"; // For path manipulation
import { fileURLToPath } from "node:url"; // Needed for finding built-in templates relative path
import * as p from "@clack/prompts"; // Import clack library (ONLY used here)
import colors from "picocolors"; // For coloring output (ONLY used here for UI)
import { generateContent, writeFile } from "./generator.js"; // Import core generator functions
import { getContent, resolveFromBaseSource } from "./utils.js"; // Import utility functions
// Import specific config functions needed for source resolution & default handling
import {
	getTemplate,
	getDefaultTemplate, // Specific getter for user-set default data
	getDefaultTemplateName, // Gets name of user-set default
	TEMPLATE_TYPE_BASE, // Constant for type checking
	TEMPLATE_TYPE_EXPLICIT, // Constant for type checking
	BUILT_IN_DEFAULT_NAME, // Constant for the reserved name
} from "./config.js";

// --- Helper to find the root 'templates' directory relative to this file ---
// This assumes your final build structure keeps templates relative to src
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Resolve the path to the 'templates' directory that ships with the package
const BUILT_IN_TEMPLATES_DIR = path.resolve(__dirname, "../templates");

/**
 * Safely parses JSON content, providing context on error.
 * Also validates the basic expected structure ({ prompts: [] }).
 * @param {string} content - The JSON string content.
 * @param {string} sourceDescription - Description of where the content came from (for errors).
 * @returns {object} The parsed configuration object.
 * @throws {Error} If JSON is invalid or doesn't have the 'prompts' array.
 */
function parseConfigContent(content, sourceDescription) {
	let config;
	try {
		config = JSON.parse(content);
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(`Invalid JSON syntax in configuration source: ${sourceDescription}`, { cause: error });
		}
		throw new Error(`Failed to parse configuration content from: ${sourceDescription}`, { cause: error });
	}
	if (!config || !Array.isArray(config.prompts)) {
		throw new Error(`Invalid config format in ${sourceDescription}: Root object must have a 'prompts' array.`);
	}
	return config;
}

/**
 * Runs the main generation workflow: determines sources, fetches/reads content,
 * runs prompts via Clack, generates final content, and writes the output file.
 * Handles UI feedback (spinner, logs, intro/outro) and operational errors.
 *
 * @param {string|null} templateSourceOpt - Explicit template source from -t flag, or null.
 * @param {string|null} configSourceOpt - Explicit config source from -c flag, or null.
 * @param {string|null} namedTemplateOpt - Name of saved template from -n flag, or null.
 * @param {string|null} baseSourceArg - Base source path/URL from positional argument, or null.
 * @param {string} outputPath - Absolute path for the final output file.
 * @returns {Promise<void>}
 */
async function runCli(templateSourceOpt, configSourceOpt, namedTemplateOpt, baseSourceArg, outputPath) {
	// Start the Clack UI block
	p.intro(`📝 README GENERATOR`);

	let actualTemplateSource = null; // Final path/URL for the template file
	let actualConfigSource = null; // Final path/URL for the config file
	let sourceDescriptionForErrors = "unknown source"; // For context in error messages
	let usingBuiltInDefault = false; // Flag to track if we fell back to built-in

	const s = p.spinner(); // Initialize the spinner for progress indication

	try {
		s.start("Resolving template and configuration sources...");

		// --- Determine Actual Sources based on user input priority ---
		// Highest priority: -n flag (named template)
		if (namedTemplateOpt) {
			sourceDescriptionForErrors = `saved user template "${namedTemplateOpt}"`;
			const savedData = getTemplate(namedTemplateOpt); // Throws if name not found

			if (savedData.type === TEMPLATE_TYPE_BASE) {
				const resolved = resolveFromBaseSource(savedData.baseSource);
				actualTemplateSource = resolved.finalTemplateSource;
				actualConfigSource = resolved.finalConfigSource;
				sourceDescriptionForErrors += ` (from base: ${savedData.baseSource})`;
			} else {
				// Explicit type
				actualTemplateSource = savedData.templateSource;
				actualConfigSource = savedData.configSource;
			}
			s.stop(`Using saved template: ${colors.cyan(namedTemplateOpt)}`);

			// Next priority: Explicit -t and -c flags
		} else if (templateSourceOpt && configSourceOpt) {
			actualTemplateSource = templateSourceOpt;
			actualConfigSource = configSourceOpt;
			sourceDescriptionForErrors = `explicit sources from flags`;
			s.stop(`Using explicit sources from flags.`);

			// Next priority: Positional base source argument
		} else if (baseSourceArg) {
			sourceDescriptionForErrors = `base source argument "${baseSourceArg}"`;
			const resolved = resolveFromBaseSource(baseSourceArg);
			actualTemplateSource = resolved.finalTemplateSource;
			actualConfigSource = resolved.finalConfigSource;
			s.stop(`Using base source: ${colors.cyan(baseSourceArg)}`);

			// Next priority: User-defined default saved template
		} else {
			const userDefaultData = getDefaultTemplate(); // Check if user has set a default
			if (userDefaultData) {
				const defaultName = getDefaultTemplateName();
				sourceDescriptionForErrors = `user default template "${defaultName}"`;
				if (userDefaultData.type === TEMPLATE_TYPE_BASE) {
					const resolved = resolveFromBaseSource(userDefaultData.baseSource);
					actualTemplateSource = resolved.finalTemplateSource;
					actualConfigSource = resolved.finalConfigSource;
					sourceDescriptionForErrors += ` (from base: ${userDefaultData.baseSource})`;
				} else {
					// Explicit type
					actualTemplateSource = userDefaultData.templateSource;
					actualConfigSource = userDefaultData.configSource;
				}
				s.stop(`Using user default template: ${colors.cyan(defaultName)}`);
			} else {
				// --- Final Fallback: Use the BUILT-IN default template ---
				usingBuiltInDefault = true;
				sourceDescriptionForErrors = `built-in default template`;
				// Construct paths to the built-in files relative to this script's location
				actualTemplateSource = path.join(BUILT_IN_TEMPLATES_DIR, "default-template.md");
				actualConfigSource = path.join(BUILT_IN_TEMPLATES_DIR, "default-config.json");
				s.stop(`Using ${colors.cyan(BUILT_IN_DEFAULT_NAME)} template (no other source specified).`);
			}
		}

		// --- 1. Fetch/Read Template and Config Content ---
		s.start("Loading template and config content...");

		// Fetch/read both concurrently
		const [templateContent, configContent] = await Promise.all([
			getContent(actualTemplateSource, "template"), // getContent handles local vs URL
			getContent(actualConfigSource, "config"),
		]).catch((err) => {
			// Provide specific feedback if built-in files are missing during load
			if (usingBuiltInDefault && err.message?.includes("Cannot find")) {
				throw new Error(
					`Failed to load required ${BUILT_IN_DEFAULT_NAME} files from the package installation.\nSource Error: ${err.message}`,
					{ cause: err }
				);
			}
			throw err; // Re-throw other loading errors
		});

		// Parse the config content AFTER it's loaded
		const config = parseConfigContent(configContent, actualConfigSource); // Pass source for context in errors
		s.stop("Template and config loaded successfully.");

		// --- 2. Run Interactive Prompts ---
		// p.log.step("Gathering project details...");
		const answers = {}; // Initialize object to store answers

		// Loop through each prompt defined in the loaded config's "prompts" array
		for (const promptConfig of config.prompts) {
			// Basic validation of the prompt definition object
			if (!promptConfig.name || !promptConfig.type || !promptConfig.message) {
				p.log.warn(
					`Skipping invalid prompt definition in config (missing name, type, or message): ${JSON.stringify(
						promptConfig
					)}`
				);
				continue; // Skip to the next prompt definition
			}

			const name = promptConfig.name; // Variable name (used as key in answers)
			let value; // To store the result of the prompt

			// Options common to most clack prompts
			const commonOptions = {
				message: promptConfig.message,
				initialValue: promptConfig.initialValue, // Clack handles undefined initialValue gracefully
			};

			// Execute the appropriate clack prompt based on the 'type' in the config
			try {
				switch (promptConfig.type.toLowerCase()) {
					case "text":
						const validate = promptConfig.required ? (val) => (!val ? `${name} is required!` : undefined) : undefined;
						value = await p.text({ ...commonOptions, placeholder: promptConfig.placeholder || "", validate });
						break;
					case "confirm":
						value = await p.confirm({ ...commonOptions, initialValue: commonOptions.initialValue ?? false });
						break;
					case "select":
						if (!Array.isArray(promptConfig.options) || promptConfig.options.length === 0)
							throw new Error(`'options' array missing/invalid for select: ${name}`);
						value = await p.select({
							...commonOptions,
							options: promptConfig.options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt)),
						});
						break;
					case "multiselect":
						if (!Array.isArray(promptConfig.options) || promptConfig.options.length === 0)
							throw new Error(`'options' array missing/invalid for multiselect: ${name}`);
						value = await p.multiselect({
							...commonOptions,
							options: promptConfig.options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt)),
							required: promptConfig.required ?? false,
						});
						break;
					default:
						throw new Error(`Unsupported prompt type "${promptConfig.type}" for: ${name}`);
				}
			} catch (promptError) {
				// Wrap errors occurring during prompt execution with more context
				throw new Error(`Error executing prompt for '${name}': ${promptError.message}`, { cause: promptError });
			}

			// Check if the user cancelled the prompt (e.g., Ctrl+C)
			if (p.isCancel(value)) {
				p.cancel("Operation cancelled"); // Standard Clack cancellation message
				process.exit(0); // Exit gracefully with success code (0) for user cancellation
			}

			// Store the valid answer
			answers[name] = value;
		}

		// --- 3. Generate Final Content ---
		// Call the synchronous generator function from generator.js
		const generatedOutput = generateContent(templateContent, answers);

		// --- 4. Write Output File ---
		// Get relative path for clearer user message
		const relativeOutputPath = path.relative(process.cwd(), outputPath) || ".";
		s.start(`Writing output to ${colors.cyan(relativeOutputPath)}...`);

		// Call the async write function from generator.js
		await writeFile(outputPath, generatedOutput); // writeFile handles directory creation
		s.stop("File written successfully to ${colors.cyan(relativeOutputPath)}!");

		// --- Success Outro ---
		p.outro(`Done. Output saved to ${colors.cyan(relativeOutputPath)}`);
	} catch (error) {
		// Catch errors from any step and provide feedback
		s.stop("Operation failed.", 1); // Ensure spinner stops with error indicator
		p.log.error(colors.red(`An error occurred (source: ${sourceDescriptionForErrors}):`));

		// Log the specific error message and cause if available
		if (error instanceof Error) {
			// Use console.error for detailed error messages, Clack logs can be brief
			console.error(`\n${colors.red(error.message)}`);
			// Show underlying cause if present (useful for fs/network errors)
			if (error.cause) {
				const causeMessage = error.cause instanceof Error ? error.cause.message : String(error.cause);
				console.error(colors.dim(` -> Cause: ${causeMessage}`));
			}
		} else {
			// Fallback for non-Error exceptions
			console.error(`\n${colors.red(error)}`);
		}

		p.outro(colors.red("Generation failed.")); // Final message indicating failure
		process.exit(1); // Exit with a non-zero code to indicate failure
	}
}

// Export the main CLI runner function for use by bin/index.js
export { runCli };
