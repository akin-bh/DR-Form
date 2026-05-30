/*
 * js/helpers.js — Shared utility functions
 * =========================================
 * Edit this file when:
 *   - The year format logic changes
 *   - You need a new WHERE clause type
 *   - The common config fields change
 *   - The structure of %my(), fmtDS, expDS changes
 *
 * These functions are used by templates.js.
 * Do NOT put UI logic here — that goes in ui.js.
 * =========================================
 */


/* ── Year conversion ─────────────────────────────────────
   SAS %my() uses 2-digit years (e.g. 2023 → '23')
──────────────────────────────────────────────────────── */
function twoDigit(y) {
  if (!y) return '??';
  return String(parseInt(y)).slice(-2).padStart(2, '0');
}


/* ── Read all common config values from the form ─────────
   Returns an object used by every template generator.
──────────────────────────────────────────────────────── */
function getConfig() {
  const outFmt = document.querySelector('[name=outFmt]:checked').value;
  const ys = parseInt(document.getElementById('yearStart').value) || 0;
  const ye = parseInt(document.getElementById('yearEnd').value)   || 0;

  // ── Optional specific date range ──────────────────────
  let dateWhere = '';
  if (document.getElementById('useDateRange').checked) {
    const ms  = parseInt(document.getElementById('monthStart').value) || 0;
    const ds  = parseInt(document.getElementById('dayStart').value)   || 1;
    const me  = parseInt(document.getElementById('monthEnd').value)   || 0;
    const de  = parseInt(document.getElementById('dayEnd').value)     || 31;
    if (ms && me && ys && ye) {
      const months = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];
      const d1 = String(ds).padStart(2,'0') + months[ms - 1] + String(ys);
      const d2 = String(de).padStart(2,'0') + months[me - 1] + String(ye);
      const d1lit = "'" + d1 + "'d";
      const d2lit = "'" + d2 + "'d";
      dateWhere = 'crashdate >= ' + d1lit + ' and crashdate <= ' + d2lit;
    }
  }

  return {
    dr:        document.getElementById('drNum').value.trim() || 'DR#',
    folder:    document.getElementById('drFolder').value.trim().replace(/\\+$/, '') || 'R:\\YOUR-DR-FOLDER',
    macroPath: document.getElementById('macroPath').value.trim(),
    macroPreset: document.getElementById('macroPreset').value,
    customMacros: document.getElementById('customMacroLines') ? document.getElementById('customMacroLines').value.trim() : '',
    yRange:    twoDigit(ys) + '-' + twoDigit(ye),
    outFmt:    outFmt,
    ext:       outFmt === 'xlsx' ? 'xlsx' : 'csv',
    dbms:      outFmt === 'xlsx' ? 'xlsx' : 'csv LABEL',
    dateWhere:    dateWhere,
    reviewLinks:  document.getElementById('macroPreset').value !== 'noreview',
  };
}


/* ── Build a WHERE argument string for %my() ─────────────
   Returns something like: ,\n  where=(county=4 or county=18)
   Returns '' if no filter applies.

   filterType: 'none' | 'county' | 'city' | 'animals' | 'custom'
   value:      raw input string (space/comma separated codes for county/city)
  dateWhere:  optional date condition from getConfig().dateWhere
          e.g. "crashdate >= '15JAN2020'd and crashdate <= '31MAR2024'd"
──────────────────────────────────────────────────────── */
function buildWhere(filterType, value, dateWhere) {
  const conditions = [];

  // ── Location / type filter ──────────────────────────────
  if (filterType === 'animals') {
    conditions.push('((class=9) or (fhe=82))');
  } else if (filterType === 'county' || filterType === 'city') {
    const v = (value || '').trim();
    if (v) {
      const field = filterType === 'county' ? 'county' : 'city';
      const nums  = v.split(/[\s,]+/).filter(Boolean);
      const part  = nums.map(n => field + '=' + n).join(' or ');
      conditions.push(nums.length > 1 ? '(' + part + ')' : part);
    }
  } else if (filterType === 'custom') {
    const v = (value || '').trim();
    if (v) conditions.push('(' + v + ')');
  }

  // ── Date filter (optional) ──────────────────────────────
  if (dateWhere) conditions.push(dateWhere);

  if (conditions.length === 0) return '';
  return ',\n  where=(' + conditions.join(' and ') + ')';
}


/* ── Add dataset load lines to code array L ──────────────
   Handles both NoPull and pull-from-file methods.

   params = {
     name:       dataset name (e.g. 'crash', 'veh', 'occ')
     lib:        library alias (e.g. 'crash', 'veh', 'occ')
     finalSort:  sort key after load (e.g. 'ucrnumber year vehno')
     pullMethod: 'nopull' | 'csv' | 'dbf' | 'grpcsv'
     yRange:     e.g. '20-24'
     whereArg:   output of buildWhere() — only used for nopull
   }
──────────────────────────────────────────────────────── */
function loadDS(L, params) {
  const { name, lib, finalSort, pullMethod, yRange, whereArg } = params;

  if (pullMethod === 'nopull') {
    L.push('%my(' + name + ', l=' + lib + ', y=' + yRange + whereArg + ');');
    L.push('proc sort data=' + name + '; by ' + finalSort + '; run;');
  } else {
    L.push('%my(all' + name + ', l=' + lib + ', y=' + yRange + ');');
    L.push('proc sort data=all' + name + '; by ucrnumber year; run;');
    L.push('');
    L.push('data ' + name + ';');
    L.push('  merge import (in=a) all' + name + ' (in=b);');
    L.push('  by ucrnumber year;');
    L.push('  if a=1;');
    L.push('run;');
    if (finalSort !== 'ucrnumber year') {
      L.push('proc sort data=' + name + '; by ' + finalSort + '; run;');
    }
  }
}


/* ── Add retain/format/drop block to code array L ────────
   name:     dataset name (e.g. 'crash')
   prefix:   macro prefix (e.g. 'crash', 'vehicle', 'occupant')
   links:    (crash only) 'yes' = include %link_appendloc to build Links field
                          'no'  = drop AppendLoc+Links via %NoReviewNeeded_macro
                          omit  = leave as-is (non-crash datasets)
──────────────────────────────────────────────────────── */
function fmtDS(L, name, prefix, links, customMacros) {
  L.push('data ' + name + ';');
  L.push('  retain %' + prefix + '_retain_macro;');
  L.push('  set ' + name + ';');
  L.push('  format %' + prefix + '_format_macro;');
  if (links === 'yes') {
    L.push('  %link_appendloc;');
  }
  if (customMacros) {
    customMacros.split(/\r?\n/).map(function(line) { return line.trim(); }).filter(Boolean).forEach(function(line) {
      L.push(line.startsWith(' ') ? line : '  ' + line);
    });
  }
  L.push('  drop %' + prefix + '_drop_macro;');
  if (links === 'no') {
    L.push('  drop %NoReviewNeeded_macro;');
  }
  L.push('RUN;');
}


/* ── Add PROC EXPORT lines to code array L ───────────────
   params = { name, suffix, folder, dr, ext, dbms }
──────────────────────────────────────────────────────── */
function expDS(L, params) {
  const { name, suffix, folder, dr, ext, dbms } = params;
  L.push('PROC EXPORT DATA=' + name);
  L.push('  OUTFILE="' + folder + '\\' + dr + '_' + suffix + '.' + ext + '"');
  L.push('  DBMS=' + dbms + ' REPLACE; RUN;');
}


/* ── Add CSV or DBF import block to code array L ─────────
   pullMethod: 'csv' | 'grpcsv' | 'dbf'
   hasGRP:     true if importing GRP column too
──────────────────────────────────────────────────────── */
function importBlock(L, params) {
  const { pullMethod, folder, dr, hasGRP } = params;

  if (pullMethod === 'csv' || pullMethod === 'grpcsv') {
    L.push('/* Step 1: Import UCR list from CSV */');
    L.push('data import;');
    L.push('  format UCRnumber $13. Year 4.' + (hasGRP ? ' GRP $50.;' : ';'));
    L.push("  infile '" + folder + '\\' + dr + ".csv'");
    L.push("    dlm=',' dsd missover firstobs=2;");
    L.push('  input UCRnumber Year $' + (hasGRP ? ' GRP $;' : ';'));
    L.push('run;');
    L.push('proc sort data=import; by ucrnumber year; run;');
    L.push('');
  } else if (pullMethod === 'dbf') {
    L.push('/* Step 1: Import UCR list from DBF */');
    L.push('proc import');
    L.push("  datafile = '" + folder + '\\' + dr + ".dbf'");
    L.push('  out=import REPLACE dbms=dbf;');
    L.push('');
    L.push('data import;');
    L.push('  format UCRnumber $13.; length UCRnumber $13.;');
    L.push('  set import;');
    L.push('run;');
    L.push('proc sort data=import; by ucrnumber year; run;');
    L.push('');
  }
}


/* ── Add the standard comment header to code array L ─────  */
function addHeader(L, dr, templateName) {
  L.push('/* ==============================================');
  L.push('   Data Request : ' + dr);
  L.push('   Template     : ' + templateName);
  L.push('   Generated by : DR SAS Code Generator (TRU)');
  L.push('   ============================================== */');
  L.push('');
}
