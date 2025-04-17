// src/cli.js
import path from "path"; // For path manipulation (resolve, relative, dirname)
import * as p from "@clack/prompts"; // Import clack library
import colors from "picocolors"; // For coloring output
import { generateContent, writeFile } from "./generator.js"; // Import core generator functions
import { getContent, resolveFromBaseSource } from "./utils.js"; // Import utility functions
import * as configManager from "./config.js"; // Import all named exports from config manager

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
		// Catch JSON parsing errors specifically
		if (error instanceof SyntaxError) {
			throw new Error(`Invalid JSON syntax in configuration source: ${sourceDescription}`, { cause: error });
		}
		// Re-throw other unexpected errors during parsing
		throw new Error(`Failed to parse configuration content from: ${sourceDescription}`, { cause: error });
	}

	// Basic validation for the expected structure
	if (!config || !Array.isArray(config.prompts)) {
		throw new Error(`Invalid config format in ${sourceDescription}: Root object must have a 'prompts' array.`);
	}
	return config;
}

/**
 * Runs the main generation workflow.
 * Determines sources, fetches/reads content, runs prompts, generates, and writes the file.
 * Handles UI feedback and operational errors.
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
	p.intro(`📝 ${colors.blue("readme-gen")}`); // Consider using pkgName if passed down

	let actualTemplateSource = null;
	let actualConfigSource = null;
	let sourceDescriptionForErrors = "unknown source"; // Used in error messages

	const s = p.spinner(); // Initialize the spinner

	try {
		s.start("Resolving template and configuration sources...");

		// --- Determine Actual Sources based on user input priority ---
		if (namedTemplateOpt) {
			// Priority 1: Use a named template configuration from storage
			sourceDescriptionForErrors = `saved template "${namedTemplateOpt}"`;
			const savedConfigData = configManager.getTemplate(namedTemplateOpt); // Throws if name not found

			if (savedConfigData.type === configManager.TEMPLATE_TYPE_BASE) {
				// Resolve the base source into specific file paths/URLs
				const resolved = resolveFromBaseSource(savedConfigData.baseSource);
				actualTemplateSource = resolved.finalTemplateSource;
				actualConfigSource = resolved.finalConfigSource;
				sourceDescriptionForErrors += ` (from base: ${savedConfigData.baseSource})`;
			} else {
				// Explicit type
				actualTemplateSource = savedConfigData.templateSource;
				actualConfigSource = savedConfigData.configSource;
			}
			s.stop(`Using saved template: ${colors.cyan(namedTemplateOpt)}`);
		} else if (templateSourceOpt && configSourceOpt) {
			// Priority 2: Use explicit sources provided via -t and -c flags
			actualTemplateSource = templateSourceOpt;
			actualConfigSource = configSourceOpt;
			sourceDescriptionForErrors = `explicit sources provided via flags`;
			s.stop(`Using explicit sources from flags.`);
		} else if (baseSourceArg) {
			// Priority 3: Use the base source provided as a positional argument
			sourceDescriptionForErrors = `base source argument "${baseSourceArg}"`;
			const resolved = resolveFromBaseSource(baseSourceArg);
			actualTemplateSource = resolved.finalTemplateSource;
			actualConfigSource = resolved.finalConfigSource;
			s.stop(`Using base source: ${colors.cyan(baseSourceArg)}`);
		} else {
			// Priority 4: Fallback to the default saved template configuration
			sourceDescriptionForErrors = "default template configuration";
			const savedDefaultData = configManager.getDefaultTemplate();
			if (!savedDefaultData) {
				// Throw if no input provided AND no default is set
				throw new Error(
					"No source specified and no default template is set.\n" +
						colors.dim(
							"Use flags (-t, -c), name (-n), a base source argument, or set a default ('readme-gen template default <name>')."
						)
				);
			}
			const defaultName = configManager.getDefaultTemplateName();
			sourceDescriptionForErrors = `default template "${defaultName}"`;

			if (savedDefaultData.type === configManager.TEMPLATE_TYPE_BASE) {
				// Resolve the default base source
				const resolved = resolveFromBaseSource(savedDefaultData.baseSource);
				actualTemplateSource = resolved.finalTemplateSource;
				actualConfigSource = resolved.finalConfigSource;
				sourceDescriptionForErrors += ` (from base: ${savedDefaultData.baseSource})`;
			} else {
				// Explicit type
				actualTemplateSource = savedDefaultData.templateSource;
				actualConfigSource = savedDefaultData.configSource;
			}
			s.stop(`Using default template: ${colors.cyan(defaultName)}`);
		}

		// --- 1. Fetch/Read Template and Config Content ---
		s.start("Loading template and config content...");
		// Fetch/read both concurrently for efficiency
		const [templateContent, configContent] = await Promise.all([
			getContent(actualTemplateSource, "template"), // getContent handles local path vs URL
			getContent(actualConfigSource, "config"),
		]);

		// Parse the config content after fetching/reading it
		const config = parseConfigContent(configContent, actualConfigSource); // Pass source for context in errors
		s.stop("Template and config loaded successfully.");

		// --- 2. Run Interactive Prompts ---
		p.log.step("Gathering project details...");
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
						// Add validation function only if 'required' is true
						const validate = promptConfig.required
							? (val) => (!val ? `${name} is required!` : undefined) // Return error message if invalid, undefined if valid
							: undefined; // No validation if not required
						value = await p.text({
							...commonOptions,
							placeholder: promptConfig.placeholder || "", // Optional placeholder text
							validate,
						});
						break;
					case "confirm":
						// Clack's confirm defaults initialValue to false if not provided or null/undefined
						value = await p.confirm({
							...commonOptions,
							initialValue: commonOptions.initialValue ?? false,
						});
						break;
					case "select":
						// Validate options array
						if (!Array.isArray(promptConfig.options) || promptConfig.options.length === 0) {
							throw new Error(`'options' array is missing, empty, or invalid for select prompt: ${name}`);
						}
						value = await p.select({
							...commonOptions,
							// Clack can handle simple string arrays or objects with { value, label, hint }
							options: promptConfig.options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt)),
						});
						break;
					case "multiselect":
						// Validate options array
						if (!Array.isArray(promptConfig.options) || promptConfig.options.length === 0) {
							throw new Error(`'options' array is missing, empty, or invalid for multiselect prompt: ${name}`);
						}
						value = await p.multiselect({
							...commonOptions,
							options: promptConfig.options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt)),
							required: promptConfig.required ?? false, // Use required flag from config (defaults to false if missing)
						});
						break;
					default:
						// Handle unsupported prompt types defined in the config
						throw new Error(`Unsupported prompt type "${promptConfig.type}" found in config for variable "${name}"`);
				}
			} catch (promptError) {
				// Wrap errors occurring during prompt execution with more context
				throw new Error(`Error executing prompt for '${name}': ${promptError.message}`, { cause: promptError });
			}

			// Check if the user cancelled the prompt (e.g., Ctrl+C)
			if (p.isCancel(value)) {
				p.cancel("Operation cancelled by user."); // Standard Clack cancellation message
				process.exit(0); // Exit gracefully with success code (0) for user cancellation
			}

			// Store the valid answer
			answers[name] = value;
		}

		// --- 3. Generate Final Content ---
		s.start("Generating file content...");
		// Call the synchronous generator function with the raw template content and collected answers
		const generatedOutput = generateContent(templateContent, answers);
		s.stop("File content generated.");

		// --- 4. Write Output File ---
		const relativeOutputPath = path.relative(process.cwd(), outputPath) || "."; // Get relative path for message
		s.start(`Writing output to ${colors.cyan(relativeOutputPath)}...`);
		await writeFile(outputPath, generatedOutput); // writeFile handles directory creation and writing
		s.stop("File written successfully!");

		// --- Success Outro ---
		p.outro(`Done. Output saved to ${colors.cyan(relativeOutputPath)}`);
	} catch (error) {
		// Catch errors from any step: resolving sources, reading files, parsing, prompting, generating, writing
		s.stop("Operation failed.", 1); // Ensure spinner stops with error indicator
		p.log.error(colors.red("An error occurred during generation:"));

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
			// Fallback for non-Error exceptions (less common)
			console.error(`\n${colors.red(error)}`);
		}

		p.outro(colors.red("Generation failed.")); // Final message indicating failure
		process.exit(1); // Exit with a non-zero code to indicate failure
	}
}

// Export the main CLI runner function for use by bin/index.js
export { runCli };
