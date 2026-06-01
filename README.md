# DR SAS Code Generator
## Traffic Research Unit : Quick Start Guide

---

## What's in this folder

| File / Folder       | What it does                                              |
|---------------------|-----------------------------------------------------------|
| `index.html`        | Open in browser : generates your SAS scripts             |
| `styles.css`        | Visual styling for the generator (rarely edit)           |
| `js/helpers.js`     | Shared SAS code building blocks                          |
| `js/templates.js`   | One function per template type ← main file to edit       |
| `js/ui.js`          | Tab switching, copy, download, validation                |

---

## Part 1 : SAS Code Generator (index.html)

### How to use
1. Double-click `index.html` : opens in any browser
2. Fill in DR number, folder path, year range
3. Pick your request type and options
4. Click **Generate SAS code**
5. Click **Copy** or **Download as .sas file**
6. Paste into SAS and run

### Tip : Live preview in VS Code
Install the **Live Server** extension. Click **Go Live** at the bottom right.
Every time you save a file, the browser refreshes automatically.

---

## Complete workflow (end to end)

```
1. Open index.html in browser
         ↓
2. Fill in DR number, folder, years, request type
         ↓
3. Click Generate → Copy → paste into SAS
         ↓
4. Run SAS → produces CSV files in DR folder
```

---

## Editing the generator (for developers)

| If you need to...                    | Edit this file        |
|--------------------------------------|-----------------------|
| Add a new template type              | js/templates.js       |
| Change how a template generates code | js/templates.js       |
| Add a new tab or form field          | index.html            |
| Change colors or layout              | styles.css            |
| Add a new filter toggle              | js/ui.js              |
| Change copy/download behavior        | js/ui.js              |
| Add a new WHERE clause type          | js/helpers.js         |


---

## Code documentation

- **Inline comments & JSDoc:** Major functions in `js/helpers.js`,
    `js/templates.js`, and `js/ui.js` include descriptive comments and
    JSDoc-style annotations to explain inputs, outputs and side-effects.
- **Lookup tables:** `js/lookups.js` contains `COUNTIES` and `CITIES`
    arrays used by the picker UI; each entry is `{code, name}`.

If you are a developer editing generators, read the header comments
at the top of each `js/*.js` file: they explain where to make changes.
