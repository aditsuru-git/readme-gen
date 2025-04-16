#!/usr/bin/env node

import { program } from "commander";
import * as p from "@clack/prompts";
import path from "path";
import { generateReadme } from "../src/generator.js";

// Import package.json using assert for ESM
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const { version } = require("../package.json");

// Default config values, primarily used when skipping prompts
const DEFAULT_CONFIG = {
	projectName: "Awesome Project",
	projectDescription: "A description of my awesome project",
	githubUsername: "github_username",
	repoName: "awesome-project",
	isLearningProject: false, // Default for the confirm prompt and skip-prompts
};

// Set up CLI options
program
	.version(version)
	.description("📝 Generate a README file for your project")
	.option("-n, --name <name>", "project name")
	.option("-d, --description <description>", "short project description")
	.option("-u, --username <username>", "GitHub username")
	.option("-r, --repo <repo>", "repository name")
	.option("-l, --learning", "include learning project header image")
	.option("-s, --skip-prompts", "skip all prompts and use defaults or provided options")
	.option("-o, --output <path>", "output path for README file", "./README.md")
	.parse(process.argv);

const options = program.opts();

// Main function
async function main() {
	p.intro("📝 README Generator");

	let userAnswers = {};

	// Only ask questions if skip-prompts is not used
	if (!options.skipPrompts) {
		const prompts = await p.group(
			{
				projectName: () =>
					p.text({
						message: "What is your project name?",
						placeholder: "e.g., My Awesome App",
						// REMOVED initialValue
						validate: (value) => !value && "Project name is required!",
					}),
				projectDescription: () =>
					p.text({
						message: "Enter a short description of your project:",
						placeholder: "e.g., A tool to make things easier",
						// REMOVED initialValue
						// No validation needed, description can be empty
					}),
				githubUsername: () =>
					p.text({
						message: "What is your GitHub username?",
						placeholder: "e.g., octocat",
						// REMOVED initialValue
						validate: (value) => !value && "GitHub username is required!",
					}),
				repoName: () =>
					p.text({
						message: "What is your repository name?",
						placeholder: "e.g., awesome-app",
						// REMOVED initialValue
						validate: (value) => !value && "Repository name is required!",
					}),
				isLearningProject: () =>
					p.confirm({
						message: "Is this a learning project (adds specific header image)?",
						initialValue: options.learning ?? DEFAULT_CONFIG.isLearningProject, // Keep initialValue, default 'no'
					}),
			},
			{
				onCancel: () => {
					p.cancel("Operation cancelled.");
					process.exit(0);
				},
			}
		);
		userAnswers = prompts;
	}

	// Combine CLI options (priority), prompt answers, and defaults (lowest priority)
	const config = {
		// Use CLI option if provided, otherwise use answer (if prompts ran), otherwise use default
		projectName: options.name ?? userAnswers.projectName ?? DEFAULT_CONFIG.projectName,
		projectDescription: options.description ?? userAnswers.projectDescription ?? DEFAULT_CONFIG.projectDescription,
		githubUsername: options.username ?? userAnswers.githubUsername ?? DEFAULT_CONFIG.githubUsername,
		repoName: options.repo ?? userAnswers.repoName ?? DEFAULT_CONFIG.repoName,
		// For boolean: CLI flag presence > answer > default
		isLearningProject: options.learning ?? userAnswers.isLearningProject ?? DEFAULT_CONFIG.isLearningProject,
		outputPath: options.output, // This comes directly from options (has its own default)
	};

	// Validation: Ensure required fields have a value even after merging (mainly for skip-prompts case)
	if (!config.projectName) {
		p.log.error("Project name is required. Provide it via -n flag or interactively.");
		process.exit(1);
	}
	if (!config.githubUsername) {
		p.log.error("GitHub username is required. Provide it via -u flag or interactively.");
		process.exit(1);
	}
	if (!config.repoName) {
		p.log.error("Repository name is required. Provide it via -r flag or interactively.");
		process.exit(1);
	}

	// Generate the README
	const s = p.spinner();
	try {
		s.start("Generating README...");
		await generateReadme(config);
		s.stop("README generated successfully!");

		p.log.success(`Your README has been saved to: ${config.outputPath}`);
		p.note(
			"Make sure to replace any remaining placeholders (like usage examples, prerequisites, etc.) in the generated file."
		);

		p.outro("Happy coding!");
	} catch (error) {
		s.stop("Failed to generate README.", 1);
		p.log.error("Error details:");
		console.error(error);
		process.exit(1);
	}
}

main();
