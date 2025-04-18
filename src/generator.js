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
 * @returns {string} - The processed template content.
 * @throws {TypeError} If templateContent is not a string or answers is not an object.
 */
function generateContent(templateContent, answers) {
	// Basic type checking for robustness
	if (typeof templateContent !== "string") {
		throw new TypeError("Internal Error: templateContent must be a string.");
	}
	if (typeof answers !== "object" || answers === null) {
		throw new TypeError("Internal Error: answers must be an object.");
	}

	// --- Pass 1: Replace standard ${variable} placeholders ---
	let processedContent = templateContent;
	for (const [key, value] of Object.entries(answers)) {
		// Escape key in case it has special regex characters (unlikely but safe)
		const placeholder = new RegExp(`\\$\\{${escapeRegExp(key)}\\}`, "g");

		let replacementValue;
		if (Array.isArray(value)) {
			replacementValue = value.length > 0 ? value.join(", ") : "";
		} else if (typeof value === "boolean") {
			replacementValue = value ? "true" : "false";
		} else {
			replacementValue = value ?? "";
		}
		processedContent = processedContent.replace(placeholder, String(replacementValue));
	}

	// --- Pass 2: Process conditional <!-- IF:{var} --> blocks ---

	// Find all unique variable names used in IF blocks
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
		// Need 's' flag (dotAll) so '.' matches newlines within the block
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
 *
 * @param {string} outputPath - The absolute path where the file should be written.
 * @param {string} content - The string content to write to the file.
 * @returns {Promise<void>} A promise that resolves when writing is complete.
 * @throws {Error} If writing fails (e.g., permission errors, invalid path), wrapping the original error.
 * @throws {TypeError} If content is not a string.
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
