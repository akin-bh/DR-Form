# DR SAS Code Generator + CSV Converter
## Traffic Research Unit — Quick Start Guide

---

## What's in this folder

| File / Folder       | What it does                                              |
|---------------------|-----------------------------------------------------------|
| `index.html`        | Open in browser — generates your SAS scripts             |
| `converter.py`      | Run in terminal — converts SAS CSVs to formatted Excel   |
| `requirements.txt`  | Python packages needed for converter.py                  |
| `styles.css`        | Visual styling for the generator (rarely edit)           |
| `js/helpers.js`     | Shared SAS code building blocks                          |
| `js/templates.js`   | One function per template type ← main file to edit       |
| `js/ui.js`          | Tab switching, copy, download, validation                |
| `templates/`        | Put your Excel templates here (see setup below)          |

---

## Part 1 — SAS Code Generator (index.html)

### How to use
1. Double-click `index.html` — opens in any browser
2. Fill in DR number, folder path, year range
3. Pick your request type and options
4. Click **Generate SAS code**
5. Click **Copy** or **Download as .sas file**
6. Paste into SAS and run

### Tip — Live preview in VS Code
Install the **Live Server** extension. Click **Go Live** at the bottom right.
Every time you save a file, the browser refreshes automatically.

---

## Part 2 — CSV to Excel Converter (converter.py)

This eliminates the copy-paste step entirely. After SAS runs and produces
CSV files, this script reads them and outputs a properly formatted Excel file
matching your DR template — correct sheets, headers, and column order.

### One-time setup

**Step 1 — Install Python** (if not already installed)
Download from https://python.org — check "Add to PATH" during install.

**Step 2 — Install required packages**
Open a terminal in VS Code (Ctrl+`) and run:
```
pip install -r requirements.txt
```

**Step 3 — Copy your Excel templates into the templates/ folder**
```
DR_Generator/
  templates/
    DR_Template_CrashOnly.xlsx          ← copy from your shared drive
    DR_Template_CVO.xlsx
    DR_Template_CVO_GRP.xlsx
    DR_Template_VehOnly.xlsx
    DR_Template_CrashOnly_GRPData.xlsx
    DR_Template_C_V.xlsx
```

### How to use

After SAS runs and creates your CSV files, open VS Code terminal (Ctrl+`) and run:

```
python converter.py "R:\DR-2847-Smith" 2847
```

The script will:
- Find all CSV files for DR2847 in that folder
- Auto-detect which template to use (CrashOnly / CVO / VehOnly / etc.)
- Map the data into the correct columns
- Save `DR2847_Data.xlsx` in the same folder

### Manual template override

If auto-detect picks the wrong template, specify it manually:
```
python converter.py "R:\DR-2847-Smith" 2847 cvo
python converter.py "R:\DR-2847-Smith" 2847 crash
python converter.py "R:\DR-2847-Smith" 2847 crash_grp
python converter.py "R:\DR-2847-Smith" 2847 cvo_grp
python converter.py "R:\DR-2847-Smith" 2847 veh
python converter.py "R:\DR-2847-Smith" 2847 cv
```

### Expected CSV filenames

The script looks for CSV files that contain the DR number and one of these keywords:

| Keyword in filename | Mapped to        |
|---------------------|------------------|
| CRASH               | Crash data sheet |
| VEH                 | Vehicle sheet    |
| OCC                 | Occupant sheet   |

Standard SAS export names like `DR2847_CrashData.csv`, `DR2847_VehData.csv`,
`DR2847_OccData.csv` are detected automatically.

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
         ↓
5. In VS Code terminal:
   python converter.py "R:\DR-2847-Smith" 2847
         ↓
6. DR2847_Data.xlsx ready in the DR folder
   No copy-paste needed
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
| Change which CSV maps to which sheet | converter.py line ~75 |
| Change template file names           | converter.py line ~55 |
