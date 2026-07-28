#!/usr/bin/env python3
"""Fetch a curated corpus of real FDA drug-label PDFs from DailyMed, plus the
matching openFDA structured record (for entity-resolution reference / ground truth).

The PDFs are the honest "unstructured document" input to Provenance's ingest layer.
The openFDA JSON is NOT fed to Document Intelligence — it is kept only to supply RxNorm/
NDC/UNII codes for entity resolution and to validate extraction later.

Output:
  data/raw_pdfs/<slug>.pdf          real multi-page label (gitignored, re-fetchable)
  data/reference/<slug>.openfda.json openFDA structured label (codes, tracked)
  data/manifest.json                 index: slug -> {drug, setid, title, pages, urls, codes}
"""
from __future__ import annotations
import json, re, sys, time
from pathlib import Path
import requests
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
RAW = ROOT / "data" / "raw_pdfs"
REF = ROOT / "data" / "reference"

# Curated for dramatic, traceable claims AND shared conditions (so the drug<->condition
# matrix has real cross-links: e.g. pregnancy spans warfarin/isotretinoin/atorvastatin;
# hepatic impairment spans several).
DRUGS = [
    ("warfarin",     "Anticoagulant — BOXED WARNING: fatal bleeding; many interactions"),
    ("isotretinoin", "Acne — absolute pregnancy contraindication (teratogen); REMS"),
    ("metformin",    "Diabetes — BOXED WARNING: lactic acidosis; renal contraindication"),
    ("clozapine",    "Antipsychotic — multiple BOXED WARNINGS (agranulocytosis, seizures)"),
    ("atorvastatin", "Statin — pregnancy contraindication; rhabdomyolysis"),
]

DM = "https://dailymed.nlm.nih.gov/dailymed/services/v2"
DM_PDF = "https://dailymed.nlm.nih.gov/dailymed/downloadpdffile.cfm?setId={setid}"
OPENFDA = "https://api.fda.gov/drug/label.json"
UA = {"User-Agent": "provenance-corpus-builder/0.1 (research demo)"}


def slugify(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def pick_spl(drug: str) -> dict | None:
    """Return the first SPL for a drug name (repackager labels still carry the full text)."""
    r = requests.get(f"{DM}/spls.json", params={"drug_name": drug, "pagesize": 10},
                     headers=UA, timeout=30)
    r.raise_for_status()
    rows = r.json().get("data", [])
    return rows[0] if rows else None


def download_pdf(setid: str, dest: Path) -> int:
    r = requests.get(DM_PDF.format(setid=setid), headers=UA, timeout=90, allow_redirects=True)
    r.raise_for_status()
    if not r.content[:4] == b"%PDF":
        raise ValueError(f"not a PDF (got {r.content[:40]!r})")
    dest.write_bytes(r.content)
    with pdfplumber.open(dest) as pdf:
        return len(pdf.pages)


def openfda_reference(drug: str, dest: Path) -> dict:
    """Structured label -> RxNorm/NDC/UNII codes for entity resolution. Best-effort."""
    try:
        r = requests.get(OPENFDA, params={
            "search": f'openfda.generic_name:"{drug}"', "limit": 1}, headers=UA, timeout=30)
        r.raise_for_status()
        res = r.json().get("results", [])
        if not res:
            return {}
        rec = res[0]
        dest.write_text(json.dumps(rec, indent=2))
        of = rec.get("openfda", {})
        return {k: of.get(k) for k in
                ("generic_name", "brand_name", "product_ndc", "rxcui", "unii", "route")}
    except requests.RequestException as e:
        print(f"    (openFDA lookup failed: {e})")
        return {}


def main() -> int:
    RAW.mkdir(parents=True, exist_ok=True)
    REF.mkdir(parents=True, exist_ok=True)
    manifest = {}
    for drug, note in DRUGS:
        slug = slugify(drug)
        print(f"\n[{drug}] {note}")
        spl = pick_spl(drug)
        if not spl:
            print("  !! no SPL found — skipping")
            continue
        setid, title = spl["setid"], spl["title"]
        print(f"  SPL: {title[:70]}  (setid {setid})")
        pdf_path = RAW / f"{slug}.pdf"
        try:
            pages = download_pdf(setid, pdf_path)
            print(f"  PDF: {pages} pages -> {pdf_path.relative_to(ROOT)}")
        except Exception as e:
            print(f"  !! PDF download failed: {e}")
            continue
        codes = openfda_reference(drug, REF / f"{slug}.openfda.json")
        if codes:
            print(f"  openFDA codes: rxcui={codes.get('rxcui')} unii={codes.get('unii')}")
        manifest[slug] = {
            "drug": drug, "note": note, "setid": setid, "title": title,
            "pages": pages, "pdf": str(pdf_path.relative_to(ROOT)),
            "dailymed_url": f"https://dailymed.nlm.nih.gov/dailymed/drugInfo.cfm?setid={setid}",
            "pdf_url": DM_PDF.format(setid=setid),
            "openfda": codes,
        }
        time.sleep(1)  # be polite to public APIs

    (ROOT / "data" / "manifest.json").write_text(json.dumps(manifest, indent=2))
    print(f"\n=== corpus manifest: {len(manifest)} documents ===")
    for slug, m in manifest.items():
        print(f"  {slug:14s} {m['pages']:>3} pages  {m['title'][:50]}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
