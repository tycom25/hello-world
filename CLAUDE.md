# CLAUDE.md

This file provides guidance for AI assistants (such as Claude) working with this repository.

## Repository Overview

**hello-world** is a minimal beginner repository created as a first introduction to GitHub. It contains a single `README.md` file with a brief personal introduction from the repository owner.

- **Purpose:** Learning GitHub basics
- **Content:** Documentation only — no source code, no build system, no tests
- **Language:** None (plain text / Markdown)

## Repository Structure

```
hello-world/
├── README.md     # Personal introduction and repository description
└── CLAUDE.md     # This file — guidance for AI assistants
```

## Development Workflows

### Branching

- Default branch: `master`
- Feature branches follow the pattern: `claude/<task-id>` for AI-assisted work

### Commits

- Commit signing is enabled (SSH format)
- Write clear, descriptive commit messages that explain what changed and why

### Making Changes

Since this repository contains only Markdown files, changes are straightforward:

1. Edit `README.md` (or other `.md` files) directly
2. Commit with a descriptive message
3. Push to the appropriate branch

## Key Conventions

- **No build steps** — there is nothing to compile or bundle
- **No tests** — there is no test suite to run
- **No dependencies** — there are no packages to install
- **Markdown only** — all content is plain text formatted as GitHub Flavored Markdown (GFM)

## Working with This Repository

When asked to make changes here:

- Edit Markdown files directly using available file-editing tools
- Keep content clear and human-readable
- Follow standard Markdown conventions (headings, lists, code blocks, etc.)
- There are no linters, formatters, or CI checks to satisfy

## Git Remote

The remote origin is configured locally. Push changes with:

```bash
git push -u origin <branch-name>
```
