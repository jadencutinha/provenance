#!/usr/bin/env python3
"""Export upload-ready datasets for Foundry ingest (data/foundry_upload/).

These let the Ontology be built immediately — and give a guaranteed coordinate layer for
anchoring regardless of whether Document Intelligence emits bounding boxes on this tier.

  source_documents.csv  one row per label
  document_pages.csv    one row per page (with full text)
  page_words.csv        one row per word (bbox in points + normalized [0,1])
  claims_seed.csv       our 12 verified claims (bootstrap the Ontology before AIP Logic)
"""
from __future__ import annotations
import csv, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
OUT = DATA / "foundry_upload"


def main() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((DATA / "manifest.json").read_text())

    # --- source_documents ---
    with (OUT / "source_documents.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["document_id", "drug", "title", "setid", "page_count", "dailymed_url"])
        for slug, m in manifest.items():
            w.writerow([slug, m["drug"], m["title"], m["setid"], m["pages"], m["dailymed_url"]])

    # --- document_pages + page_words ---
    dp = (OUT / "document_pages.csv").open("w", newline="")
    pw = (OUT / "page_words.csv").open("w", newline="")
    dpw, pww = csv.writer(dp), csv.writer(pw)
    dpw.writerow(["document_id", "page_number", "width", "height", "text"])
    pww.writerow(["document_id", "page_number", "word_index", "text",
                  "x0", "top", "x1", "bottom", "nx0", "ntop", "nx1", "nbottom"])
    n_pages = n_words = 0
    for slug in manifest:
        doc = json.loads((DATA / "pages" / f"{slug}.pages.json").read_text())
        for pg in doc["pages"]:
            dpw.writerow([slug, pg["page_number"], pg["width"], pg["height"], pg["text"]])
            n_pages += 1
            for wd in pg["words"]:
                pww.writerow([slug, pg["page_number"], wd["i"], wd["text"],
                              wd["x0"], wd["top"], wd["x1"], wd["bottom"],
                              wd["nx0"], wd["ntop"], wd["nx1"], wd["nbottom"]])
                n_words += 1
    dp.close(); pw.close()

    # --- claims_seed (flattened; norm_bboxes as JSON string) ---
    claims = json.loads((DATA / "claims.seed.json").read_text())
    with (OUT / "claims_seed.csv").open("w", newline="") as f:
        w = csv.writer(f)
        w.writerow(["claim_id", "claim_text", "normalized_statement", "claim_type", "severity",
                    "subject_drug", "object_condition", "quantitative_value",
                    "source_document_id", "page_number", "verifiable",
                    "extraction_confidence", "review_status", "norm_bboxes"])
        for c in claims:
            nb = json.dumps(c["anchor"]["norm_bboxes"]) if c.get("anchor") else ""
            w.writerow([c["claim_id"], c["claim_text"], c["normalized_statement"],
                        c["claim_type"], c["severity"], c["subject_drug"],
                        c["object_condition"], c["quantitative_value"] or "",
                        c["source_document_id"], c["page_number"], c["verifiable"],
                        c["extraction_confidence"], c["review_status"], nb])

    print(f"wrote {OUT.relative_to(ROOT)}/")
    print(f"  source_documents.csv  {len(manifest)} rows")
    print(f"  document_pages.csv    {n_pages} rows")
    print(f"  page_words.csv        {n_words} rows")
    print(f"  claims_seed.csv       {len(claims)} rows")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
