/*
 * js/templates.js : SAS code generator for each template type
 * =============================================================
 * THIS IS THE MAIN FILE TO EDIT when:
 *   - Adding a new template type          → add a new function at the bottom
 *   - Changing how a template generates code  → find the function and edit it
 *   - Updating sort order or merge logic  → edit the relevant function
 *   - Adding a new special filter         → add a case in generateSpecial()
 *                                            and a new function below it
 *
 * Each function builds an array of strings (L) and returns L.join('\n').
 * Shared building blocks (loadDS, fmtDS, expDS, etc.) are in helpers.js.
 * =============================================================
 */


/* ═══════════════════════════════════════════════════════════
   CRASH ONLY
   Template variants: NoPull / Pull CSV / Pull DBF / Pull GRP-CSV
═══════════════════════════════════════════════════════════ */
function generateCrash() {
  const cfg        = getConfig();
  const customCrashMacros = cfg.macroPreset === 'custom' ? cfg.customMacros : '';
  const pullMethod = document.querySelector('[name=crashPull]:checked').value;
  const filterType = document.getElementById('crashFilter').value;
  const filterVal  = getFilterValue('crash');
  const whereArg   = (pullMethod === 'nopull') ? buildWhere(filterType, filterVal, cfg.dateWhere) : '';
  const isGRP      = pullMethod === 'grpcsv';

  const templateName =
    pullMethod === 'nopull' ? 'Crash : No Pull' :
    pullMethod === 'csv'    ? 'Crash : Pull CSV' :
    pullMethod === 'dbf'    ? 'Crash : Pull DBF' :
                              'Crash : Pull GRP-CSV';
  const L = [];

  addHeader(L, cfg.dr, templateName);
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');

  importBlock(L, { pullMethod, folder: cfg.folder, dr: cfg.dr, hasGRP: isGRP });

  if (pullMethod === 'nopull') {
    L.push('%my(crash, l=crash, y=' + cfg.yRange + whereArg + ');');
    L.push('proc sort data=crash; by ucrnumber year; run;');
  } else {
    if (isGRP) L.push('/* Step 2: Merge crash data : GRP column is carried through */');
    else       L.push('/* Step 2: Merge crash data : with import list */');
    loadDS(L, { name: 'crash', lib: 'crash', finalSort: 'ucrnumber year',
                pullMethod, yRange: cfg.yRange, whereArg: '' });
  }

  L.push('');
  fmtDS(L, 'crash', 'crash', cfg.reviewLinks ? 'yes' : 'no', customCrashMacros);
  L.push('');
  expDS(L, { name: 'crash', suffix: 'CrashData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
   CVO COMBINATIONS
   Crash + Vehicle + Occupant / Crash + Vehicle / Crash + Occupant / Vehicle + Occupant
═══════════════════════════════════════════════════════════ */
function generateCVO() {
  const mode = document.querySelector('[name=cvoMode]:checked').value;
  if (mode === 'crashveh') return generateCrashVehicleCombo();
  if (mode === 'crashocc') return generateCrashOccupantCombo();
  if (mode === 'vehocc')   return generateVehicleOccupantCombo();
  return generateCrashVehicleOccupantCombo();
}

function appendCrashComboBlock(L, cfg, pullMethod, whereArg, customCrashMacros) {
  if (pullMethod === 'nopull') {
    L.push('%my(crash, l=crash, y=' + cfg.yRange + whereArg + ');');
    L.push('proc sort data=crash; by ucrnumber year; run;');
  } else {
    L.push('/* Step 2: Merge crash data */');
    loadDS(L, { name: 'crash', lib: 'crash', finalSort: 'ucrnumber year',
                pullMethod, yRange: cfg.yRange, whereArg: '' });
  }
  L.push('');
  fmtDS(L, 'crash', 'crash', cfg.reviewLinks ? 'yes' : 'no', customCrashMacros);
  L.push('');
  expDS(L, { name: 'crash', suffix: 'CrashData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });
}

function appendVehicleComboBlock(L, cfg, pullMethod, whereArg) {
  L.push('');
  L.push('/* ─── Vehicle ──────────────────────────────────────── */');
  if (pullMethod === 'nopull') {
    L.push('%my(veh, l=veh, y=' + cfg.yRange + whereArg + ');');
    L.push('proc sort data=veh; by ucrnumber year vehno; run;');
  } else {
    loadDS(L, { name: 'veh', lib: 'veh', finalSort: 'ucrnumber year vehno',
                pullMethod, yRange: cfg.yRange, whereArg: '' });
  }
  L.push('');
  fmtDS(L, 'veh', 'vehicle');
  L.push('');
  expDS(L, { name: 'veh', suffix: 'VehData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });
}

function appendOccupantComboBlock(L, cfg, pullMethod, whereArg) {
  L.push('');
  L.push('/* ─── Occupant ─────────────────────────────────────── */');
  if (pullMethod === 'nopull') {
    L.push('%my(occ, l=occ, y=' + cfg.yRange + whereArg + ');');
    L.push('proc sort data=occ; by ucrnumber year vehno occno; run;');
  } else {
    loadDS(L, { name: 'occ', lib: 'occ', finalSort: 'ucrnumber year vehno occno',
                pullMethod, yRange: cfg.yRange, whereArg: '' });
  }
  L.push('');
  fmtDS(L, 'occ', 'occupant');
  L.push('');
  expDS(L, { name: 'occ', suffix: 'OccData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });
}

function generateCrashVehicleOccupantCombo() {
  const cfg        = getConfig();
  const customCrashMacros = cfg.macroPreset === 'custom' ? cfg.customMacros : '';
  const pullMethod = document.querySelector('[name=cvoPull]:checked').value;
  const filterType = document.getElementById('cvoFilter').value;
  const filterVal  = getFilterValue('cvo');
  const whereArg   = (pullMethod === 'nopull') ? buildWhere(filterType, filterVal, cfg.dateWhere) : '';
  const isGRP      = pullMethod === 'grpcsv';
  const L = [];

  addHeader(L, cfg.dr, isGRP ? 'CVO : Pull GRP-CSV' : 'CVO : No Pull');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');

  if (isGRP) {
    importBlock(L, { pullMethod: 'grpcsv', folder: cfg.folder, dr: cfg.dr, hasGRP: true });
  }

  appendCrashComboBlock(L, cfg, pullMethod, whereArg, customCrashMacros);
  appendVehicleComboBlock(L, cfg, pullMethod, whereArg);
  appendOccupantComboBlock(L, cfg, pullMethod, whereArg);

  return L.join('\n');
}

function generateCrashVehicleCombo() {
  const cfg        = getConfig();
  const customCrashMacros = cfg.macroPreset === 'custom' ? cfg.customMacros : '';
  const pullMethod = document.querySelector('[name=cvoPull]:checked').value;
  const filterType = document.getElementById('cvoFilter').value;
  const filterVal  = getFilterValue('cvo');
  const whereArg   = (pullMethod === 'nopull') ? buildWhere(filterType, filterVal, cfg.dateWhere) : '';
  const isGRP      = pullMethod === 'grpcsv';
  const L = [];

  addHeader(L, cfg.dr, isGRP ? 'Crash + Vehicle : Pull GRP-CSV' : 'Crash + Vehicle : No Pull');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');

  if (isGRP) {
    importBlock(L, { pullMethod: 'grpcsv', folder: cfg.folder, dr: cfg.dr, hasGRP: true });
  }

  appendCrashComboBlock(L, cfg, pullMethod, whereArg, customCrashMacros);
  appendVehicleComboBlock(L, cfg, pullMethod, whereArg);

  return L.join('\n');
}

function generateCrashOccupantCombo() {
  const cfg        = getConfig();
  const customCrashMacros = cfg.macroPreset === 'custom' ? cfg.customMacros : '';
  const pullMethod = document.querySelector('[name=cvoPull]:checked').value;
  const filterType = document.getElementById('cvoFilter').value;
  const filterVal  = getFilterValue('cvo');
  const whereArg   = (pullMethod === 'nopull') ? buildWhere(filterType, filterVal, cfg.dateWhere) : '';
  const isGRP      = pullMethod === 'grpcsv';
  const L = [];

  addHeader(L, cfg.dr, isGRP ? 'Crash + Occupant : Pull GRP-CSV' : 'Crash + Occupant : No Pull');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');

  if (isGRP) {
    importBlock(L, { pullMethod: 'grpcsv', folder: cfg.folder, dr: cfg.dr, hasGRP: true });
  }

  appendCrashComboBlock(L, cfg, pullMethod, whereArg, customCrashMacros);
  appendOccupantComboBlock(L, cfg, pullMethod, whereArg);

  return L.join('\n');
}

function generateVehicleOccupantCombo() {
  const cfg        = getConfig();
  const pullMethod = document.querySelector('[name=cvoPull]:checked').value;
  const filterType = document.getElementById('cvoOccFilter').value;
  const filterVal  = getFilterValue('cvoOcc');
  const whereArg   = (pullMethod === 'nopull') ? buildWhere(filterType, filterVal, cfg.dateWhere) : '';
  const isGRP      = pullMethod === 'grpcsv';
  const L = [];

  addHeader(L, cfg.dr, isGRP ? 'Vehicle + Occupant : Pull GRP-CSV' : 'Vehicle + Occupant : No Pull');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');

  if (isGRP) {
    importBlock(L, { pullMethod: 'grpcsv', folder: cfg.folder, dr: cfg.dr, hasGRP: true });
  }

  appendVehicleComboBlock(L, cfg, pullMethod, whereArg);
  appendOccupantComboBlock(L, cfg, pullMethod, whereArg);

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
   VEHICLE
   Template variants: Standard NoPull / Body Style Query / Crash+Veh DBF
═══════════════════════════════════════════════════════════ */
function generateVehicle() {
  const cfg     = getConfig();
  const vehType = document.querySelector('[name=vehType]:checked').value;
  const L = [];

  /* ── Body style + county filter query ─────────────────── */
  if (vehType === 'bodyquery') {
    const bodyStyles  = document.getElementById('vehBodyStyles').value.trim().split(/[\s,]+/).filter(Boolean);
    const countyCodes = document.getElementById('vehCountyCodes').value.trim().split(/[\s,]+/).filter(Boolean);

    addHeader(L, cfg.dr, 'Vehicle Query : Body Style + County Filter');
    L.push("%include '" + cfg.macroPath + "';");
    L.push('');
    L.push('%my(veh1, l=veh, y=' + cfg.yRange + ');');
    L.push('run;');
    L.push('');
    L.push('data veh;');
    L.push('  set veh1;');
    const styleList = bodyStyles.map(s => "'" + s + "'").join(', ');
    if (countyCodes.length > 0) {
      L.push('  if VeBodyStyle in(' + styleList + ')');
      L.push('    and County in(' + countyCodes.join(', ') + ');');
    } else {
      L.push('  if VeBodyStyle in(' + styleList + ');');
    }
    L.push('run;');
    L.push('proc sort data=veh; by ucrnumber year vehno; run;');
    L.push('');
    fmtDS(L, 'veh', 'vehicle');
    L.push('');
    expDS(L, { name: 'veh', suffix: 'VehData',
               folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  /* ── Standard NoPull ──────────────────────────────────── */
  } else {
    const filterType = document.getElementById('vehFilter').value;
    const filterVal  = getFilterValue('veh');
    const whereArg   = buildWhere(filterType, filterVal, cfg.dateWhere);

    addHeader(L, cfg.dr, 'Vehicle : No Pull');
    L.push("%include '" + cfg.macroPath + "';");
    L.push('');
    L.push('%my(veh, l=veh, y=' + cfg.yRange + whereArg + ');');
    L.push('proc sort data=veh; by ucrnumber year vehno; run;');
    L.push('');
    fmtDS(L, 'veh', 'vehicle');
    L.push('');
    expDS(L, { name: 'veh', suffix: 'VehData',
               folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });
  }

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
  SPECIAL FILTERS : dispatcher
   Reads the selected radio and calls the right function below
═══════════════════════════════════════════════════════════ */
function generateSpecial() {
  const specialType = document.querySelector('[name=specialType]:checked').value;

  /* ── Add new special types here ── */
  if (specialType === 'motorcycles') return generateMotorcycles();
  if (specialType === 'animals')     return generateAnimals();
  if (specialType === 'findroads')   return generateFindRoads();
  if (specialType === 'quickucr')    return generateQuickUCR();

  return '/* Unknown special type */';
}


/* ═══════════════════════════════════════════════════════════
   SPECIAL: MOTORCYCLES ONLY
   CVO with MC/MP body style filter. Removes ATVs from crash data.
   Source template: DRTemplate_MY_CVO_NOPULL_MotorcyclesOnly.sas
═══════════════════════════════════════════════════════════ */
function generateMotorcycles() {
  const cfg = getConfig();
  const L = [];

  addHeader(L, cfg.dr, 'Special : Motorcycles Only (CVO)');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');
  L.push('/* Load crash data: crashes where a motorcycle was involved */');
  L.push('%my(crash, l=crash, y=' + cfg.yRange + ', where=(mcinv=1));');
  L.push('proc sort data=crash; by year ucrnumber; run;');
  L.push('');
  L.push('/* Load vehicle data: MC and MP body styles only */');
  L.push("%my(veh, l=veh, y=" + cfg.yRange + ", where=(VeBodyStyle='MC' or VeBodyStyle='MP'));");
  L.push('proc sort data=veh; by year ucrnumber vehno; run;');
  L.push('');
  L.push('/* Remove crashes that only had ATVs (mcinv=1 but no true MC body style) */');
  L.push('proc sort data=veh out=temp (Keep=Year UCRNumber) nodupkey; by year ucrnumber;');
  L.push('data temp; set temp; MotorcycleInv=1; run;');
  L.push('data crash;');
  L.push('  merge temp (in=a) crash (in=b);');
  L.push('  by Year UCRNumber;');
  L.push('  if a;');
  L.push('  drop MCINV;');
  L.push('run;');
  L.push('');
  L.push('/* Load occupant data: MC and MP body styles only */');
  L.push("%my(occ, l=occ, y=" + cfg.yRange + ", where=(VeBodyStyle='MC' or VeBodyStyle='MP'));");
  L.push('proc sort data=occ; by year ucrnumber vehno occno; run;');
  L.push('');
  fmtDS(L, 'crash', 'crash', cfg.reviewLinks ? 'yes' : 'no', customCrashMacros);
  L.push('');
  expDS(L, { name: 'crash', suffix: 'CrashData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });
  L.push('');
  L.push('/* ─── Vehicle ──────────────────────────────────────── */');
  fmtDS(L, 'veh', 'vehicle');
  L.push('');
  expDS(L, { name: 'veh', suffix: 'VehData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });
  L.push('');
  L.push('/* ─── Occupant ─────────────────────────────────────── */');
  fmtDS(L, 'occ', 'occupant');
  L.push('');
  expDS(L, { name: 'occ', suffix: 'OccData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
   SPECIAL: ALL ANIMALS
   Crash data where class=9 or fhe=82
   Source template: DRTemplate_MY_Crash_NOPULL_AllAnimals.sas
═══════════════════════════════════════════════════════════ */
function generateAnimals() {
  const cfg = getConfig();
  const customCrashMacros = cfg.macroPreset === 'custom' ? cfg.customMacros : '';
  const L = [];

  addHeader(L, cfg.dr, 'Special : All Animals Involved');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');
  L.push('/* class=9: animal crash classification; fhe=82: animal as first harmful event */');
  L.push('%my(crash, l=crash, y=' + cfg.yRange + ', where=((class=9) or (fhe=82)));');
  L.push('proc sort data=crash; by ucrnumber year; run;');
  L.push('');
  fmtDS(L, 'crash', 'crash', cfg.reviewLinks ? 'yes' : 'no', customCrashMacros);
  L.push('');
  expDS(L, { name: 'crash', suffix: 'CrashData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
   SPECIAL: FIND ROADS
   Searches AStreet, BStreet, Landmark, GIS_Route for keywords.
   Useful for finding non-geocoded or pre-2010 crash locations.
   Source template: DRTemplate_MY_Crash_NOPULL_Find-Roads.sas
═══════════════════════════════════════════════════════════ */
function generateFindRoads() {
  const cfg      = getConfig();
  const customCrashMacros = cfg.macroPreset === 'custom' ? cfg.customMacros : '';
  const county   = document.getElementById('roadCounty').value.trim();
  const termsRaw = document.getElementById('roadTerms').value;
  const terms    = termsRaw.split('\n').map(t => t.trim().toUpperCase()).filter(Boolean);
  const whereArg = county ? ', where=(county=' + county + ')' : '';
  const L = [];

  addHeader(L, cfg.dr, 'Special : Find Roads by Name/Number');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');
  L.push('%my(crash, l=crash, y=' + cfg.yRange + whereArg + '); run;');
  L.push('');
  L.push('/* Combine all street fields into one searchable string */');
  L.push('data crash;');
  L.push('  retain int county astreet bstreet landmark crashdate gis_route;');
  L.push('  set crash;');
  L.push('  int = upcase(trim(astreet)||trim(bstreet)||trim(landmark)||trim(gis_route));');

  if (terms.length > 0) {
    terms.forEach(function(t, i) {
      L.push((i === 0 ? '  if ' : '  or ') + "(index(int,'" + t + "'))");
    });
    L.push(';');
  } else {
    L.push('  /* Add your search terms below: */');
    L.push("  if (index(int,'ROAD NAME HERE'))");
    L.push(';');
  }
  L.push('run;');
  L.push('');
  fmtDS(L, 'crash', 'crash', cfg.reviewLinks ? 'yes' : 'no', customCrashMacros);
  L.push('');
  expDS(L, { name: 'crash', suffix: 'GISCrashData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
   SPECIAL: GET SPECIFIC UCR NUMBERS QUICK
   Loads a year range then filters to a specific list of UCRs.
   Source template: DRTemplate_MY_Crash_NOPULL_GetAFewUCRsQuick.sas
═══════════════════════════════════════════════════════════ */
function generateQuickUCR() {
  const cfg  = getConfig();
  const customCrashMacros = cfg.macroPreset === 'custom' ? cfg.customMacros : '';
  const raw  = document.getElementById('quickUCRs').value;
  const ucrs = raw.split('\n').map(u => u.trim()).filter(Boolean);
  const L    = [];

  addHeader(L, cfg.dr, 'Special : Get Specific UCR Numbers');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');
  L.push('%my(allcrash, l=crash, y=' + cfg.yRange + ');');
  L.push('proc sort data=allcrash; by ucrnumber year; run;');
  L.push('');
  L.push('data crash;');
  L.push('  set allcrash;');
  if (ucrs.length > 0) {
    const list = ucrs.map(u => "'" + u + "'").join(', ');
    L.push('  where ucrnumber in(' + list + ');');
  } else {
    L.push("  where ucrnumber in('ENTER-UCR-HERE');");
  }
  L.push('run;');
  L.push('');
  fmtDS(L, 'crash', 'crash', cfg.reviewLinks ? 'yes' : 'no', customCrashMacros);
  L.push('');
  expDS(L, { name: 'crash', suffix: 'CrashData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
   ↓ ADD NEW TEMPLATE FUNCTIONS BELOW THIS LINE
   Copy any existing function above as a starting point.
   Then register it in generateSpecial() above.
═══════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════════════════════════
   OCCUPANT ONLY
   Standalone occupant-level data, No pull.
═══════════════════════════════════════════════════════════ */
function generateOccupant() {
  const cfg        = getConfig();
  const filterType = document.getElementById('occFilter').value;
  const filterVal  = getFilterValue('occ');
  const whereArg   = buildWhere(filterType, filterVal, cfg.dateWhere);
  const L = [];

  addHeader(L, cfg.dr, 'Occupant : No Pull');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');
  L.push('%my(occ, l=occ, y=' + cfg.yRange + whereArg + ');');
  L.push('proc sort data=occ; by ucrnumber year vehno occno; run;');
  L.push('');
  fmtDS(L, 'occ', 'occupant');
  L.push('');
  expDS(L, { name: 'occ', suffix: 'OccData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  return L.join('\n');
}


/* ═══════════════════════════════════════════════════════════
   VEHICLE + OCCUPANT  (two output files, No pull)
═══════════════════════════════════════════════════════════ */
function generateVehicleOccupant() {
  const cfg        = getConfig();
  const filterType = document.getElementById('occFilter').value;
  const filterVal  = getFilterValue('occ');
  const whereArg   = buildWhere(filterType, filterVal, cfg.dateWhere);
  const L = [];

  addHeader(L, cfg.dr, 'Vehicle + Occupant : No Pull');
  L.push("%include '" + cfg.macroPath + "';");
  L.push('');

  // ── Vehicle ──────────────────────────────────────────
  L.push('%my(veh, l=veh, y=' + cfg.yRange + whereArg + ');');
  L.push('proc sort data=veh; by ucrnumber year vehno; run;');
  L.push('');
  fmtDS(L, 'veh', 'vehicle');
  L.push('');
  expDS(L, { name: 'veh', suffix: 'VehData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  // ── Occupant ─────────────────────────────────────────
  L.push('');
  L.push('/* ─── Occupant ─────────────────────────────────────── */');
  L.push('%my(occ, l=occ, y=' + cfg.yRange + whereArg + ');');
  L.push('proc sort data=occ; by ucrnumber year vehno occno; run;');
  L.push('');
  fmtDS(L, 'occ', 'occupant');
  L.push('');
  expDS(L, { name: 'occ', suffix: 'OccData',
             folder: cfg.folder, dr: cfg.dr, ext: cfg.ext, dbms: cfg.dbms });

  return L.join('\n');
}
