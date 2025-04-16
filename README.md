# README Generator

<div align="center">
  <!-- Optional Header Banner -->
  <!-- <img src="https://raw.githubusercontent.com/aditsuru-git/readme-gen/refs/heads/main/assets/header.png" alt="Project Banner" width="100%" style="max-width: 1200px;"> -->
</div>

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
    <img src="https://raw.githubusercontent.com/aditsuru-git/readme-gen/refs/heads/main/assets/icon.png" alt="Logo" width="80" height="80">
    <h3 align="center">README Generator (@aditsuru/readme-gen)</h3>
    <p align="center">
      Generate professional README.md files for your projects instantly using an interactive CLI.
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
        <li><a href="#features">Features</a></li>
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
    <li><a href="#usage">Usage</a></li>
    <li><a href="#contributing">Contributing</a></li>
    <li><a href="#license">License</a></li>
    <li><a href="#acknowledgments">Acknowledgments</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->

## About

<div align="center">
  <img src="https://raw.githubusercontent.com/aditsuru-git/readme-gen/refs/heads/main/assets/screenshot.png" alt="CLI Screenshot" width="100%" style="max-width: 800px;">
</div>

`@aditsuru/readme-gen` is a command-line tool that helps you quickly generate a well-structured `README.md` file for your projects. It uses an interactive prompt system powered by `@clack/prompts` to guide you through providing the necessary project details and then populates a predefined template.

### Features

- **Interactive CLI:** Uses `@clack/prompts` for a clean and guided setup process.
- **Template-Based:** Generates READMEs from a predefined template (`templates/default.md`).
- **Placeholder Replacement:** Automatically fills in project name, description, GitHub username, repo name, etc.
- **CLI Options:** Customize generation via command-line flags (skip prompts, set output path, etc.).
- **Conditional Header:** Optionally include a specific header image for learning projects.
- **Sensible Defaults:** Provides default values for quick generation.

### Built With

[![Node.js][Node-badge]][Node-url]

<!-- Add more tech badges as needed using the format: -->
<!-- [![Name][Name-badge]][Name-url] -->

<!-- GETTING STARTED -->

## Getting Started

To get started with `readme-gen`, follow these simple steps.

### Prerequisites

You need Node.js and npm installed on your system to run this tool.

- npm (Node Package Manager)
  ```sh
  npm install npm@latest -g
  ```

### Installation

You can use the tool directly with `npx` without installation, or install it globally.

1.  **Using npx (Recommended)**
    ```sh
    npx @aditsuru/readme-gen [options]
    ```
2.  **Global Installation**
    ```sh
    npm install -g @aditsuru/readme-gen
    ```

<!-- USAGE EXAMPLES -->

## Usage

Navigate to your project's root directory in your terminal and run the command:

```bash
# Using npx
npx @aditsuru/readme-gen

# Or if installed globally
readme-gen
```

The tool will interactively ask you for project details.

### Command Line Options

You can bypass the prompts or provide details directly using flags:

```
Usage: readme-gen [options]

📝 Generate a README file for your project

Options:
  -V, --version                  output the version number
  -n, --name <name>              project name
  -d, --description <description> short project description
  -u, --username <username>      GitHub username
  -r, --repo <repo>              repository name
  -l, --learning                 include learning project header image
  -s, --skip-prompts             skip all prompts and use defaults or provided options
  -o, --output <path>            output path for README file (default: "./README.md")
  -h, --help                     display help for command
```

### Examples

1.  **Interactive Mode:**

    ```bash
    npx @aditsuru/readme-gen
    ```

    _(Follow the prompts)_

2.  **Provide details via flags and skip prompts:**

    ```bash
    npx @aditsuru/readme-gen -s \
      -n "My Super App" \
      -d "An application that does amazing things." \
      -u "your-github-user" \
      -r "super-app-repo" \
      -o "docs/README.md"
    ```

3.  **Generate with the learning project header:**
    ```bash
    npx @aditsuru/readme-gen -l
    ```
    _(Will prompt for other details unless `-s` is also used)_

## Contributing

Contributions are what make the open source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1. Fork the Project (`https://github.com/aditsuru-git/readme-gen/fork`)
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

<!-- ## Top contributors:

<a href="https://github.com/aditsuru-git/readme-gen/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=aditsuru-git/readme-gen" alt="Contributors" />
</a> -->

<!-- LICENSE -->

## License

Distributed under the MIT License. See `LICENSE` file for more information.

<!-- ACKNOWLEDGMENTS -->

## Acknowledgments

- [@clack/prompts](https://github.com/natemoo-re/clack)
- [Commander.js](https://github.com/tj/commander.js/)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- Optional Footer Banner -->

<h1></h1>
<div align="center">
  <img src="https://raw.githubusercontent.com/aditsuru-git/readme-gen/refs/heads/main/assets/footer.png" alt="Footer Banner" width="100%" style="max-width: 1200px;">
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

<!-- BUILT WITH BADGES - Add URLs -->

[Node-badge]: https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
