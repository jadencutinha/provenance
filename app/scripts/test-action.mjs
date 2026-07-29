// Verifies the edit-claim action body shape with a harmless no-op (reviewStatus -> current).
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const BASE = "https://jadencutinha.usw-16.palantirfoundry.com";
const m = readFileSync(join(here, "..", ".env.local"), "utf8").match(/FOUNDRY_TOKEN\s*=\s*(.+)/);
const H = { Authorization: `Bearer ${m[1].trim()}`, "Content-Type": "application/json" };
const OID = "ri.ontology.main.ontology.4762de6b-c072-498b-b2ce-ec08cca501c6";
const API = `${BASE}/api/v2/ontologies/${OID}`;

const objs = await (await fetch(`${API}/objects/Claim?pageSize=1`, { headers: H })).json();
const c = objs.data[0];
console.log("testing on claim:", c.__primaryKey, "current reviewStatus:", c.reviewStatus);

// full params = all current values + Claim key; reviewStatus kept the same (no-op)
const params = {
  Claim: c.__primaryKey,
  severity: c.severity, pageNumber: c.pageNumber, subjectDrug: c.subjectDrug,
  objectCondition: c.objectCondition, extractionConfidence: c.extractionConfidence,
  claimText: c.claimText, claimType: c.claimType, verifiable: c.verifiable,
  normBboxes: c.normBboxes, quantitativeValue: c.quantitativeValue,
  sourceDocumentId: c.sourceDocumentId, normalizedStatement: c.normalizedStatement,
  quantitativeValue: c.quantitativeValue ?? "",
  reviewStatus: c.reviewStatus || "unreviewed",
};
for (const k of Object.keys(params)) if (params[k] === undefined) delete params[k];

const r = await fetch(`${API}/actions/edit-claim/apply`, {
  method: "POST", headers: H, body: JSON.stringify({ parameters: params }),
});
const txt = await r.text();
let parsed; try { parsed = JSON.parse(txt); } catch {}
console.log("FULL body ->", r.status, "| validation:", parsed?.validation?.result ?? "(applied)");
if (parsed?.validation?.result === "INVALID") {
  const bad = Object.entries(parsed.validation.parameters || {}).filter(([, v]) => v.result !== "VALID");
  console.log("invalid params:", bad.map(([k, v]) => `${k}:${v.result}`));
} else {
  console.log("edits:", JSON.stringify(parsed?.edits ?? parsed).slice(0, 300));
}
