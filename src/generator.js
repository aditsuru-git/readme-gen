// src/generator.js
import fs from "fs/promises"; // Need promises API for async file operations
import path from "path"; // Need for path.dirname()

/**
 * Escapes characters that have special meaning in regular expressions.
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
function escapeRegExp(str) {
	// $& means the whole matched string
	return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Generates the final file content by replacing placeholders and processing
 * conditional blocks within the template string.
 *
 * @param {string} templateContent - The raw template content as a string.
 * @param {object} answers - An object where keys are placeholder names
 *                           and values are the user-provided answers.
 * @param {Array<object>} promptsConfig - The array of prompt configuration objects.
 * @returns {string} - The processed template content.
 * @throws {TypeError} If templateContent is not a string, answers is not an object,
 *                     or promptsConfig is not an array.
 */
// Added promptsConfig parameter
function generateContent(templateContent, answers, promptsConfig) {
	// Basic type checking for robustness
	if (typeof templateContent !== "string") {
		throw new TypeError("Internal Error: templateContent must be a string.");
	}
	if (typeof answers !== "object" || answers === null) {
		throw new TypeError("Internal Error: answers must be an object.");
	}
	// Added check for promptsConfig
	if (!Array.isArray(promptsConfig)) {
		// Provide a fallback or throw an error if promptsConfig isn't passed correctly
		// For now, let's log a warning and proceed with default behavior if possible
		console.warn(
			"Internal Warning: promptsConfig was not provided to generateContent. Multiselect separators will use default."
		);
		promptsConfig = []; // Use an empty array to avoid errors below, but separators won't work
	}

	// --- Pass 1: Replace standard ${variable} placeholders ---
	let processedContent = templateContent;
	// Create a map of prompt names to their configs for easier lookup
	const configMap = promptsConfig.reduce((map, prompt) => {
		map[prompt.name] = prompt;
		return map;
	}, {});

	// Iterate through the answers provided by the user
	for (const [key, value] of Object.entries(answers)) {
		// Find the corresponding config for this answer key
		const promptConfig = configMap[key];

		// Determine replacement value based on type and config
		let replacementValue;

		// Check if it's an array (likely from multiselect)
		if (Array.isArray(value)) {
			// Default separator
			let separator = ", ";
			// If we found config and it specified a multiselect separator, use it
			if (promptConfig && promptConfig.type === "multiselect" && typeof promptConfig.separator === "string") {
				separator = promptConfig.separator;
			}
			// Join the array elements
			replacementValue = value.length > 0 ? value.join(separator) : "";
		} else if (typeof value === "boolean") {
			replacementValue = value ? "true" : "false";
		} else {
			// Handle null/undefined and other types
			replacementValue = value ?? "";
		}

		// Escape key for regex and create placeholder regex
		const placeholder = new RegExp(`\\$\\{${escapeRegExp(key)}\\}`, "g");
		// Perform the replacement
		processedContent = processedContent.replace(placeholder, String(replacementValue));
	}

	// --- Pass 2: Process conditional <!-- IF:{var} --> blocks ---
	// This part remains unchanged as it only depends on 'answers'

	const ifVarRegex = /<!--\s*IF:\{([^}]+)\}\s*-->/g;
	const conditionalVariables = new Set();
	let match;
	while ((match = ifVarRegex.exec(processedContent)) !== null) {
		conditionalVariables.add(match[1]); // Add the captured variable name (group 1)
	}

	// Process each conditional variable found
	for (const variableName of conditionalVariables) {
		// Determine if the block should be kept based on the answer.
		// Default to 'false' if the variable doesn't exist in answers,
		// or if it's not a boolean type.
		const shouldKeepBlock =
			Object.prototype.hasOwnProperty.call(answers, variableName) && typeof answers[variableName] === "boolean"
				? answers[variableName]
				: false;

		// Create the regex for this specific variable's block
		const blockRegex = new RegExp(
			`<!--\\s*IF:\\{${escapeRegExp(variableName)}\\}\\s*-->(.*?)<!--\\s*ENDIF:\\{${escapeRegExp(
				variableName
			)}\\}\\s*-->`,
			"gs"
		);

		if (shouldKeepBlock) {
			// If true, remove the tags but keep the content (captured group 1)
			processedContent = processedContent.replace(blockRegex, "$1");
		} else {
			// If false (or default), remove the entire block (tags + content)
			processedContent = processedContent.replace(blockRegex, "");
		}
	}

	// Return the fully processed template string
	return processedContent;
}

/**
 * Asynchronously writes the provided content to the specified output file path.
 * Creates the necessary directories if they don't exist.
 * (Function remains unchanged)
 */
async function writeFile(outputPath, content) {
	if (typeof content !== "string") {
		console.error("Internal Error: writeFile received non-string content:", typeof content);
		throw new TypeError(`Internal error: writeFile expected string content, but received ${typeof content}.`);
	}
	try {
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		await fs.writeFile(outputPath, content, "utf8");
	} catch (error) {
		throw new Error(`Failed to write output file to: ${outputPath}`, { cause: error });
	}
}

// Export the two core functions for use by the CLI module
export { generateContent, writeFile };
