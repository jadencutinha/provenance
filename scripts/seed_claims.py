#!/usr/bin/env python3
"""Seed a real, cross-linked Claim set from the corpus.

Each seed is a VERBATIM span curated from a label (this is what AIP Logic's LLM will extract
automatically in Foundry). We anchor every one to its page geometry, assign the ontology
fields, and emit:
  data/claims.seed.json    fully-formed Claim objects (feeds the React reviewer as mock
                           Ontology data until real OSDK is wired)
  data/entities.json       derived Drug + Condition entities with claim counts
  data/matrix.json         the drug x condition claims matrix

Conditions are deliberately shared (Pregnancy spans 3 drugs) so the matrix has real edges.
Any seed that fails to anchor is reported and marked unverifiable — the thesis in action.
"""
from __future__ import annotations
import hashlib, json
from collections import defaultdict
from pathlib import Path
from anchor_claims import load_doc, anchor

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"

# (slug, page, claim_type, severity, drug, condition, verbatim_text, normalized, qty)
SEEDS = [
    # ---- warfarin ----
    ("warfarin", 1, "warning", "boxed_warning", "Warfarin", "Major bleeding",
     "Warfarin sodium can cause major or fatal bleeding.",
     "Warfarin can cause major or fatal bleeding.", None),
    ("warfarin", 1, "contraindication", "contraindication", "Warfarin", "Pregnancy",
     "Pregnancy, except in women with mechanical heart valves.",
     "Warfarin is contraindicated in pregnancy (except mechanical heart valves).", None),
    ("warfarin", 1, "contraindication", "contraindication", "Warfarin", "Hemorrhagic tendencies",
     "Hemorrhagic tendencies or blood dyscrasias.",
     "Warfarin is contraindicated in hemorrhagic tendencies or blood dyscrasias.", None),
    ("warfarin", 1, "monitoring", "serious", "Warfarin", "INR monitoring",
     "Perform regular monitoring of INR in all treated patients.",
     "INR must be monitored regularly in all warfarin patients.", None),

    # ---- isotretinoin ----
    ("isotretinoin", 1, "contraindication", "boxed_warning", "Isotretinoin", "Pregnancy",
     "Isotretinoin can cause life-threatening birth defects and is contraindicated in pregnancy.",
     "Isotretinoin is contraindicated in pregnancy (teratogen).", None),
    ("isotretinoin", 1, "warning", "serious", "Isotretinoin", "Pregnancy",
     "Potentially any fetus exposed during pregnancy can be affected.",
     "Any fetus exposed to isotretinoin during pregnancy can be affected.", None),

    # ---- metformin (combination product) ----
    ("metformin", 1, "warning", "boxed_warning", "Metformin", "Lactic acidosis",
     "Postmarketing cases of metformin-associated lactic acidosis have resulted in death",
     "Metformin-associated lactic acidosis can be fatal.", None),
    ("metformin", 2, "contraindication", "contraindication", "Metformin", "Renal impairment",
     "Severe renal impairment: eGFR below 30 mL/min/1.73 m2.",
     "Metformin is contraindicated in severe renal impairment (eGFR < 30).", "eGFR < 30"),

    # ---- clozapine ----
    ("clozapine", 1, "warning", "boxed_warning", "Clozapine", "Severe neutropenia",
     "Clozapine tablets have caused severe neutropenia",
     "Clozapine can cause severe neutropenia.", None),
    ("clozapine", 1, "warning", "serious", "Clozapine", "Seizure",
     "Use with caution in patients with history of seizure or risk factors for seizure.",
     "Use clozapine with caution in patients at risk of seizure.", None),

    # ---- atorvastatin ----
    ("atorvastatin", 2, "warning", "contraindication", "Atorvastatin", "Pregnancy",
     "Pregnancy: May cause fetal harm.",
     "Atorvastatin may cause fetal harm in pregnancy.", None),
    ("atorvastatin", 4, "adverse_reaction", "serious", "Atorvastatin", "Rhabdomyolysis",
     "rhabdomyolysis in patients treated with statins, including atorvastatin calcium.",
     "Atorvastatin can cause rhabdomyolysis.", None),
]


def cid(slug: str, page: int, text: str) -> str:
    return "clm_" + hashlib.sha1(f"{slug}|{page}|{text}".encode()).hexdigest()[:12]


def main() -> int:
    manifest = json.loads((DATA / "manifest.json").read_text())
    docs = {}
    claims, misses = [], []
    for slug, page, ctype, sev, drug, cond, text, norm, qty in SEEDS:
        doc = docs.setdefault(slug, load_doc(slug))
        a = anchor(doc, text, page)
        verifiable = bool(a.get("matched"))
        if not verifiable:
            misses.append((slug, page, text))
        m = manifest[slug]
        claims.append({
            "claim_id": cid(slug, page, text),
            "claim_text": text,
            "normalized_statement": norm,
            "claim_type": ctype,
            "severity": sev,
            "subject_drug": drug,
            "object_condition": cond,
            "quantitative_value": qty,
            "source_document_id": slug,
            "page_number": a.get("page_number", page),
            "verifiable": verifiable,
            "extraction_confidence": 0.9 if verifiable else 0.4,
            "review_status": "unreviewed",
            "anchor": None if not verifiable else {
                "method": a["method"], "score": a["score"],
                "norm_bboxes": a["norm_bboxes"], "norm_bbox": a["norm_bbox"],
            },
            "source": {"drug": m["drug"], "title": m["title"], "setid": m["setid"],
                       "dailymed_url": m["dailymed_url"], "pages": m["pages"]},
        })

    (DATA / "claims.seed.json").write_text(json.dumps(claims, indent=2))

    # ---- derive entities + matrix ----
    drugs = defaultdict(int); conds = defaultdict(int); matrix = defaultdict(list)
    for c in claims:
        drugs[c["subject_drug"]] += 1
        conds[c["object_condition"]] += 1
        matrix[f'{c["subject_drug"]}|{c["object_condition"]}'].append(c["claim_id"])
    (DATA / "entities.json").write_text(json.dumps({
        "drugs": [{"name": k, "claim_count": v} for k, v in sorted(drugs.items())],
        "conditions": [{"name": k, "claim_count": v} for k, v in sorted(conds.items())],
    }, indent=2))
    (DATA / "matrix.json").write_text(json.dumps(
        [{"drug": k.split("|")[0], "condition": k.split("|")[1], "claim_ids": v}
         for k, v in matrix.items()], indent=2))

    # ---- report ----
    ok = sum(1 for c in claims if c["verifiable"])
    print(f"seeded {len(claims)} claims  |  verifiable {ok}/{len(claims)}  |  "
          f"{len(drugs)} drugs, {len(conds)} conditions")
    shared = [c for c in conds if sum(1 for cl in claims
              if cl['object_condition'] == c) and
              len({cl['subject_drug'] for cl in claims if cl['object_condition'] == c}) > 1]
    print("shared conditions (matrix edges):", shared)
    for c in claims:
        flag = "OK " if c["verifiable"] else "!! UNVERIFIABLE"
        print(f"  {flag} [{c['severity']:<15}] {c['subject_drug']:<12} p{c['page_number']} "
              f"{c['claim_text'][:52]}")
    if misses:
        print("\nMISSED (need verbatim fix):")
        for slug, page, text in misses:
            print(f"  {slug} p{page}: {text}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
