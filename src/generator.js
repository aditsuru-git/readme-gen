// src/generator.js
import fs from "fs/promises";
import path from "path";

// Helper function to safely read text file
async function readTextFile(filePath) {
	try {
		return await fs.readFile(filePath, "utf8");
	} catch (error) {
		if (error instanceof Error && error.code === "ENOENT") {
			// Throw specific error for file not found
			throw new Error(`Template file not found at: ${filePath}`, { cause: error });
		}
		// Throw generic error for other read issues
		throw new Error(`Failed to read template file: ${filePath}`, { cause: error });
	}
}

/**
 * Generates file content by replacing placeholders in a template.
 * @param {string} templatePath - Absolute path to the template file.
 * @param {object} answers - An object containing key-value pairs for placeholder replacement.
 * @param {string} outputPath - Absolute path for the output file (used for error context).
 * @returns {Promise<string>} - The processed template content.
 */
async function generateContent(templatePath, answers, outputPath) {
	let templateContent = await readTextFile(templatePath);

	// Replace placeholders
	for (const [key, value] of Object.entries(answers)) {
		// Use a RegExp that shouldn't capture nested ${} accidentally
		// Match ${key}, handle potential special chars in key if necessary
		// For simplicity, assuming keys are reasonably simple variable names
		const placeholder = new RegExp(`\\$\\{${key}\\}`, "g");

		// Format value for replacement
		let replacementValue = value;
		if (Array.isArray(value)) {
			replacementValue = value.length > 0 ? value.join(", ") : "";
		} else if (typeof value === "boolean") {
			replacementValue = value ? "true" : "false";
		}
		// Ensure replacement is a string, default to empty string for null/undefined
		replacementValue = replacementValue ?? "";

		templateContent = templateContent.replace(placeholder, String(replacementValue));
	}

	return templateContent;
}

/**
 * Writes the generated content to the specified output file.
 * @param {string} outputPath - Absolute path for the output file.
 * @param {string} content - The content to write.
 * @returns {Promise<void>}
 */
async function writeFile(outputPath, content) {
	try {
		// Ensure the output directory exists before writing
		await fs.mkdir(path.dirname(outputPath), { recursive: true });
		await fs.writeFile(outputPath, content, "utf8");
	} catch (error) {
		// Throw specific error for writing issues
		throw new Error(`Failed to write output file to: ${outputPath}`, { cause: error });
	}
}

// Export the core functions needed by the CLI
export { generateContent, writeFile };
