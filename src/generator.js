// src/generator.js
import fs from "fs/promises"; // Need promises API for async file operations
import path from "path"; // Need for path.dirname()

/**
 * Generates the final file content by replacing placeholders in the template string
 * with the corresponding values from the answers object.
 *
 * This is a synchronous function as it only performs string manipulation.
 *
 * @param {string} templateContent - The raw template content as a string.
 * @param {object} answers - An object where keys are placeholder names (e.g., "projectName")
 *                           and values are the user-provided answers.
 * @returns {string} - The processed template content with placeholders replaced.
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

	// Use 'let' because the variable will be modified in the loop
	let processedContent = templateContent;

	// Iterate through each key-value pair in the answers object
	for (const [key, value] of Object.entries(answers)) {
		// Create a regular expression to find the placeholder `${key}` globally
		// Escape the key in case it contains special regex characters (though unlikely for simple vars)
		// For simplicity, we assume 'key' is a valid variable name here.
		// A more robust solution might escape regex metacharacters in 'key'.
		const placeholder = new RegExp(`\\$\\{${key}\\}`, "g");

		// Format the answer value for insertion into the string template
		let replacementValue;
		if (Array.isArray(value)) {
			// Handle answers from multiselect prompts: join with comma and space
			// If the array is empty, replace with an empty string
			replacementValue = value.length > 0 ? value.join(", ") : "";
		} else if (typeof value === "boolean") {
			// Handle answers from confirm prompts: convert to 'true' or 'false' strings
			replacementValue = value ? "true" : "false";
		} else {
			// For other types (text, select), use the value directly.
			// Handle potential null/undefined values by defaulting to an empty string.
			replacementValue = value ?? "";
		}

		// Perform the replacement in the template string
		// Ensure the replacement value is explicitly converted to a string
		processedContent = processedContent.replace(placeholder, String(replacementValue));
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
	// Added type check from previous debugging - good safeguard
	if (typeof content !== "string") {
		// This indicates an internal logic error if reached
		console.error("Internal Error: writeFile received non-string content:", typeof content);
		throw new TypeError(`Internal error: writeFile expected string content, but received ${typeof content}.`);
	}
	try {
		// Ensure the directory for the output file exists, creating it recursively if needed
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		// Write the file asynchronously using UTF-8 encoding
		await fs.writeFile(outputPath, content, "utf8");
	} catch (error) {
		// Wrap file system errors with more context
		throw new Error(`Failed to write output file to: ${outputPath}`, { cause: error });
	}
}

// Export the two core functions for use by the CLI module
export { generateContent, writeFile };
