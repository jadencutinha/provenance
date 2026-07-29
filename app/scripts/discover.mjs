// Discovers the Provenance Ontology's exact API shape so we can build the app's data layer.
// Reads FOUNDRY_TOKEN from app/.env.local server-side and prints ONLY schema (never the token).
// Run:  node scripts/discover.mjs      (from the app/ directory)
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const BASE = "https://jadencutinha.usw-16.palantirfoundry.com";

function token() {
  try {
    const m = readFileSync(join(here, "..", ".env.local"), "utf8").match(/FOUNDRY_TOKEN\s*=\s*(.+)/);
    return m ? m[1].trim() : "";
  } catch {
    return "";
  }
}
const TOKEN = token();
if (!TOKEN) {
  console.error("✗ No FOUNDRY_TOKEN in app/.env.local — create it first (see README).");
  process.exit(1);
}
const H = { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" };
const get = async (u) => {
  const r = await fetch(BASE + u, { headers: H });
  if (!r.ok) throw new Error(`${u} -> ${r.status} ${(await r.text()).slice(0, 200)}`);
  return r.json();
};

const onts = await get("/api/v2/ontologies");
const list = onts.data || onts;
console.log("ONTOLOGIES:", list.map((o) => ({ apiName: o.apiName, rid: o.rid, name: o.displayName })));
const ont = list.find((o) => /jadencutinha/i.test(o.displayName || "") || /jadencutinha/i.test(o.apiName || "")) || list[0];
const OID = ont.rid;
console.log("\nUSING:", ont.displayName, "| rid:", OID, "| apiName:", ont.apiName);

const ots = await get(`/api/v2/ontologies/${OID}/objectTypes?pageSize=200`);
for (const name of ["Claim", "SourceDocument"]) {
  const ot = (ots.data || []).find((o) => o.apiName === name);
  if (!ot) { console.log(`\n${name}: NOT FOUND (available: ${(ots.data || []).map((o) => o.apiName).join(", ")})`); continue; }
  console.log(`\n${name}: apiName=${ot.apiName} pk=${ot.primaryKey} props=[${Object.keys(ot.properties || {}).join(", ")}]`);
}

const claimObjs = await get(`/api/v2/ontologies/${OID}/objects/Claim?pageSize=2`);
console.log("\nSAMPLE Claim object:\n", JSON.stringify((claimObjs.data || [])[0], null, 1));

const ats = await get(`/api/v2/ontologies/${OID}/actionTypes?pageSize=200`);
const editish = (ats.data || []).filter((a) => /claim/i.test(a.apiName));
console.log("\nCLAIM ACTION TYPES:", editish.map((a) => a.apiName));
for (const a of editish) {
  const full = await get(`/api/v2/ontologies/${OID}/actionTypes/${a.apiName}`);
  console.log(`  ${a.apiName} params:`, Object.keys(full.parameters || {}));
}
