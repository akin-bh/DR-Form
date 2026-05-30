/*
 * js/ui.js — UI interactions, tab switching, copy, download
 * ===========================================================
 * Edit this file when:
 *   - Adding a new tab
 *   - Adding a new filter input that shows/hides conditionally
 *   - Changing copy or download behavior
 *   - Adding input validation
 * ===========================================================
 */


/* ═══════════════════════════════════════════════════════════
   TAB SWITCHING
═══════════════════════════════════════════════════════════ */
function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelector('[data-tab="' + name + '"]').classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
  document.getElementById('outputSection').style.display = 'none';
}


/* ═══════════════════════════════════════════════════════════
   DATE RANGE TOGGLE
   Shows/hides month+day inputs when the checkbox is checked.
═══════════════════════════════════════════════════════════ */
function toggleDateRange() {
  const on = document.getElementById('useDateRange').checked;
  document.getElementById('dateRangeExtras').style.display = on ? 'block' : 'none';
}

/* ═══════════════════════════════════════════════════════════
   MACRO FILE PRESET SELECTOR
   Fills in the path and updates the hint when a preset is chosen.
═══════════════════════════════════════════════════════════ */
const MACRO_BASE = 'A:\\TRUAnalysis\\request\\Templates\\Templates_SAS\\';
const MACRO_STANDARD_FILE = 'DR_Data_Macros.sas';

const MACRO_PRESETS = {
  standard: { file: MACRO_STANDARD_FILE, hint: 'Standard macro file — crash data will include <code>%link_appendloc;</code> to build the Links field.' },
  noreview: { file: MACRO_STANDARD_FILE, hint: 'No review needed — crash data will use <code>drop %NoReviewNeeded_macro;</code> to remove AppendLoc &amp; Links.' },
  custom:   { file: null, hint: 'Custom path — edit the path field below.' },
};

function macroPresetChange() {
  const sel    = document.getElementById('macroPreset').value;
  const inp    = document.getElementById('macroPath');
  const hint   = document.getElementById('macroHint');
  const extra  = document.getElementById('customMacroSection');
  const preset = MACRO_PRESETS[sel];
  if (!preset) return;
  if (preset.file) inp.value = MACRO_BASE + preset.file;
  hint.innerHTML = preset.hint;
  if (extra) extra.style.display = sel === 'custom' ? 'block' : 'none';
}


/* ═══════════════════════════════════════════════════════════
   LOOKUP PICKER
   Tag-based search component for county and city filters.
   pickerState[prefix] = { type:'county'|'city', items:[{code,name}] }
═══════════════════════════════════════════════════════════ */
const pickerState = {};

function initPicker(prefix, type) {
  pickerState[prefix] = { type: type, items: [] };
  renderPickerTags(prefix);
  document.getElementById(prefix + 'PickerSearch').value = '';
  document.getElementById(prefix + 'PickerDropdown').style.display = 'none';
}

function pickerSearch(prefix) {
  const inp   = document.getElementById(prefix + 'PickerSearch');
  const drop  = document.getElementById(prefix + 'PickerDropdown');
  const q     = inp.value.trim().toLowerCase();
  const state = pickerState[prefix];
  if (!state) return;

  if (!q) { drop.style.display = 'none'; return; }

  const source   = state.type === 'county' ? COUNTIES : CITIES;
  const selected = new Set(state.items.map(i => i.code));
  const matches  = source.filter(x =>
    !selected.has(x.code) &&
    (x.name.toLowerCase().includes(q) || String(x.code) === q)
  ).slice(0, 12);

  if (matches.length === 0) { drop.style.display = 'none'; return; }

  drop.innerHTML = matches.map(x =>
    '<div class="picker-option" onmousedown="pickerSelect(\'' + prefix + '\',' + x.code + ',\'' + x.name.replace(/'/g, "\\'") + '\')">' +
      '<span class="picker-opt-name">' + x.name + '</span>' +
      '<span class="picker-opt-code">' + x.code + '</span>' +
    '</div>'
  ).join('');
  drop.style.display = 'block';
}

function pickerSelect(prefix, code, name) {
  const state = pickerState[prefix];
  if (!state) return;
  if (!state.items.find(i => i.code === code)) {
    state.items.push({ code, name });
  }
  renderPickerTags(prefix);
  const inp = document.getElementById(prefix + 'PickerSearch');
  inp.value = '';
  document.getElementById(prefix + 'PickerDropdown').style.display = 'none';
  inp.focus();
}

function pickerRemove(prefix, code) {
  const state = pickerState[prefix];
  if (!state) return;
  state.items = state.items.filter(i => i.code !== code);
  renderPickerTags(prefix);
}

function renderPickerTags(prefix) {
  const state   = pickerState[prefix];
  const tagsDiv = document.getElementById(prefix + 'PickerTags');
  if (!state || !tagsDiv) return;
  if (state.items.length === 0) {
    tagsDiv.innerHTML = '<span class="picker-empty">None selected yet — type to search above</span>';
    return;
  }
  tagsDiv.innerHTML = state.items.map(i =>
    '<span class="picker-tag">' +
      i.name +
      '<span class="picker-tag-code"> (' + i.code + ')</span>' +
      '<button class="picker-tag-x" onclick="pickerRemove(\'' + prefix + '\',' + i.code + ')" title="Remove">&times;</button>' +
    '</span>'
  ).join('');
}

function getPickerValue(prefix) {
  const state = pickerState[prefix];
  if (!state || state.items.length === 0) return '';
  return state.items.map(i => i.code).join(' ');
}

/**
 * Smart getter called by templates.js for the filter value.
 * Returns picker codes for county/city, text input value for custom.
 */
function getFilterValue(prefix) {
  const filterType = document.getElementById(prefix + 'Filter').value;
  if (filterType === 'county' || filterType === 'city') {
    return getPickerValue(prefix);
  }
  return document.getElementById(prefix + 'FilterVal').value;
}


/* ═══════════════════════════════════════════════════════════
   CRASH TAB
═══════════════════════════════════════════════════════════ */
function crashPullChange() {
  const pm = document.querySelector('[name=crashPull]:checked').value;
  toggleSection('crashFilterSection', pm === 'nopull');
}
function crashFilterChange() { toggleFilterInput('crash'); }


/* ═══════════════════════════════════════════════════════════
   CVO TAB
═══════════════════════════════════════════════════════════ */
function cvoPullChange() {
  updateCvoSections();
}
function cvoModeChange() { updateCvoSections(); }
function cvoFilterChange() { toggleFilterInput('cvo'); }
function cvoOccFilterChange() { toggleFilterInput('cvoOcc'); }

function updateCvoSections() {
  const mode = document.querySelector('[name=cvoMode]:checked').value;
  const pm   = document.querySelector('[name=cvoPull]:checked').value;
  const crashSection = document.getElementById('cvoCrashFilterSection');
  const occSection   = document.getElementById('cvoOccFilterSection');

  if (crashSection) crashSection.style.display = mode === 'vehocc' ? 'none' : 'block';
  if (occSection)   occSection.style.display   = mode === 'vehocc' ? 'block' : 'none';

  if (mode === 'vehocc') {
    toggleSection('cvoOccFilterSection', pm === 'nopull');
    toggleFilterInput('cvoOcc');
  } else {
    toggleSection('cvoCrashFilterSection', pm === 'nopull');
    toggleFilterInput('cvo');
  }
}


/* ═══════════════════════════════════════════════════════════
   VEHICLE TAB
═══════════════════════════════════════════════════════════ */
function vehTypeChange() {
  const t = document.querySelector('[name=vehType]:checked').value;
  document.getElementById('vehBodySection').style.display = t === 'bodyquery' ? 'block' : 'none';
  toggleSection('vehStandardFilter', t === 'standard');
}
function vehFilterChange() { toggleFilterInput('veh'); }


/* ═══════════════════════════════════════════════════════════
   OCCUPANT TAB
═══════════════════════════════════════════════════════════ */
function occTypeChange() { /* filter always visible */ }
function occFilterChange() { toggleFilterInput('occ'); }


/* ═══════════════════════════════════════════════════════════
   SPECIAL TAB
═══════════════════════════════════════════════════════════ */
function specialTypeChange() {
  const t = document.querySelector('[name=specialType]:checked').value;
  document.getElementById('findRoadsSection').style.display = t === 'findroads' ? 'block' : 'none';
  document.getElementById('quickUCRSection').style.display  = t === 'quickucr'  ? 'block' : 'none';
}


/* ═══════════════════════════════════════════════════════════
   MAIN GENERATE FUNCTION
═══════════════════════════════════════════════════════════ */
function generate(type) {
  const errors = validateInputs(type);
  if (errors.length > 0) {
    alert('Please fix the following before generating:\n\n' + errors.join('\n'));
    return;
  }

  let code = '', badge = '';
  try {
    if (type === 'crash') {
      code = generateCrash(); badge = '1 output file';
    } else if (type === 'cvo') {
      const mode = document.querySelector('[name=cvoMode]:checked').value;
      code = generateCVO(); badge = '3 output files (Crash, Vehicle, Occupant)';
      badge = mode === 'crashveh' ? '2 output files (Crash, Vehicle)'
            : mode === 'crashocc' ? '2 output files (Crash, Occupant)'
            : mode === 'vehocc'   ? '2 output files (Vehicle, Occupant)'
            : '3 output files (Crash, Vehicle, Occupant)';
    } else if (type === 'vehicle') {
      code  = generateVehicle();
      badge = '1 output file';
    } else if (type === 'occupant') {
      const ot = document.querySelector('[name=occType]:checked').value;
      code  = generateOccupant();
      badge = '1 output file';
    } else if (type === 'special') {
      code  = generateSpecial();
      badge = document.querySelector('[name=specialType]:checked').value === 'motorcycles'
            ? '3 output files (CVO)' : '1 output file';
    }
  } catch (e) {
    code  = '/* Error generating code: ' + e.message + ' */';
    badge = 'Error';
    console.error(e);
  }

  const fmt = document.querySelector('[name=outFmt]:checked').value.toUpperCase();
  document.getElementById('codeOutput').textContent    = code;
  document.getElementById('outputBadge').textContent   = badge + ' · ' + fmt;
  document.getElementById('outputSection').style.display = 'block';
  document.getElementById('outputSection').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}


/* ═══════════════════════════════════════════════════════════
   INPUT VALIDATION
═══════════════════════════════════════════════════════════ */
function validateInputs(type) {
  const errors     = [];
  const drNum      = document.getElementById('drNum').value.trim();
  const folder     = document.getElementById('drFolder').value.trim();
  const yearStart  = parseInt(document.getElementById('yearStart').value);
  const yearEnd    = parseInt(document.getElementById('yearEnd').value);

  if (!drNum)  errors.push('• DR number is required');
  if (!folder) errors.push('• Output folder path is required');
  if (!yearStart || isNaN(yearStart)) errors.push('• Start year is required');
  if (!yearEnd   || isNaN(yearEnd))   errors.push('• End year is required');
  if (yearStart && yearEnd && yearStart > yearEnd)
    errors.push('• Start year cannot be after end year');
  if (yearStart < 1990 || yearEnd > 2099)
    errors.push('• Year range looks unusual — please double-check');

  if (document.getElementById('useDateRange').checked) {
    const ms = document.getElementById('monthStart').value;
    const me = document.getElementById('monthEnd').value;
    if (!ms || !me) errors.push('• When using date range, both start and end months are required');
    const ds = parseInt(document.getElementById('dayStart').value);
    const de = parseInt(document.getElementById('dayEnd').value);
    if (ds && (ds < 1 || ds > 31)) errors.push('• Start day must be 1–31');
    if (de && (de < 1 || de > 31)) errors.push('• End day must be 1–31');
  }

  return errors;
}


/* ═══════════════════════════════════════════════════════════
   COPY TO CLIPBOARD
═══════════════════════════════════════════════════════════ */
function copyCode() {
  const code = document.getElementById('codeOutput').textContent;
  const btns = document.querySelectorAll('.output-actions .btn');
  navigator.clipboard.writeText(code).then(function() {
    btns[0].textContent = '✓ Copied!';
    setTimeout(function() { btns[0].innerHTML = '&#128203; Copy to clipboard'; }, 2000);
  }).catch(function() {
    alert('Auto-copy not available in this browser.\nPlease click inside the code box and press Ctrl+A, then Ctrl+C.');
  });
}


/* ═══════════════════════════════════════════════════════════
   DOWNLOAD AS .sas FILE
═══════════════════════════════════════════════════════════ */
function downloadCode() {
  const dr   = document.getElementById('drNum').value.trim() || 'DR';
  const code = document.getElementById('codeOutput').textContent;
  const blob = new Blob([code], { type: 'text/plain' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'DR' + dr + '_SAS_Script.sas';
  a.click();
  URL.revokeObjectURL(a.href);
}


/* ═══════════════════════════════════════════════════════════
   SHARED HELPERS
═══════════════════════════════════════════════════════════ */

function toggleSection(sectionId, enabled) {
  const el = document.getElementById(sectionId);
  el.style.opacity       = enabled ? '1'  : '0.35';
  el.style.pointerEvents = enabled ? ''   : 'none';
}

/**
 * Show the right input based on the selected filter type.
 * county/city  → lookup picker
 * custom       → plain text input
 */
function toggleFilterInput(prefix) {
  const v        = document.getElementById(prefix + 'Filter').value;
  const inputDiv = document.getElementById(prefix + 'FilterInput');
  const textInp  = document.getElementById(prefix + 'FilterVal');
  const pickerEl = document.getElementById(prefix + 'Picker');
  const lbl      = document.getElementById(prefix + 'FilterLabel');

  const hide = (v === 'none' || v === 'animals');
  inputDiv.style.display = hide ? 'none' : 'block';
  if (hide) return;

  if (v === 'county' || v === 'city') {
    textInp.style.display  = 'none';
    pickerEl.style.display = 'block';
    lbl.textContent = v === 'county' ? 'Select counties:' : 'Select cities:';
    initPicker(prefix, v);
  } else {
    textInp.style.display  = 'block';
    pickerEl.style.display = 'none';
    lbl.textContent     = 'Custom WHERE expression';
    textInp.placeholder = 'county=4 and year>=2022';
  }
}
