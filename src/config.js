// src/config.js
import Conf from "conf";
import colors from "picocolors";

// Default filenames expected when using a base source directory/URL
export const DEFAULT_TEMPLATE_FILENAME = "readme-template.md";
export const DEFAULT_CONFIG_FILENAME = "readme-config.json";

// Constants for identifying the type of saved template configuration
export const TEMPLATE_TYPE_EXPLICIT = "explicit"; // Saved with separate template and config sources
export const TEMPLATE_TYPE_BASE = "base"; // Saved with a single base directory/URL source
export const BUILT_IN_DEFAULT_NAME = "<built-in>";
// Define the schema for the configuration file to ensure structure
// This helps prevent errors if the config file gets corrupted manually
const schema = {
	templates: {
		type: "object",
		description: "Stores named template configurations.",
		// Allows any property name (the template name)
		additionalProperties: {
			// Each template must be one of these two types
			oneOf: [
				// Schema for templates saved with explicit sources
				{
					type: "object",
					properties: {
						type: { const: TEMPLATE_TYPE_EXPLICIT, description: "Type identifier" },
						templateSource: { type: "string", description: "Path or URL to the template file" },
						configSource: { type: "string", description: "Path or URL to the config file" },
					},
					required: ["type", "templateSource", "configSource"],
				},
				// Schema for templates saved with a base source
				{
					type: "object",
					properties: {
						type: { const: TEMPLATE_TYPE_BASE, description: "Type identifier" },
						baseSource: { type: "string", description: "Path or URL to the base directory/repo" },
						// Future enhancement: Allow overriding default filenames per saved template
						// templateFilename: { type: 'string', default: DEFAULT_TEMPLATE_FILENAME },
						// configFilename: { type: 'string', default: DEFAULT_CONFIG_FILENAME },
					},
					required: ["type", "baseSource"],
				},
			],
		},
		// Default value if 'templates' doesn't exist in the config file
		default: {},
	},
	defaultTemplateName: {
		type: "string",
		description: "The name of the template configuration to use by default.",
		// Default value if 'defaultTemplateName' doesn't exist
		default: "",
	},
};

// Initialize the configuration manager
// 'readme-gen' will be part of the path where the config file is stored
// (e.g., ~/.config/readme-gen/config.json on Linux)
const config = new Conf({ projectName: "readme-gen", schema });

// --- Helper Functions ---

/**
 * Retrieves the entire templates object from storage.
 * @returns {object} The templates object or an empty object if none exist.
 */
function getTemplates() {
	// Use default value from schema if 'templates' is not set
	return config.get("templates");
}

/**
 * Checks if a template with the given name exists in storage.
 * @param {string} name - The name of the template.
 * @returns {boolean} True if the template exists, false otherwise.
 */
function templateExists(name) {
	const templates = getTemplates();
	// Safer way to check for own property existence
	return Object.prototype.hasOwnProperty.call(templates, name);
}

// --- CRUD and Default Operations ---

/**
 * Adds or saves a new template configuration.
 * Determines whether it's an 'explicit' or 'base' type based on arguments.
 * @param {string} name - The unique name for this template config.
 * @param {string} source1 - Either the baseSource (if source2 is null) or templateSource.
 * @param {string|null} source2 - Either null (for base type) or configSource.
 */
function addTemplate(name, source1, source2) {
	if (templateExists(name)) {
		// Prevent overwriting existing templates without explicit action (like update)
		throw new Error(`Template name "${name}" already exists. Use 'update' or choose a different name.`);
	}

	let templateData;
	// Determine the type based on provided sources
	if (source1 && source2) {
		// Explicit mode: Both template and config sources provided
		templateData = {
			type: TEMPLATE_TYPE_EXPLICIT,
			templateSource: source1,
			configSource: source2,
		};
		console.log(colors.green(`Adding template "${name}" with explicit sources.`));
	} else if (source1 && !source2) {
		// Base source mode: Only one source provided (assumed to be base path/URL)
		templateData = {
			type: TEMPLATE_TYPE_BASE,
			baseSource: source1,
			// Filenames default to constants for now
		};
		console.log(
			colors.green(`Adding template "${name}" with base source.`) +
				colors.dim(` (Assumes: ${DEFAULT_TEMPLATE_FILENAME}, ${DEFAULT_CONFIG_FILENAME})`)
		);
	} else {
		// Should not happen if called correctly from commander action
		throw new Error("Internal Error: Invalid arguments for adding template.");
	}

	// Use dot-notation with conf to set nested property
	config.set(`templates.${name}`, templateData);

	// Automatically set the first added template as the default
	const templates = getTemplates(); // Get updated list
	if (Object.keys(templates).length === 1) {
		setDefaultTemplate(name); // Call helper to set default
		console.log(colors.cyan(`Template "${name}" also set as default.`));
	} else {
		console.log(colors.cyan(`Use 'readme-gen template default ${name}' to set it as default.`));
	}
}

/**
 * Removes a saved template configuration by name.
 * @param {string} name - The name of the template to remove.
 */
function removeTemplate(name) {
	if (!templateExists(name)) {
		throw new Error(`Template "${name}" not found.`);
	}
	const currentDefault = getDefaultTemplateName();
	// Use dot-notation to delete the specific template object
	config.delete(`templates.${name}`);
	console.log(colors.green(`Template "${name}" removed.`));

	// If the removed template was the current default, clear the default setting
	if (currentDefault === name) {
		config.set("defaultTemplateName", ""); // Reset default to empty string
		console.log(colors.yellow(`Default template "${name}" was removed. No default template set.`));
		console.log(colors.yellow(`Use 'readme-gen template default <name>' to set a new default.`));
	}
}

/**
 * Lists all saved template configurations to the console.
 */
function listTemplates() {
	const templates = getTemplates();
	const defaultName = getDefaultTemplateName();
	const names = Object.keys(templates);

	if (names.length === 0) {
		console.log(colors.yellow("No templates saved yet. Use 'readme-gen template add <name> ...'"));
		return;
	}

	console.log(colors.bold("Saved Templates:"));
	names.forEach((name) => {
		const isDefault = name === defaultName ? colors.green(" (default)") : "";
		const data = templates[name]; // Get the data for this template
		console.log(`  - ${colors.cyan(name)}${isDefault}`);

		// Display details based on the template type
		if (data.type === TEMPLATE_TYPE_BASE) {
			console.log(`    Type:     Base Source`);
			console.log(`    Source:   ${colors.dim(data.baseSource)}`);
			console.log(`    (Assumes: ${colors.dim(DEFAULT_TEMPLATE_FILENAME)}, ${colors.dim(DEFAULT_CONFIG_FILENAME)})`);
		} else {
			// Explicit type
			console.log(`    Type:     Explicit Sources`);
			console.log(`    Template: ${colors.dim(data.templateSource)}`);
			console.log(`    Config:   ${colors.dim(data.configSource)}`);
		}
	});
}

/**
 * Sets the default template configuration to use when no source is specified.
 * @param {string} name - The name of the saved template to set as default.
 */
function setDefaultTemplate(name) {
	if (!templateExists(name)) {
		// Ensure the template actually exists before setting it as default
		throw new Error(`Template "${name}" not found. Cannot set as default.`);
	}
	config.set("defaultTemplateName", name);
	console.log(colors.green(`Template "${name}" set as default.`));
}

/**
 * Retrieves the configuration data for a specific named template.
 * @param {string} name - The name of the template.
 * @returns {object} The template configuration object. Throws error if not found.
 */
function getTemplate(name) {
	if (!templateExists(name)) {
		throw new Error(`Template "${name}" not found.`);
	}
	const templates = getTemplates();
	// Returns { type, templateSource, configSource } OR { type, baseSource }
	return templates[name];
}

/**
 * Gets the name of the currently set default template.
 * @returns {string} The name of the default template, or an empty string if none is set.
 */
function getDefaultTemplateName() {
	// Use default value from schema if not set
	return config.get("defaultTemplateName");
}

/**
 * Retrieves the configuration data for the default template.
 * @returns {object|null} The default template's data object, or null if no default is set or the default points to a non-existent template.
 */
function getDefaultTemplate() {
	const defaultName = getDefaultTemplateName();
	if (!defaultName) {
		return null; // No default is set
	}
	try {
		// Attempt to get the template data using the saved default name
		return getTemplate(defaultName);
	} catch (error) {
		// If getTemplate throws (because the template was removed),
		// the default name is invalid. Clear it and return null.
		console.warn(
			colors.yellow(`Warning: Default template "${defaultName}" no longer exists. Clearing default setting.`)
		);
		config.set("defaultTemplateName", "");
		return null;
	}
}

// Note: Update functionality is omitted for now as updating a 'base' source is less straightforward
// than updating 'explicit' sources. Could be added later.
// function updateTemplate(...) { ... }

// Export all functions needed by other modules (primarily bin/index.js and src/cli.js)
export {
	addTemplate,
	removeTemplate,
	listTemplates,
	setDefaultTemplate,
	getTemplate,
	getDefaultTemplate,
	getDefaultTemplateName,
	templateExists, // Might be useful
};
