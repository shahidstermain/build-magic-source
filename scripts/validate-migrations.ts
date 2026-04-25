#!/usr/bin/env bun
/**
 * Static validator for supabase/migrations/*.sql.
 *
 * Flags risky patterns before deploying. Exits 1 on any finding so it can
 * be wired into pre-push hooks or CI. Run with: `bun run db:validate`.
 *
 * Checks:
 *  - New `CREATE TABLE public.*` without a matching `ENABLE ROW LEVEL SECURITY`.
 *  - New tables without at least one `CREATE POLICY` in the same file.
 *  - Destructive statements: DROP TABLE, TRUNCATE, DROP POLICY, DROP SCHEMA.
 *  - `CREATE POLICY ... FOR INSERT|UPDATE|ALL` missing `WITH CHECK`.
 *  - `SECURITY DEFINER` functions without `SET search_path`.
 *  - Foreign keys referencing `auth.users` (should reference profiles instead).
 *  - Modifications to reserved schemas (auth, storage, realtime, vault, supabase_functions).
 *  - Raw `ALTER DATABASE postgres` (disallowed by Lovable Cloud).
 *
 * Also prints a summary of schema/RLS changes detected per migration so you
 * can eyeball what will deploy.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const RESERVED_SCHEMAS = ["auth", "storage", "realtime", "vault", "supabase_functions"];

type Finding = { file: string; rule: string; detail: string };

const findings: Finding[] = [];
const summary: Array<{ file: string; tables: string[]; policies: number; functions: number; destructive: number }> = [];

function listMigrationFiles(): string[] {
  try {
    return readdirSync(MIGRATIONS_DIR)
      .filter((f) => f.endsWith(".sql"))
      .filter((f) => statSync(join(MIGRATIONS_DIR, f)).isFile())
      .sort();
  } catch {
    return [];
  }
}

function stripComments(sql: string): string {
  // Remove -- line comments and /* */ block comments
  return sql.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
}

function check(file: string, sql: string) {
  const clean = stripComments(sql);
  const lower = clean.toLowerCase();

  // --- Collect created tables in public schema ---
  const tableRe = /create\s+table\s+(?:if\s+not\s+exists\s+)?(?:public\.)?"?([a-z_][a-z0-9_]*)"?/gi;
  const createdTables: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tableRe.exec(clean))) createdTables.push(m[1]);

  // --- RLS enable / policies for those tables ---
  for (const t of createdTables) {
    const rlsOn = new RegExp(`alter\\s+table\\s+(?:public\\.)?"?${t}"?\\s+enable\\s+row\\s+level\\s+security`, "i").test(clean);
    if (!rlsOn) {
      findings.push({ file, rule: "RLS_NOT_ENABLED", detail: `Table public.${t} has no ENABLE ROW LEVEL SECURITY in this file.` });
    }
    const hasPolicy = new RegExp(`create\\s+policy[\\s\\S]*?on\\s+(?:public\\.)?"?${t}"?`, "i").test(clean);
    if (!hasPolicy) {
      findings.push({ file, rule: "NO_POLICY", detail: `Table public.${t} has no CREATE POLICY in this file.` });
    }
  }

  // --- Destructive statements ---
  const destructivePatterns: Array<[RegExp, string]> = [
    [/drop\s+table/gi, "DROP TABLE"],
    [/truncate\s+/gi, "TRUNCATE"],
    [/drop\s+policy/gi, "DROP POLICY"],
    [/drop\s+schema/gi, "DROP SCHEMA"],
    [/drop\s+function/gi, "DROP FUNCTION"],
  ];
  let destructiveCount = 0;
  for (const [re, label] of destructivePatterns) {
    const matches = clean.match(re);
    if (matches) {
      destructiveCount += matches.length;
      findings.push({ file, rule: "DESTRUCTIVE", detail: `Found ${matches.length}× ${label}. Confirm this is intentional.` });
    }
  }

  // --- Policies missing WITH CHECK on write ops ---
  const policyRe = /create\s+policy[^;]*?for\s+(insert|update|all)[^;]*;/gi;
  let p: RegExpExecArray | null;
  while ((p = policyRe.exec(clean))) {
    const stmt = p[0].toLowerCase();
    if (!stmt.includes("with check")) {
      findings.push({
        file,
        rule: "POLICY_NO_WITH_CHECK",
        detail: `Policy for ${p[1].toUpperCase()} is missing WITH CHECK — clients may write rows they couldn't read.`,
      });
    }
  }

  // --- SECURITY DEFINER without SET search_path ---
  const funcRe = /create\s+(?:or\s+replace\s+)?function[\s\S]*?(?:\$\$|\$function\$)/gi;
  let f: RegExpExecArray | null;
  let funcCount = 0;
  while ((f = funcRe.exec(clean))) {
    funcCount++;
    const body = f[0].toLowerCase();
    if (body.includes("security definer") && !/set\s+search_path/.test(body)) {
      findings.push({
        file,
        rule: "DEFINER_NO_SEARCH_PATH",
        detail: "SECURITY DEFINER function missing `SET search_path = public` — search_path injection risk.",
      });
    }
  }

  // --- FK to auth.users ---
  if (/references\s+auth\.users/i.test(clean)) {
    findings.push({
      file,
      rule: "FK_TO_AUTH_USERS",
      detail: "Foreign key references auth.users. Use a profiles table in public schema instead.",
    });
  }

  // --- Reserved schema modifications ---
  for (const s of RESERVED_SCHEMAS) {
    // storage.buckets / storage.objects insert is OK; flag DDL only.
    const ddlRe = new RegExp(`(?:alter|create|drop)\\s+(?:table|policy|function|trigger|schema)[\\s\\S]{0,80}?${s}\\.`, "i");
    if (ddlRe.test(clean)) {
      findings.push({
        file,
        rule: "RESERVED_SCHEMA",
        detail: `Modifies reserved schema \`${s}\`. Lovable Cloud manages this — changes can break the project.`,
      });
    }
  }

  // --- ALTER DATABASE ---
  if (/alter\s+database/i.test(clean)) {
    findings.push({ file, rule: "ALTER_DATABASE", detail: "ALTER DATABASE is not allowed on Lovable Cloud." });
  }

  const policyCount = (clean.match(/create\s+policy/gi) || []).length;
  summary.push({ file, tables: createdTables, policies: policyCount, functions: funcCount, destructive: destructiveCount });
}

function main() {
  const files = listMigrationFiles();
  if (files.length === 0) {
    console.log(`No migrations found in ${MIGRATIONS_DIR}/`);
    process.exit(0);
  }

  console.log(`Scanning ${files.length} migration file(s)…\n`);
  for (const f of files) {
    const sql = readFileSync(join(MIGRATIONS_DIR, f), "utf8");
    check(f, sql);
  }

  // --- Print per-file summary ---
  console.log("Migration summary:");
  for (const s of summary) {
    const bits: string[] = [];
    if (s.tables.length) bits.push(`${s.tables.length} table(s): ${s.tables.join(", ")}`);
    if (s.policies) bits.push(`${s.policies} policy(ies)`);
    if (s.functions) bits.push(`${s.functions} function(s)`);
    if (s.destructive) bits.push(`${s.destructive} destructive stmt(s)`);
    console.log(`  • ${s.file}${bits.length ? " — " + bits.join("; ") : " — (no schema changes detected)"}`);
  }
  console.log("");

  if (findings.length === 0) {
    console.log("✅ No issues found.");
    process.exit(0);
  }

  // Group by file
  const byFile = new Map<string, Finding[]>();
  for (const f of findings) {
    if (!byFile.has(f.file)) byFile.set(f.file, []);
    byFile.get(f.file)!.push(f);
  }

  console.log(`❌ ${findings.length} issue(s) across ${byFile.size} file(s):\n`);
  for (const [file, list] of byFile) {
    console.log(`  ${file}`);
    for (const item of list) {
      console.log(`    [${item.rule}] ${item.detail}`);
    }
    console.log("");
  }
  console.log("Fix the above before deploying, or override by editing scripts/validate-migrations.ts.");
  process.exit(1);
}

main();