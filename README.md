# README Generator (@aditsuru/readme-gen)

<a id="readme-top"></a>

[![Contributors][contributors-shield]][contributors-url]
[![Forks][forks-shield]][forks-url]
[![Stargazers][stars-shield]][stars-url]
[![Issues][issues-shield]][issues-url]
[![License][license-shield]][license-url]
[![NPM Version][npm-shield]][npm-url]

<br></br>

<div align="center">
  <p align="center">
    <img src="https://github.com/aditsuru-git/readme-template/blob/main/assets/icon.png?raw=true" alt="Logo" width="80" height="80">
    <h3 align="center">README Generator (@aditsuru/readme-gen)</h3>
    <p align="center">
      Generate project READMEs (or other files!) quickly from custom templates using an interactive CLI. Supports variable substitution, conditional content blocks, follow-up questions, and custom multi-select separators.
      <br />
      <!-- <a href="https://github.com/aditsuru-git/readme-gen/docs"><strong>Explore the docs »</strong></a> -->
      <!-- <br /> -->
      <br />
      <!-- <a href="https://github.com/aditsuru-git/readme-gen">View Demo</a> -->
      <!-- · -->
      <a href="https://github.com/aditsuru-git/readme-gen/issues/new?labels=bug&template=bug-report---.md">Report Bug</a>
      ·
      <a href="https://github.com/aditsuru-git/readme-gen/issues/new?labels=enhancement&template=feature-request---.md">Request Feature</a>
    </p>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li>
      <a href="#about">About The Project</a>
      <ul>
        <li><a href="#built-with">Built With</a></li>
      </ul>
    </li>
    <li>
      <a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li>
        <a href="#usage">Usage</a>
        <ul>
            <li><a href="#generating-files">Generating Files</a></li>
            <li><a href="#managing-templates">Managing Templates</a></li>
        </ul>
    </li>
    <li><a href="#creating-custom-templates">Creating Custom Templates</a>
        <ul>
            <li><a href="#template-file-md">Template File (.md)</a>
                <ul>
                    <li><a href="#variable-substitution">Variable Substitution</a></li>
                    <li><a href="#conditional-blocks-ifendif">Conditional Blocks (IF/ENDIF)</a></li>
                </ul>
            </li>
            <li><a href="#configuration-file-json">Configuration File (.json)</a>
                <ul>
                    <li><a href="#follow-up-questions-dependsonshowif">Follow-up Questions (dependsOn/showIf)</a></li>
                </ul>
            </li>
            <li><a href="#prompt-types--options">Prompt Types & Options</a></li>
        </ul>
    </li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About

<div align="center">
  <img src="https://raw.githubusercontent.com/aditsuru-git/readme-gen/main/assets/screenshot.png" alt="CLI Screenshot" width="100%" style="max-width: 800px;">
</div>

`@aditsuru/readme-gen` is a command-line tool designed to streamline the creation of README files (or any text-based boilerplate) for your projects. It works by processing a template file (`.md`) and interactively asking you questions defined in a corresponding configuration file (`.json`). Your answers are then injected into the template, conditional blocks are processed, follow-up questions can be asked based on previous answers, and multi-select answers can be joined with custom separators, to produce the final output file.

It supports using local template files, fetching templates from public GitHub repositories, saving configurations for quick reuse, and comes with a built-in default README template.

<!-- GETTING STARTED -->

## Getting Started

Get up and running with `readme-gen` quickly.

### Prerequisites

Ensure you have Node.js (v16 or higher recommended) and npm installed.

```sh
node -v
npm -v
```

### Installation

You can use the tool directly with `npx` without installation, or install it globally.

1.  **Using npx (Recommended for one-off use)**
    ```sh
    npx @aditsuru/readme-gen [base_source] [options]
    ```
2.  **Global Installation**
    ```sh
    npm install -g @aditsuru/readme-gen
    ```
    After global installation, you can use the `readme-gen` command directly.

<!-- USAGE EXAMPLES -->

## Usage

The tool has two main functions: generating files and managing saved template configurations.

### Generating Files

This is the primary command for creating a file from a template.

**Basic Syntax:**

```bash
# Using npx
npx @aditsuru/readme-gen [base_source] [options]

# Or globally installed
readme-gen [base_source] [options]
```

**Arguments & Options:**

- `[base_source]` (Optional Positional Argument):
  - Path to a local directory or a public GitHub repository URL containing the template files.
  - If provided, the tool expects `readme-template.md` and `readme-config.json` inside this source.
- **Source Options (Choose ONE method if not using `[base_source]`):**
  - `-t, --template <source>`: Path or URL to the template file (requires `-c`).
  - `-c, --config <source>`: Path or URL to the config file (requires `-t`).
  - `-n, --name <name>`: Use a saved template configuration by name (see Managing Templates).
- **Output Option:**
  - `-o, --output <path>`: Path to save the generated file.
    - _Default:_ `./README.md` in the current working directory.

**Source Priority & Examples:**

The tool determines which template/config to use based on this priority:

1.  **Explicit Sources (Flags):** `-t` and `-c` together. Highest priority.

    ```bash
    # Local files, default output path (./README.md)
    readme-gen -t ./path/to/template.md -c ./path/to/config.json

    # URLs, specific output path
    readme-gen -t <template_url> -c <config_url> -o docs/GENERATED.md

    # Mixed, specific output path
    readme-gen -t ./local-tmpl.md -c <config_url> -o my-output.txt
    ```

2.  **Saved Name (Flag):** `-n` flag.

    ```bash
    # Use saved config 'my-setup', output to specific path
    readme-gen -n my-setup -o project/README.md

    # Use saved config 'my-repo', default output path
    readme-gen -n my-repo
    ```

3.  **Base Source (Argument):** Positional argument.

    ```bash
    # Local directory, default output path
    readme-gen ./my-template-folder

    # GitHub Repo URL, specific output path
    # (Expects https://raw.githubusercontent.com/user/repo/main/readme-template.md etc.)
    readme-gen https://github.com/user/repo -o README_generated.md
    ```

4.  **User-Set Default:** If you've set a default using `template default`, and no source flags or arguments are given.

    ```bash
    # Uses your saved default template, outputs to ./README.md
    readme-gen

    # Uses your saved default template, outputs to specific path
    readme-gen -o ../README.md
    ```

5.  **Built-in Default:** Lowest priority. Used if no other sources are specified and no user default is set.

    ```bash
    # Uses the built-in template, outputs to ./README.md
    readme-gen

    # Uses the built-in template, outputs to specific path
    readme-gen -o my-project/README.md
    ```

**Conflicting Sources:** Providing more than one sourcing method (e.g., using `-n` and also providing a `[base_source]`) will result in an error.

### Managing Templates

Save and manage your template configurations for easy reuse.

**Syntax:**

```bash
readme-gen template <command> [args...]
```

**Commands:**

- **`add <name> <source...>`**

  - Saves a template configuration with a unique name.
  - Provide **one source** for 'base' type (local dir path or repo URL):

    ```bash
    # Save template from local directory
    readme-gen template add my-local-base ./path/to/template_dir

    # Save template from GitHub repo
    readme-gen template add my-gh-repo https://github.com/user/repo
    ```

  - Provide **two sources** for 'explicit' type (template source and config source):

    ```bash
    # Save explicit local files
    readme-gen template add my-explicit-files ./tmpl.md ./conf.json

    # Save explicit remote URLs
    readme-gen template add my-remote-files <tmpl_url> <conf_url>
    ```

  - _Note:_ Local paths are saved as absolute paths. The first template added automatically becomes the default.

- **`list` (alias `ls`)**

  - Shows all saved user templates and indicates the current default.
  - ```bash
    readme-gen template list
    ```

- **`remove <name>` (alias `rm`)**

  - Deletes a saved template configuration.
  - ```bash
    readme-gen template remove my-explicit-files
    ```

- **`default <name>`**
  - Sets a previously saved template as the default to be used when no other source is specified during generation.
  - ```bash
    readme-gen template default my-gh-repo
    ```

## Creating Custom Templates

To use your own templates, create two files:

1.  **Template File (`.md` or any text format):**

    - This is your blueprint file (e.g., `readme-template.md`).
    - It can contain standard text and Markdown.
    - Use placeholders for variable substitution and conditional blocks for optional content.

    ### Variable Substitution

    - Use the format `${variableName}` where you want values inserted.
    - The `variableName` must exactly match a `name` defined in your config file's prompts.
    - For `multiselect` answers, the values will be joined by `, ` by default, or by the custom `separator` if defined in the config.
    - **Example:**

      ```markdown
      # ${projectName}

      Author: ${authorName}
      License: ${chosenLicense}
      Includes Tests: ${includeTests}
      Features: ${selectedFeatures}

      <!-- selectedFeatures might become "lint, format, testing" -->

      Tags: ${selectedTags}

      <!-- selectedTags might become "#tag1\n#tag2" if separator is "\n" -->
      ```

    ### Conditional Blocks (IF/ENDIF)

    - Use HTML-style comments to wrap content that should only be included if a specific variable (typically from a `confirm` prompt) is `true`.
    - **Syntax:**

      ```markdown
      <!-- IF:{booleanVariableName} -->

      This content is only included if 'booleanVariableName' is true.
      You can use other variables like ${projectName} inside here too.

      <!-- ENDIF:{booleanVariableName} -->
      ```

    - **Behavior:**
      - If `booleanVariableName` exists in the answers and is `true`, the `<!-- IF -->` and `<!-- ENDIF -->` tags are removed, and the content between them is kept.
      - If `booleanVariableName` is `false`, or if it's not defined in the config, or if its value is not a boolean type, the _entire block_ (including the tags and the content inside) is removed.
    - **Example:**

      ```markdown
      <!-- IF:{includeLicenseSection} -->

      ## License

      This project uses the ${chosenLicense} license.

      <!-- ENDIF:{includeLicenseSection} -->
      ```

2.  **Configuration File (`.json`):**

    - This file defines the questions the CLI will ask (e.g., `readme-config.json`).
    - It MUST contain a root object with a single key: `"prompts"`.
    - The value of `"prompts"` MUST be an array of prompt objects.

    ### Follow-up Questions (`dependsOn`/`showIf`)

    - You can make a prompt appear only if a _previous_ prompt was answered with a specific value.
    - To do this, add two optional properties to the prompt object you want to make conditional:
      - `dependsOn` (string, required if `showIf` is used): The `name` of the prompt this one depends on. **This parent prompt MUST be defined earlier in the `"prompts"` array.**
      - `showIf` (any, required if `dependsOn` is used): The exact value (checked using `===`) that the parent prompt's answer must have for this follow-up prompt to be shown.
    - If the condition is not met (parent prompt wasn't answered or the answer doesn't match `showIf`), the follow-up prompt is skipped entirely.

    - **Example (`my-config.json`):**

      ```json
      {
      	"prompts": [
      		// Parent prompt
      		{
      			"name": "deployChoice",
      			"type": "select",
      			"message": "Choose deployment target:",
      			"options": ["AWS", "GCP", "Manual"]
      		},
      		// Follow-up 1: Only shown if deployChoice === "AWS"
      		{
      			"name": "awsRegion",
      			"type": "select",
      			"message": "Select AWS Region:",
      			"options": ["us-east-1", "eu-west-2"],
      			"dependsOn": "deployChoice",
      			"showIf": "AWS"
      		},
      		// Follow-up 2: Only shown if deployChoice === "Manual"
      		{
      			"name": "manualSteps",
      			"type": "text",
      			"message": "Describe manual steps:",
      			"dependsOn": "deployChoice",
      			"showIf": "Manual"
      		},
      		// Standard prompt, always shown
      		{
      			"name": "projectName",
      			"type": "text",
      			"message": "Project Name:"
      		}
      	]
      }
      ```

### Prompt Types & Options

Each object inside the `"prompts"` array defines one question. Besides the optional `dependsOn` and `showIf`, it must have `name`, `type`, and `message`. Other properties are optional depending on the type.

- **Common Properties:**

  - `name` (string, required): The variable name used in the template (e.g., `${projectName}` or for `<!-- IF:{includeLicenseSection} -->`).
  - `type` (string, required): The type of prompt. See below.
  - `message` (string, required): The question text shown to the user.
  - `initialValue` (any, optional): A default value pre-filled or pre-selected.
  - `required` (boolean, optional): For `text` and `multiselect`, enforces input/selection.
  - `dependsOn` (string, optional): See [Follow-up Questions](#follow-up-questions-dependsonshowif).
  - `showIf` (any, optional): See [Follow-up Questions](#follow-up-questions-dependsonshowif).

- **Prompt `type` Details:**

  1.  **`text`:** For freeform text input.

      - `placeholder` (string, optional): Dimmed text shown when the input is empty.
      - `required` (boolean, optional): If true, user cannot submit an empty value.
      - Example:

        ```json
        {
        	"name": "projectName",
        	"type": "text",
        	"message": "Enter project name:",
        	"placeholder": "My Cool App",
        	"required": true
        }
        ```

  2.  **`confirm`:** For Yes/No questions. Returns `true` or `false`. Often used as the parent prompt for follow-ups or for `<!-- IF: -->` blocks.

      - `initialValue` (boolean, optional): Default state (`true`=Yes, `false`=No). Defaults to `false`.
      - Example:

        ```json
        {
        	"name": "includeLicenseSection",
        	"type": "confirm",
        	"message": "Include a license section in the README?",
        	"initialValue": true
        }
        ```

  3.  **`select`:** For choosing a single option from a list. Returns the `value` of the chosen option. Can be used as a parent for follow-ups based on the selected `value`.

      - `options` (array, required): List of choices. Can be:
        - An array of strings: `["MIT", "Apache", "GPL"]` (value and label are the same).
        - An array of objects: `[{ "value": "mit", "label": "MIT License", "hint": "Permissive" }, ...]`
      - `initialValue` (any, optional): The `value` of the option to select by default.
      - Example:

        ```json
        {
        	"name": "chosenLicense",
        	"type": "select",
        	"message": "Choose a license:",
        	"initialValue": "mit",
        	"options": [
        		{ "value": "mit", "label": "MIT", "hint": "Permissive" },
        		{ "value": "gpl", "label": "GPLv3", "hint": "Copyleft" },
        		"Unlicensed"
        	]
        }
        ```

  4.  **`multiselect`:** For choosing multiple options from a list. Returns an array of the `value`s of chosen options.

      - `options` (array, required): Same format as `select`.
      - `required` (boolean, optional): If true, user must select at least one option.
      - `initialValue` (array, optional): An array of `value`s to select by default.
      - `separator` (string, optional): The string used to join the selected values when replacing the corresponding `${variable}` placeholder in the template. Defaults to `", "`.
      - Example:

        ```json
        {
        	"name": "selectedTags",
        	"type": "multiselect",
        	"message": "Select tags:",
        	"options": ["#tag1", "#tag2", "#tag3"],
        	"separator": "\n" // Join tags with newlines in the output
        }
        ```

        ```json
        {
        	"name": "selectedFeatures",
        	"type": "multiselect",
        	"message": "Select features:",
        	"options": ["Linting", "Formatting", "Testing"]
        	// No separator: defaults to ", " => "Linting, Formatting, Testing"
        }
        ```

## Contributing

Contributions are welcome! Please fork the repository and create a pull request or open an issue.

1.  Fork the Project (`https://github.com/aditsuru-git/readme-gen/fork`)
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` file for more information.

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [@clack/prompts](https://github.com/natemoo-re/clack)
- [Commander.js](https://github.com/tj/commander.js/)
- [Conf](https://github.com/sindresorhus/conf)
- [Picocolors](https://github.com/alexeyraspopov/picocolors)
- [node-fetch](https://github.com/node-fetch/node-fetch)
- [latest-version](https://github.com/sindresorhus/latest-version)
- [semver](https://github.com/npm/node-semver)
- README Template inspired by [Best-README-Template](https://github.com/othneildrew/Best-README-Template)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<h1></h1>

<div align="center">
  <img src="https://github.com/aditsuru-git/readme-template/blob/main/assets/footer.png?raw=true" alt="Footer Banner" width="100%" style="max-width: 1200px;">
</div>

<!-- MARKDOWN LINKS & IMAGES -->

[contributors-shield]: https://img.shields.io/github/contributors/aditsuru-git/readme-gen.svg?style=for-the-badge
[contributors-url]: https://github.com/aditsuru-git/readme-gen/graphs/contributors
[forks-shield]: https://img.shields.io/github/forks/aditsuru-git/readme-gen.svg?style=for-the-badge
[forks-url]: https://github.com/aditsuru-git/readme-gen/network/members
[stars-shield]: https://img.shields.io/github/stars/aditsuru-git/readme-gen.svg?style=for-the-badge
[stars-url]: https://github.com/aditsuru-git/readme-gen/stargazers
[issues-shield]: https://img.shields.io/github/issues/aditsuru-git/readme-gen.svg?style=for-the-badge
[issues-url]: https://github.com/aditsuru-git/readme-gen/issues
[license-shield]: https://img.shields.io/github/license/aditsuru-git/readme-gen.svg?style=for-the-badge
[license-url]: https://github.com/aditsuru-git/readme-gen/blob/main/LICENSE
[npm-shield]: https://img.shields.io/npm/v/@aditsuru/readme-gen.svg?style=for-the-badge
[npm-url]: https://www.npmjs.com/package/@aditsuru/readme-gen
