// src/utils.js
import fs from "node:fs/promises"; // For reading local files
import path from "node:path"; // For joining paths for local base sources
import fetch from "node-fetch"; // For fetching URLs (ensure installed)
import latestVersion from "latest-version"; // For checking updates (ensure installed)
import semver from "semver"; // For comparing versions (ensure installed)
import colors from "picocolors"; // For coloring console output (ensure installed)
import { DEFAULT_TEMPLATE_FILENAME, DEFAULT_CONFIG_FILENAME } from "./config.js"; // Import default names

// --- Network/File Fetching ---

/**
 * Fetches text content from a public HTTP/HTTPS URL.
 * @param {string} url - The URL to fetch content from.
 * @returns {Promise<string>} - The fetched text content.
 * @throws {Error} If the fetch fails or the response status is not OK (2xx).
 */
async function fetchUrlContent(url) {
	let response;
	try {
		response = await fetch(url);
	} catch (networkError) {
		// Catch potential DNS/network connection errors
		throw new Error(`Network error while fetching URL: ${url}`, { cause: networkError });
	}

	if (!response.ok) {
		// Throw an error for non-successful HTTP status codes (e.g., 404, 500)
		throw new Error(`HTTP error ${response.status} fetching URL: ${url}`);
	}

	try {
		// Attempt to get the text content from the response body
		return await response.text();
	} catch (readError) {
		// Catch potential errors reading the response body
		throw new Error(`Failed to read response body from URL: ${url}`, { cause: readError });
	}
}

/**
 * Reads content either from a local file path or fetches it from a public URL.
 * Provides context in error messages.
 * @param {string} source - The local file path or public https:// URL.
 * @param {'template'|'config'} sourceType - Describes the type of file for error messages.
 * @returns {Promise<string>} - The fetched or read content as a string.
 * @throws {Error} If reading/fetching fails, with context.
 */
async function getContent(source, sourceType = "file") {
	try {
		if (isUrl(source)) {
			// If it looks like a URL, attempt to fetch it
			return await fetchUrlContent(source);
		} else {
			// Otherwise, assume it's a local file path and attempt to read it
			const content = await fs.readFile(source, "utf8");
			return content;
		}
	} catch (error) {
		// Catch specific file not found errors for better messages
		if (error instanceof Error && error.code === "ENOENT" && !isUrl(source)) {
			throw new Error(`Cannot find ${sourceType} source file locally: ${source}`, { cause: error });
		}
		// Wrap other errors (fetch errors, permission errors, etc.) with context
		throw new Error(`Failed to get ${sourceType} content from source: ${source}`, { cause: error });
	}
}

// --- Source Resolution Logic ---

/**
 * Simple check if a string starts with http:// or https://.
 * @param {string} source - The source string to check.
 * @returns {boolean} True if it starts with http(s)://, false otherwise.
 */
function isUrl(source) {
	return typeof source === "string" && (source.startsWith("http://") || source.startsWith("https://"));
}

/**
 * Tries to construct the base URL for raw GitHub content from a standard repo URL.
 * Handles common formats like https://github.com/user/repo and https://github.com/user/repo.git.
 * Assumes the 'main' branch for simplicity.
 * @param {string} repoUrl - The GitHub repository URL.
 * @returns {string|null} The base URL for raw content (e.g., "https://raw.githubusercontent.com/user/repo/main/") or null if the format is not recognized.
 */
function getRawGitHubUrlBase(repoUrl) {
	// Regex to capture username/reponame from various GitHub URL formats
	const match = repoUrl.match(/^https?:\/\/github\.com\/([^\/]+\/[^\/]+?)(\.git)?\/?$/i);
	if (match && match[1]) {
		const userRepo = match[1];
		// Default to 'main' branch. A more robust solution might check 'main' then 'master'.
		return `https://raw.githubusercontent.com/${userRepo}/main/`;
	}
	// Return null if the URL doesn't match the expected pattern
	return null;
}

/**
 * Resolves the final, absolute paths/URLs for the template and config files
 * based on a single "base source" (which can be a local directory or a GitHub repo URL).
 * @param {string} baseSource - The local directory path or GitHub repository URL.
 * @returns {{ finalTemplateSource: string, finalConfigSource: string }} An object containing the resolved sources.
 * @throws {Error} If the baseSource is an invalid GitHub URL format.
 */
function resolveFromBaseSource(baseSource) {
	if (isUrl(baseSource)) {
		// Handle URL (assume GitHub repo URL)
		const rawBase = getRawGitHubUrlBase(baseSource);
		if (!rawBase) {
			// Throw an error if the URL isn't a recognizable GitHub repo URL
			throw new Error(
				`Invalid or unsupported GitHub repository URL format: ${baseSource}\nExpected format like: https://github.com/username/repository`
			);
		}
		// Append default filenames to the raw base URL
		return {
			finalTemplateSource: rawBase + DEFAULT_TEMPLATE_FILENAME,
			finalConfigSource: rawBase + DEFAULT_CONFIG_FILENAME,
		};
	} else {
		// Handle local directory path
		// Resolve the base path to an absolute path
		const absoluteBasePath = path.resolve(baseSource);
		// Join the absolute base path with the default filenames
		return {
			finalTemplateSource: path.join(absoluteBasePath, DEFAULT_TEMPLATE_FILENAME),
			finalConfigSource: path.join(absoluteBasePath, DEFAULT_CONFIG_FILENAME),
		};
	}
}

// --- Update Check ---

/**
 * Checks npm for a newer version of the package and warns the user if available.
 * Fails silently if the check cannot be performed (e.g., network error).
 * @param {string} currentVersion - The current version of the running package (from package.json).
 * @param {string} packageName - The name of the package on npm.
 * @returns {Promise<void>}
 */
export async function checkForUpdates(currentVersion, packageName) {
	try {
		// Fetch the latest version from npm
		const response = await fetch(`https://registry.npmjs.org/${packageName}/latest`);
		const data = await response.json();
		const latestVersion = data.version;

		// Compare versions
		if (currentVersion !== latestVersion) {
			// Using semver comparison to check if current is behind
			const currentParts = currentVersion.split(".").map(Number);
			const latestParts = latestVersion.split(".").map(Number);

			// Compare major.minor.patch
			for (let i = 0; i < 3; i++) {
				if (currentParts[i] < latestParts[i]) {
					console.warn(
						colors.yellow(`
⚠️  Update available: ${currentVersion} → ${latestVersion}
   Run ${colors.bold(`npm install -g ${packageName}`)} to update
`)
					);
					break;
				}
			}
		}
	} catch (error) {
		// Silently fail on update check errors
		return;
	}
}

// Export the utility functions needed by other modules
export { getContent, resolveFromBaseSource };
