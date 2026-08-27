#!/usr/bin/env node
import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const THEMES_DIR = 'themes';

const ID_RE = /^[a-z0-9_-]{2,40}$/;
const HEX_RE = /^#(?:[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

const REQUIRED_COLOR_KEYS = [
  'background', 'onBackground', 'surface', 'onSurface', 'surfaceVariant', 'scrim',
  'accent', 'onAccent', 'buttonNormal', 'buttonFocused', 'buttonDisabled', 'buttonActive',
  'onButtonNormal', 'onButtonFocused', 'onButtonDisabled', 'inputBackground', 'inputFocused',
  'inputBorder', 'inputBorderFocused', 'rangeTrack', 'rangeProgress', 'rangeThumb', 'seekbarBuffered',
  'badgeBackground', 'onBadge', 'badgeUnplayed', 'badgeWatched', 'recordingActive', 'recordingScheduled',
];
const REQUIRED_SEMANTIC_KEYS = [
  'statusAvailable', 'statusRequested', 'statusPending', 'statusDownloading',
  'mediaTypeBadgeMovie', 'mediaTypeBadgeShow',
];
const REQUIRED_BOOK_COLOR_KEYS = [
  'background', 'accent', 'mutedText', 'primaryText', 'sectionTitle', 'divider',
  'placeholder', 'shadow', 'gradientTop', 'gradientBottom', 'inactiveChip',
];
const RADIUS_CORNERS = ['topLeft', 'topRight', 'bottomLeft', 'bottomRight'];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function color(owner, key, path, e) {
  if (!isObj(owner) || !(key in owner)) { e.push(`${path} is required`); return; }
  colorVal(owner[key], path, e);
}
function colorVal(v, path, e) {
  if (typeof v !== 'string' || !HEX_RE.test(v)) e.push(`${path} must be a color (#RRGGBB or #AARRGGBB)`);
}
function num(owner, key, path, min, max, e) {
  if (!isObj(owner) || !(key in owner)) { e.push(`${path} is required`); return; }
  numVal(owner[key], path, min, max, e);
}
function numVal(v, path, min, max, e) {
  if (!isNum(v)) { e.push(`${path} must be a number`); return; }
  if (v < min || v > max) e.push(`${path} must be between ${min} and ${max}`);
}
function reqObj(owner, key, path, e) {
  if (!isObj(owner) || !(key in owner)) { e.push(`${path} is required`); return null; }
  if (!isObj(owner[key])) { e.push(`${path} must be an object`); return null; }
  return owner[key];
}
function reqStr(owner, key, path, e) {
  if (!(key in owner)) { e.push(`${path} is required`); return ''; }
  const v = owner[key];
  if (typeof v !== 'string') { e.push(`${path} must be a string`); return ''; }
  if (!v.trim()) { e.push(`${path} cannot be empty`); return ''; }
  return v;
}
function borderObj(b, path, e) {
  color(b, 'color', `${path}.color`, e);
  num(b, 'width', `${path}.width`, 0, 16, e);
}
function reqBorder(owner, key, path, e) {
  const b = reqObj(owner, key, path, e);
  if (b) borderObj(b, path, e);
}
function radius(owner, key, path, e) {
  if (!isObj(owner) || !(key in owner)) { e.push(`${path} is required`); return; }
  const r = owner[key];
  if (isNum(r)) { numVal(r, path, 0, 9999, e); return; }
  if (!isObj(r)) { e.push(`${path} must be a number or corner object`); return; }
  for (const c of RADIUS_CORNERS) num(r, c, `${path}.${c}`, 0, 9999, e);
}
function shadowArray(arr, path, allowSpread, e) {
  if (!Array.isArray(arr)) { e.push(`${path} must be an array`); return; }
  if (arr.length > 8) e.push(`${path} must contain at most 8 entries`);
  arr.forEach((entry, i) => {
    const p = `${path}[${i}]`;
    if (!isObj(entry)) { e.push(`${p} must be an object`); return; }
    color(entry, 'color', `${p}.color`, e);
    num(entry, 'blurRadius', `${p}.blurRadius`, 0, 64, e);
    num(entry, 'offsetX', `${p}.offsetX`, -500, 500, e);
    num(entry, 'offsetY', `${p}.offsetY`, -500, 500, e);
    if ('spreadRadius' in entry) {
      if (!allowSpread) {
        if (!isNum(entry.spreadRadius) || Math.abs(entry.spreadRadius) > 0) e.push(`${p}.spreadRadius must be 0 for textGlow`);
      } else {
        numVal(entry.spreadRadius, `${p}.spreadRadius`, -32, 32, e);
      }
    } else if (allowSpread) {
      e.push(`${p}.spreadRadius is required`);
    }
  });
}
const hasScript = (s) => /<\/?script/i.test(s);

function validate(t, e) {
  if (!isObj(t)) { e.push('theme must be a JSON object'); return; }

  if ('schemaVersion' in t) {
    if (!Number.isInteger(t.schemaVersion)) e.push('schemaVersion must be an integer');
    else if (t.schemaVersion > 1) e.push('schemaVersion must be 1 or lower');
  }

  const id = reqStr(t, 'id', 'id', e).trim();
  if (id && !ID_RE.test(id)) e.push('id must match ^[a-z0-9_-]{2,40}$');

  const displayName = reqStr(t, 'displayName', 'displayName', e);
  if (hasScript(displayName)) e.push('displayName cannot contain script tags');
  if (typeof t.description === 'string' && hasScript(t.description)) e.push('description cannot contain script tags');

  const colors = reqObj(t, 'colors', 'colors', e);
  if (colors) for (const k of REQUIRED_COLOR_KEYS) color(colors, k, `colors.${k}`, e);

  const semantic = reqObj(t, 'semantic', 'semantic', e);
  if (semantic) for (const k of REQUIRED_SEMANTIC_KEYS) color(semantic, k, `semantic.${k}`, e);

  const book = reqObj(t, 'book', 'book', e);
  if (book) {
    for (const k of REQUIRED_BOOK_COLOR_KEYS) color(book, k, `book.${k}`, e);
    if (!('placeholderPalette' in book)) e.push('book.placeholderPalette is required');
    else if (!Array.isArray(book.placeholderPalette)) e.push('book.placeholderPalette must be an array');
    else {
      if (book.placeholderPalette.length < 1 || book.placeholderPalette.length > 16) e.push('book.placeholderPalette must contain 1 to 16 colors');
      book.placeholderPalette.forEach((c, i) => colorVal(c, `book.placeholderPalette[${i}]`, e));
    }
  }

  const borders = reqObj(t, 'borders', 'borders', e);
  if (borders) {
    reqBorder(borders, 'cardBorder', 'borders.cardBorder', e);
    reqBorder(borders, 'chipBorder', 'borders.chipBorder', e);
    reqBorder(borders, 'focusBorder', 'borders.focusBorder', e);
    radius(borders, 'cardRadius', 'borders.cardRadius', e);
    radius(borders, 'chipRadius', 'borders.chipRadius', e);
    color(borders, 'chipBackground', 'borders.chipBackground', e);
    if ('navBorder' in borders && borders.navBorder !== null) {
      if (!isObj(borders.navBorder)) e.push('borders.navBorder must be an object when provided');
      else borderObj(borders.navBorder, 'borders.navBorder', e);
    }
    if (!('focusGlow' in borders)) e.push('borders.focusGlow is required');
    else shadowArray(borders.focusGlow, 'borders.focusGlow', true, e);
  }

  if ('textGlow' in t) shadowArray(t.textGlow, 'textGlow', false, e);
  if ('navColorCycle' in t) {
    if (!Array.isArray(t.navColorCycle)) e.push('navColorCycle must be an array when provided');
    else {
      if (t.navColorCycle.length > 16) e.push('navColorCycle must contain at most 16 colors');
      t.navColorCycle.forEach((c, i) => colorVal(c, `navColorCycle[${i}]`, e));
    }
  }
}

function main() {
  let files;
  try {
    files = readdirSync(THEMES_DIR).filter((f) => f.toLowerCase().endsWith('.json'));
  } catch {
    console.error(`No "${THEMES_DIR}/" directory found.`);
    process.exit(1);
  }

  const seenIds = new Map();
  let failed = false;

  for (const file of files.sort()) {
    const path = join(THEMES_DIR, file);
    const errors = [];
    let theme;
    try {
      theme = JSON.parse(readFileSync(path, 'utf8'));
    } catch (err) {
      console.error(`FAIL ${path}: invalid JSON: ${err.message}`);
      failed = true;
      continue;
    }
    validate(theme, errors);

    if (isObj(theme) && typeof theme.id === 'string' && theme.id.trim()) {
      const id = theme.id.trim();
      if (file !== `${id}.theme.json`) errors.push(`file must be named "${id}.theme.json" to match its id`);
      if (seenIds.has(id)) errors.push(`duplicate id "${id}" (also in ${seenIds.get(id)})`);
      else seenIds.set(id, file);
    }

    if (errors.length) {
      failed = true;
      console.error(`FAIL ${path}:`);
      for (const err of errors) console.error(`    - ${err}`);
    } else {
      console.log(`OK ${path}`);
    }
  }

  if (failed) {
    console.error('\nTheme validation failed.');
    process.exit(1);
  }
  console.log(`\nAll ${files.length} theme(s) valid.`);
}

main();
