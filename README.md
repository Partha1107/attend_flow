# Kalvium Portfolio Management

A platform to showcase the talents of all Kalvium peers and enable mentors to track each peer's progress, performance, and project status.

---

# Getting Started

## Prerequisites

Make sure the following are installed on your system:

* Node.js
* npm
* Git

## Installation

Clone the repository:

```bash
git clone <repository-url>
cd <project-folder>
```

Install the project dependencies:

```bash
npm install
```

If the project contains separate `client` and `server` folders, install dependencies in both:

```bash
cd client
npm install

cd ../server
npm install
```

## Run the Development Server

For the frontend:

```bash
cd client
npm run dev
```

For the backend:

```bash
cd server
npm run dev
```

> Make sure the required environment variables are configured in the appropriate `.env` file before running the project.

---

# Developer Standards

## Commit Message Convention

Follow the **Conventional Commits** specification:

```text
<type>: <short description>
```

### Commit Types

| Type       | Description                                 | Example                                   |
| ---------- | ------------------------------------------- | ----------------------------------------- |
| `feat`     | Add a new feature                           | `feat: add mentor dashboard`              |
| `fix`      | Fix a bug                                   | `fix: resolve login validation issue`     |
| `chore`    | Maintenance, cleanup, dependency updates    | `chore: remove unused components`         |
| `docs`     | Documentation changes                       | `docs: update README`                     |
| `style`    | Code formatting with no logic changes       | `style: format files using Prettier`      |
| `refactor` | Improve code without changing functionality | `refactor: simplify authentication logic` |
| `test`     | Add or update tests                         | `test: add login page tests`              |

### Commit Rules

* Keep commit messages short and meaningful.
* Use the imperative mood, such as **add**, **fix**, or **update**.
* Make one logical change per commit.
* Avoid vague messages such as `update`, `changes`, or `final commit`.

### Good Examples

```bash
feat: add peer portfolio page

fix: resolve profile image upload issue

refactor: simplify mentor dashboard components

docs: update project setup guide

chore: update dependencies
```

### Bad Examples

```bash
updated

changes

work done

final

fixed
```

---

# Branch Naming Convention

Use the following naming convention:

```text
feature/<feature-name>
fix/<bug-name>
refactor/<module-name>
docs/<topic>
chore/<task>
```

### Examples

```text
feature/peer-portfolio
feature/mentor-dashboard
fix/login-validation
refactor/auth-context
docs/readme
chore/update-eslint
```

---

# Pull Request Guidelines

## PR Title

Use the same format as commit messages:

```text
feat: add mentor dashboard
fix: resolve login issue
refactor: improve routing structure
```

## Before Creating a Pull Request

* [ ] Code builds successfully.
* [ ] ESLint passes without errors.
* [ ] Code is formatted using Prettier.
* [ ] No unused imports or variables.
* [ ] Changes have been tested locally.
* [ ] Documentation has been updated if required.

---

# Coding Standards

## React.js

* Use functional components.
* Prefer React Hooks over class components.
* Keep components small and reusable.
* Extract repeated UI into reusable components.
* Use meaningful component and file names.

## JavaScript

* Use `const` by default.
* Use `let` only when reassignment is required.
* Use modern ES6+ syntax.
* Avoid deeply nested callbacks where possible.
* Prefer `async/await` for asynchronous operations.

## Project Structure

* Group related files together.
* Keep components, hooks, pages, and services in separate folders.
* Avoid deeply nested folder structures.

## Code Quality

* Remove unused code before committing.
* Use meaningful variable and function names.
* Avoid unnecessary hardcoded values.
* Keep functions focused on a single responsibility.
* Add comments only when the code is not self-explanatory.

---

# Development Workflow

Follow this workflow when working on the project:

```text
1. Create a new branch
        ↓
2. Develop the feature
        ↓
3. Run ESLint
        ↓
4. Test locally
        ↓
5. Commit changes
        ↓
6. Push the branch
        ↓
7. Create a Pull Request
        ↓
8. Address review comments
        ↓
9. Merge after approval
```

---

# Tech Stack

* React.js
* React Router
* JavaScript (ES6+)
* HTML5
* CSS3
* ESLint
* Prettier
* Git
* GitHub

---

# Best Practices

* Pull the latest changes before starting work.
* Keep pull requests focused on a single feature or fix.
* Review your own code before creating a PR.
* Never commit `.env` files or secrets.
* Keep commits small and descriptive.
* Delete merged branches to keep the repository clean.
