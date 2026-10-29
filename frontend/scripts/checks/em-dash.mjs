// Regression check: no em dash (U+2014) in user-visible frontend copy.
//
//   pnpm check:em-dash
//
// Scans app/, components/, lib/, content/ and types/ for the literal "—"
// character and fails if any is found outside a comment. Comments are
// recognised with a simple single-pass scanner (tracks // and /* */ state
// per line) rather than a full parser, so it can be fooled by a "//" or
// "/*" that appears inside a string literal, acceptable for a lightweight
// guard: a false negative there is rare and a human review of new copy
// still catches it. Dynamic WordPress content is handled separately at
// render time by normalizeEmDash() in lib/wordpress/html-blocks.ts, not by
// this script (it only sees source files).
//
// Exits 1 and prints every offending file:line if any are found.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));
const SCAN_DIRS = ["app", "components", "lib", "content", "types"];
const EXTENSIONS = new Set([".ts", ".tsx"]);
const DASH = "—";

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, out);
    } else if (EXTENSIONS.has(path.extname(entry.name))) {
      out.push(full);
    }
  }
}

/** Splits a line into { code, comment } at the first unquoted "//". Good enough for this guard, see header note. */
function splitLineComment(line) {
  let inString = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inString) {
      if (ch === "\\") i++;
      else if (ch === inString) inString = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === "`") {
      inString = ch;
      continue;
    }
    if (ch === "/" && line[i + 1] === "/") {
      return { code: line.slice(0, i), comment: line.slice(i) };
    }
  }
  return { code: line, comment: "" };
}

function scanFile(file) {
  const text = fs.readFileSync(file, "utf8");
  if (!text.includes(DASH)) return [];
  const lines = text.split("\n");
  const offenses = [];
  let inBlockComment = false;
  lines.forEach((rawLine, i) => {
    let line = rawLine;
    if (inBlockComment) {
      const end = line.indexOf("*/");
      if (end === -1) return; // whole line is inside the block comment
      line = line.slice(end + 2);
      inBlockComment = false;
    }
    const { code, comment } = splitLineComment(line);
    let codeOnly = code;
    // Strip any /* ... */ block comment(s) that start and end within this line's code portion.
    let blockStart;
    while ((blockStart = codeOnly.indexOf("/*")) !== -1) {
      const blockEnd = codeOnly.indexOf("*/", blockStart + 2);
      if (blockEnd === -1) {
        codeOnly = codeOnly.slice(0, blockStart);
        inBlockComment = true;
        break;
      }
      codeOnly = codeOnly.slice(0, blockStart) + codeOnly.slice(blockEnd + 2);
    }
    if (codeOnly.includes(DASH)) {
      offenses.push({ line: i + 1, text: rawLine.trim() });
    }
    void comment; // intentionally not checked: comments are out of scope
  });
  return offenses;
}

const files = [];
for (const dir of SCAN_DIRS) {
  const full = path.join(ROOT, dir);
  if (fs.existsSync(full)) walk(full, files);
}

let total = 0;
const failing = [];
for (const file of files) {
  const offenses = scanFile(file);
  if (offenses.length) {
    failing.push({ file: path.relative(ROOT, file), offenses });
    total += offenses.length;
  }
}

if (total === 0) {
  console.log(`em dash check: 0 occurrences across ${files.length} files`);
  process.exitCode = 0;
} else {
  console.log(`em dash check: ${total} occurrence(s) found outside comments\n`);
  for (const { file, offenses } of failing) {
    for (const o of offenses) {
      console.log(`  ${file}:${o.line}  ${o.text}`);
    }
  }
  console.log(
    "\nReplace the dash with punctuation that fits the sentence (comma, colon, period, parentheses, or a hyphen for a title separator). Do not blindly swap every instance for the same character."
  );
  process.exitCode = 1;
}
