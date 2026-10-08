/*
 * Imports Bata employees (employee code, name, designation) from
 * scripts/data/bata-employees.psv into the User collection.
 *
 *   npm run import:employees                 # create missing, update changed names/designations
 *   npm run import:employees -- --dry-run    # report only, write nothing
 *   npm run import:employees -- --reset-passwords   # also reset every listed employee to the starting password
 *
 * Every employee signs in with their employee code and the starting password
 * (EMPLOYEE_DEFAULT_PASSWORD in .env.local, or --password=...; required, never
 * committed) and is asked to set their own password on first login. The CSR
 * team (director) can reset any password from Dashboard → Employees.
 *
 * The data file is deliberately git-ignored: it is a list of real people.
 *
 * Safe to re-run: existing accounts keep their password (unless --reset-passwords),
 * their email, phone, avatar and active flag.
 */
import { readFileSync } from "node:fs";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// Load .env.local (plain node script — no Next.js env loading here).
try {
  for (const line of readFileSync(new URL("../.env.local", import.meta.url), "utf8").split("\n")) {
    const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim();
  }
} catch {
  /* .env.local optional */
}

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const resetPasswords = args.includes("--reset-passwords");
const passwordArg = args.find((a) => a.startsWith("--password="))?.slice("--password=".length);
const DEFAULT_PASSWORD = passwordArg || process.env.EMPLOYEE_DEFAULT_PASSWORD;
const DATA_FILE = new URL("./data/bata-employees.psv", import.meta.url);
const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/bata-csr";

if (!DEFAULT_PASSWORD || DEFAULT_PASSWORD.length < 8) {
  console.error("✖ Set EMPLOYEE_DEFAULT_PASSWORD in .env.local (or pass --password=...), at least 8 characters.");
  process.exit(1);
}

// Keep in sync with EMPLOYEE_CODE_PATTERN in lib/models.ts.
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9/-]{2,19}$/;

/* ── Parse ─────────────────────────────────────────────── */

const clean = (s) => s.replace(/[–—]/g, "-").replace(/\s+/g, " ").trim();
const titleCase = (s) => s.toLowerCase().replace(/(^|[\s'.-])\p{L}/gu, (c) => c.toUpperCase());

const rows = [];
const problems = [];
const lines = readFileSync(DATA_FILE, "utf8").split("\n");
lines.forEach((raw, i) => {
  const line = raw.trim();
  if (!line || line.startsWith("#")) return;
  const parts = line.split("|").map(clean);
  if (parts.length !== 3 || parts.some((p) => !p)) {
    problems.push(`line ${i + 1}: expected "code|name|designation", got: ${line}`);
    return;
  }
  const [code, rawName, designation] = parts;
  const employeeCode = code.toUpperCase();
  if (!CODE_PATTERN.test(employeeCode)) problems.push(`line ${i + 1}: bad employee code "${code}"`);
  // The HR extract has a handful of ALL-CAPS names; normalise only those.
  const name = rawName === rawName.toUpperCase() ? titleCase(rawName) : rawName;
  rows.push({ employeeCode, name, designation, line: i + 1 });
});

const seen = new Map();
for (const r of rows) {
  if (seen.has(r.employeeCode)) {
    problems.push(`duplicate employee code ${r.employeeCode} (lines ${seen.get(r.employeeCode)} and ${r.line})`);
  }
  seen.set(r.employeeCode, r.line);
}
if (problems.length) {
  console.error("✖ Data file problems — nothing imported:");
  for (const p of problems) console.error("  - " + p);
  process.exit(1);
}
console.log(`Parsed ${rows.length} employees from ${DATA_FILE.pathname}`);
if (dryRun) console.log("DRY RUN — no changes will be written.");

/* ── Connect & make sure the indexes allow email-less users ─ */

await mongoose.connect(uri);
const col = mongoose.connection.collection("users");

async function ensureIndexes() {
  const indexes = await col.indexes();
  const email = indexes.find((i) => i.name === "email_1");
  if (email && !(email.sparse || email.partialFilterExpression)) {
    // The original index was unique but not sparse, which would reject a second
    // user without an email. lib/models.ts now declares it sparse.
    console.log("Rebuilding email_1 index as unique + sparse …");
    if (!dryRun) {
      await col.dropIndex("email_1");
      await col.createIndex({ email: 1 }, { unique: true, sparse: true, name: "email_1" });
    }
  } else if (!email && !dryRun) {
    await col.createIndex({ email: 1 }, { unique: true, sparse: true, name: "email_1" });
  }
  if (!indexes.find((i) => i.name === "employeeCode_1") && !dryRun) {
    await col.createIndex({ employeeCode: 1 }, { unique: true, sparse: true, name: "employeeCode_1" });
  }
}
await ensureIndexes();

/* ── Import ────────────────────────────────────────────── */

const User = mongoose.model(
  "User",
  new mongoose.Schema(
    {
      name: String,
      email: String,
      passwordHash: String,
      role: String,
      designation: String,
      employeeCode: String,
      active: Boolean,
      mustChangePassword: Boolean,
      selfRegistered: Boolean,
    },
    { timestamps: true, strict: false }
  )
);

const counts = { created: 0, updated: 0, unchanged: 0, passwordsReset: 0, skipped: 0 };
const skipped = [];

for (const r of rows) {
  const existing = await User.findOne({ employeeCode: r.employeeCode });

  if (!existing) {
    counts.created++;
    if (!dryRun) {
      await User.create({
        name: r.name,
        employeeCode: r.employeeCode,
        designation: r.designation,
        role: "employee",
        passwordHash: await bcrypt.hash(DEFAULT_PASSWORD, 10),
        active: true,
        mustChangePassword: true,
        selfRegistered: false,
      });
    }
    continue;
  }

  if (existing.role !== "employee") {
    counts.skipped++;
    skipped.push(`${r.employeeCode} ${r.name}: existing account is a ${existing.role}, left untouched`);
    continue;
  }

  const set = {};
  if (existing.name !== r.name) set.name = r.name;
  if ((existing.designation ?? "") !== r.designation) set.designation = r.designation;
  if (resetPasswords) {
    set.passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);
    set.mustChangePassword = true;
    counts.passwordsReset++;
  }
  if (Object.keys(set).length === 0) {
    counts.unchanged++;
    continue;
  }
  counts.updated++;
  if (!dryRun) await User.updateOne({ _id: existing._id }, { $set: set });
}

// Employee accounts that exist in the portal but are not in the HR file.
const listed = new Set(rows.map((r) => r.employeeCode));
const extra = await User.find({ role: "employee" }, { name: 1, employeeCode: 1, email: 1 }).lean();
const notInFile = extra.filter((u) => !listed.has(u.employeeCode ?? ""));

await mongoose.disconnect();

console.log(`\n${dryRun ? "Would import" : "Imported"}:`);
console.log(`   created   ${counts.created}`);
console.log(`   updated   ${counts.updated} (name/designation${resetPasswords ? "/password" : ""})`);
console.log(`   unchanged ${counts.unchanged}`);
if (resetPasswords) console.log(`   passwords reset ${counts.passwordsReset}`);
if (counts.skipped) {
  console.log(`   skipped   ${counts.skipped}`);
  for (const s of skipped) console.log("     - " + s);
}
if (notInFile.length) {
  console.log(`\nℹ ${notInFile.length} employee account(s) in the portal are not in the HR file (left as they are):`);
  for (const u of notInFile) console.log(`   - ${u.employeeCode ?? "(no code)"} ${u.name} ${u.email ?? ""}`);
}
if (!dryRun && counts.created) {
  console.log(`\nNew employees sign in with their employee code and the starting password "${DEFAULT_PASSWORD}",`);
  console.log("and are asked to set their own password on first login.");
}
