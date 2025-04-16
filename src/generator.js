import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url"; // Needed for __dirname in ESM

// Get __dirname equivalent in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Generate a README file based on the template and configuration
 * @param {Object} config - Configuration options
 * @returns {Promise<void>}
 */
async function generateReadme(config) {
	try {
		// Read the template file
		const templatePath = path.join(__dirname, "../templates/default.md");
		let templateContent = await fs.readFile(templatePath, "utf8");

		// --- Conditional Header Logic ---
		if (!config.isLearningProject) {
			const headerStartMarker =
				'<div align="center">\n  <img src="https://raw.githubusercontent.com/aditsuru-git/readme-gen/refs/heads/main/assets/header.png'; // Use the actual URL from your template
			const headerEndMarker = '</div>\n\n<a id="readme-top"></a>';

			const startIndex = templateContent.indexOf(headerStartMarker);
			const endIndex = templateContent.indexOf(headerEndMarker);

			if (startIndex !== -1 && endIndex !== -1) {
				templateContent =
					templateContent.slice(0, startIndex) + templateContent.slice(endIndex + headerEndMarker.length);
			} else {
				console.warn("Could not find header markers in template to remove it conditionally.");
			}
			// Remove the initial H1 title if the header is removed
			templateContent = templateContent.replace(`# ${config.projectName}\n\n`, "");
		}
		// --- End Conditional Header Logic ---

		// --- Replace ONLY text/data placeholders ---
		templateContent = templateContent
			.replace(/\$\{PROJECT_TITLE\}/g, config.projectName)
			.replace(/\$\{PROJECT_DESCRIPTION\}/g, config.projectDescription)
			.replace(/\$\{GITHUB_USERNAME\}/g, config.githubUsername)
			.replace(/\$\{REPO_NAME\}/g, config.repoName)
			// --- REMOVED .replace for LOGO_URL ---
			// --- REMOVED .replace for SCREENSHOT_URL ---
			.replace(
				/\$\{PROJECT_LONG_DESCRIPTION\}/g,
				`${config.projectDescription} Add more details about your project here.`
			)
			.replace(/\$\{USAGE_DESCRIPTION\}/g, "Add examples for how to use your project here.")
			.replace(/\$\{LICENSE_TYPE\}/g, "MIT")
			.replace(/\$\{TECH_NAME\}/g, "tech-stack")
			.replace(/\$\{TECH_COLOR\}/g, "blue")
			.replace(/\$\{TECH_LOGO\}/g, "codesandbox")
			.replace(/\$\{TECH_URL\}/g, "#built-with");

		// Write the generated README file
		const outputPath = path.resolve(config.outputPath); // Resolve to absolute path
		await fs.mkdir(path.dirname(outputPath), { recursive: true }); // Ensure directory exists
		await fs.writeFile(outputPath, templateContent, "utf8");
	} catch (error) {
		throw new Error(`Failed to generate README at ${config.outputPath}: ${error.message}`);
	}
}

export { generateReadme };
