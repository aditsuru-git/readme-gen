// src/cli.js
import fs from "fs/promises";
import path from "path";
import * as p from "@clack/prompts";
import colors from "picocolors";
import { generateContent, writeFile } from "./generator.js"; // Import core logic

// Helper function to safely read and parse JSON config
async function readJsonFile(filePath) {
	try {
		const fileContent = await fs.readFile(filePath, "utf8");
		return JSON.parse(fileContent);
	} catch (error) {
		if (error instanceof Error) {
			if (error.code === "ENOENT") {
				throw new Error(`Cannot find configuration file at: ${filePath}`, { cause: error });
			} else if (error instanceof SyntaxError) {
				throw new Error(`Invalid JSON syntax in configuration file: ${filePath}`, { cause: error });
			}
		}
		throw new Error(`Failed to read or parse configuration file: ${filePath}`, { cause: error });
	}
}

/**
 * Runs the main CLI logic.
 * @param {object} options - Options from commander (e.g., { template, config }).
 * @param {string} outputPathArg - The output path argument from commander.
 */
async function runCli(options, outputPathArg) {
	p.intro(`📝 ${colors.blue("readme-gen")}`); // Assuming pkgName logic is handled upstream or hardcoded

	// Resolve paths
	const templatePath = path.resolve(options.template);
	const configPath = path.resolve(options.config);
	const outputPath = path.resolve(outputPathArg); // Already has default from commander

	const s = p.spinner();
	try {
		// --- 1. Read Config ---
		s.start("Reading configuration...");
		const config = await readJsonFile(configPath);
		if (!config || !Array.isArray(config.prompts)) {
			throw new Error("Invalid config format: JSON must have a 'prompts' array.");
		}
		s.stop("Configuration loaded.");

		// --- 2. Run Prompts ---
		p.log.step("Gathering project details...");
		const answers = {};
		for (const promptConfig of config.prompts) {
			// Basic validation
			if (!promptConfig.name || !promptConfig.type || !promptConfig.message) {
				p.log.warn(`Skipping invalid prompt definition: ${JSON.stringify(promptConfig)}`);
				continue;
			}
			const name = promptConfig.name;
			let value;
			const commonOptions = {
				message: promptConfig.message,
				initialValue: promptConfig.initialValue,
			};

			// Map config to Clack prompts
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
						if (!Array.isArray(promptConfig.options) || promptConfig.options.length === 0) {
							throw new Error(`'options' array missing/invalid for select prompt: ${name}`);
						}
						value = await p.select({
							...commonOptions,
							options: promptConfig.options.map((opt) => (typeof opt === "string" ? { value: opt, label: opt } : opt)),
						});
						break;
					case "multiselect":
						if (!Array.isArray(promptConfig.options) || promptConfig.options.length === 0) {
							throw new Error(`'options' array missing/invalid for multiselect prompt: ${name}`);
						}
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
				// Re-throw errors from prompt execution for the main catch block
				throw new Error(`Error during prompt for '${name}': ${promptError.message}`, { cause: promptError });
			}

			// Handle Cancellation after each prompt
			if (p.isCancel(value)) {
				p.cancel("Operation cancelled by user.");
				process.exit(0); // Exit gracefully on cancel
			}
			answers[name] = value;
		}

		// --- 3. Generate Content ---
		s.start("Generating file content...");
		const generatedOutput = await generateContent(templatePath, answers, outputPath);
		s.stop("File content generated.");

		// --- 4. Write Output File ---
		s.start(`Writing output to ${path.relative(process.cwd(), outputPath) || "."}...`);
		await writeFile(outputPath, generatedOutput);
		s.stop("File written successfully!");

		// --- Success Outro ---
		p.outro(`Done. Output saved to ${colors.cyan(path.relative(process.cwd(), outputPath) || ".")}`);
	} catch (error) {
		// Handle errors from any step (reading config, prompts, generating, writing)
		s.stop("Operation failed.", 1); // Stop spinner with error state
		p.log.error(colors.red("An error occurred:"));

		// Log the specific error message and cause if available
		if (error instanceof Error) {
			console.error(`\n${colors.red(error.message)}`); // Use console.error for the actual message
			if (error.cause instanceof Error) {
				console.error(colors.dim(`Cause: ${error.cause.message}`));
			} else if (error.cause) {
				console.error(colors.dim(`Cause: ${error.cause}`));
			}
		} else {
			// Fallback for non-Error objects
			console.error(`\n${colors.red(error)}`);
		}

		p.outro(colors.red("Generation failed."));
		process.exit(1); // Exit with error code
	}
}

// Export the main CLI runner function
export { runCli };
