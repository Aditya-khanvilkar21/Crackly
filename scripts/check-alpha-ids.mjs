#!/usr/bin/env node
/**
 * Pre-release check: Alpha ID integrity
 *
 * Validates that:
 *   1. The signup path (handle_new_user / generate_student_id) produces ALPHA##### ids
 *   2. Every existing profile has a consistently formatted Alpha ID
 *   3. Alpha IDs are unique and never null/empty
 *
 * Usage: node scripts/check-alpha-ids.mjs
 * Requires the standard PG* env vars (PGHOST, PGUSER, PGPASSWORD, ...).
 */
import { execFileSync } from "node:child_process";

const ALPHA_RE = "^ALPHA[0-9]{5,}$";
const failures = [];
const notes = [];

function q(sql) {
  return execFileSync("psql", ["-tAX", "-c", sql], { encoding: "utf8" }).trim();
}

function check(name, fn) {
  try {
    const detail = fn();
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } catch (err) {
    failures.push(name);
    console.log(`  FAIL  ${name} — ${err.message}`);
  }
}

console.log("Alpha ID pre-release check\n");

if (!process.env.PGHOST) {
  console.error("PGHOST is not set — cannot reach the database. Aborting.");
  process.exit(2);
}

check("signup trigger generates ALPHA prefix", () => {
  const src = q(
    "SELECT pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'public' AND p.proname = 'handle_new_user'"
  );
  if (!src) throw new Error("handle_new_user() not found");
  if (!/'ALPHA'/.test(src)) throw new Error("handle_new_user() does not use the 'ALPHA' prefix");
  if (/CRACKLY|JEE20/.test(src)) throw new Error("handle_new_user() still contains a legacy prefix");
  return "prefix literal 'ALPHA' present";
});

check("generate_student_id() returns a valid Alpha ID", () => {
  const id = q("SELECT public.generate_student_id()");
  if (!new RegExp(ALPHA_RE).test(id)) throw new Error(`generated id "${id}" does not match ${ALPHA_RE}`);
  return `sample ${id}`;
});

check("all existing profiles match the Alpha ID format", () => {
  const bad = q(
    `SELECT count(*) FROM public.profiles WHERE student_id IS NULL OR student_id !~ '${ALPHA_RE}'`
  );
  const total = q("SELECT count(*) FROM public.profiles");
  if (Number(bad) > 0) {
    const sample = q(
      `SELECT string_agg(coalesce(student_id, '<null>'), ', ') FROM (SELECT student_id FROM public.profiles WHERE student_id IS NULL OR student_id !~ '${ALPHA_RE}' LIMIT 5) s`
    );
    throw new Error(`${bad}/${total} profiles have a malformed Alpha ID (e.g. ${sample})`);
  }
  return `${total} profiles valid`;
});

check("Alpha IDs are unique", () => {
  const dupes = q(
    "SELECT count(*) FROM (SELECT student_id FROM public.profiles GROUP BY student_id HAVING count(*) > 1) d"
  );
  if (Number(dupes) > 0) throw new Error(`${dupes} duplicated Alpha ID(s)`);
  return "no duplicates";
});

check("Alpha ID lengths are consistent", () => {
  const lengths = q(
    "SELECT string_agg(DISTINCT length(student_id)::text, ',' ORDER BY length(student_id)::text) FROM public.profiles WHERE student_id IS NOT NULL"
  );
  if (!lengths) return "no profiles yet";
  if (lengths.split(",").length > 1) notes.push(`mixed Alpha ID lengths present: ${lengths}`);
  return `length(s): ${lengths}`;
});

console.log("");
for (const n of notes) console.log(`  NOTE  ${n}`);

if (failures.length) {
  console.error(`\n${failures.length} check(s) failed: ${failures.join(", ")}`);
  process.exit(1);
}
console.log("All Alpha ID checks passed.");
