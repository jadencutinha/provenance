// Applies edit-claim with a REAL state change (reviewStatus -> accepted) and reads back over
// time to see whether/when the Ontology reflects it.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
const here = dirname(fileURLToPath(import.meta.url));
const BASE = "https://jadencutinha.usw-16.palantirfoundry.com";
const m = readFileSync(join(here, "..", ".env.local"), "utf8").match(/FOUNDRY_TOKEN\s*=\s*(.+)/);
const H = { Authorization: `Bearer ${m[1].trim()}`, "Content-Type": "application/json" };
const OID = "ri.ontology.main.ontology.4762de6b-c072-498b-b2ce-ec08cca501c6";
const API = `${BASE}/api/v2/ontologies/${OID}`;
const call = async (u, opt) => {
  const r = await fetch(API + u, { headers: H, ...opt });
  const t = await r.text(); let p; try { p = JSON.parse(t); } catch { /**/ }
  return { status: r.status, body: p ?? t };
};

const list = await call(`/objects/Claim?pageSize=100`);
const c = list.body.data.find((x) => x.subjectDrug === "Warfarin" && x.severity === "boxed_warning");
console.log("target:", c.claimId, "current reviewStatus:", c.reviewStatus);

const params = {
  Claim: c.claimId, severity: c.severity, pageNumber: c.pageNumber, subjectDrug: c.subjectDrug,
  objectCondition: c.objectCondition, extractionConfidence: c.extractionConfidence,
  claimText: c.claimText, claimType: c.claimType, verifiable: c.verifiable, normBboxes: c.normBboxes,
  quantitativeValue: c.quantitativeValue ?? "", sourceDocumentId: c.sourceDocumentId,
  normalizedStatement: c.normalizedStatement, reviewStatus: "unreviewed",
};
const applied = await call(`/actions/edit-claim/apply`, { method: "POST", body: JSON.stringify({ parameters: params }) });
console.log("apply:", applied.status, JSON.stringify(applied.body).slice(0, 260));

for (const wait of [500, 3000, 8000]) {
  await new Promise((r) => setTimeout(r, wait));
  const re = await call(`/objects/Claim/${c.claimId}`);
  console.log(`+${wait}ms -> reviewStatus =`, re.body?.reviewStatus, `(http ${re.status})`);
}
