<h1 align="center">Moonfin Themes</h1>
<h3 align="center">The community theme catalog for the Moonfin clients.</h3>

---

[![License](https://img.shields.io/github/license/Moonfin-Client/Themes.svg)](https://github.com/Moonfin-Client/Themes)

> **[Back to main Moonfin project](https://github.com/Moonfin-Client)**

This repository holds the themes shown in the in-app Theme Store. Every Moonfin client reads [`index.json`](index.json) from here at runtime, lists what it finds, and lets you save any theme to your client.

Themes are plain JSON files built with the Moonfin theme editor, so you don't need to write any code to contribute one.

## What is this?

The Theme Store is a browser built into each Moonfin client. It fetches the catalog, shows you the available themes, and when you pick one, it downloads the theme, validates it, and registers it locally. Saved store themes are kept separate from server-pushed themes, so syncing with your server never removes them.

## Contributing a theme

1. Build your theme in the theme editor inside the Moonfin Web client and use **Export JSON**.
2. Add the file to this repo as `themes/<your-id>.theme.json`.
3. Open a pull request. The **Validate themes** check runs automatically and names anything that needs fixing.

<details>
<summary><b>Advanced:</b> ids, the catalog manifest, and validation</summary>

- The `id` inside the file must use lowercase letters, numbers, `_`, or `-`, and it has to be unique across the catalog.
- `index.json` is generated from the files in `themes/`, and every pull request carries the regenerated manifest, so `main` is always ready to serve. Run `node scripts/generate-index.mjs` from the repository root to rewrite it, and include it in the same commit. Without Node on hand, skip this and open the pull request anyway. The check comments the expected `index.json` on the pull request for you to paste in.
- The validator confirms every required field is present and well formed (id, displayName, all color tokens as hex, borders, and so on), and that the optional fields a theme may carry, such as `isGlass` or `colors.error`, are the right type. It also confirms `index.json` matches `themes/`. If anything is wrong, it names the file and the field to fix.

</details>

## Repository layout

- `themes/*.theme.json` are the individual themes in the editor's export format.
- `index.json` is the generated catalog: `{ schemaVersion, themes: [{ id, displayName, description, file }] }`.
- `scripts/validate-themes.mjs` is the required-field validator, kept in step with the clients' own parsers.
- `scripts/generate-index.mjs` rebuilds `index.json` from the contents of `themes/`.
- `.github/workflows/validate.yml` is the gate. It runs on pull requests and pushes to `main`, and it fails if a theme is malformed or `index.json` no longer matches `themes/`.
- `.github/workflows/pr-comment.yml` posts the result of that gate on the pull request.

Clients fetch the raw files directly from `https://raw.githubusercontent.com/Moonfin-Client/Themes/main/`.
