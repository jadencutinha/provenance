#!/usr/bin/env python3
"""Extract per-page text + word-level bounding boxes from each corpus PDF.

This LOCALLY produces the same shape Foundry's Document Intelligence / OCR will emit:
a DocumentPage per page, with page dimensions, full text, and every word's bounding box.
It lets us (a) prototype claim anchoring and (b) build the React reviewer's highlight
rendering against real coordinates BEFORE Foundry exists.

Coordinates are pdfplumber's PDF space: origin top-left, y increases downward, units =
points (72/inch). We also store normalized [0,1] coords so the viewer is scale-independent.

Output: data/pages/<slug>.pages.json
"""
from __future__ import annotations
import json, sys
from pathlib import Path
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
PAGES = ROOT / "data" / "pages"


def extract_doc(slug: str, meta: dict) -> dict:
    pdf_path = ROOT / meta["pdf"]
    pages = []
    with pdfplumber.open(pdf_path) as pdf:
        for pno, page in enumerate(pdf.pages, start=1):
            w, h = float(page.width), float(page.height)
            words = []
            for i, wd in enumerate(page.extract_words(use_text_flow=True,
                                                       keep_blank_chars=False)):
                x0, top, x1, bottom = (float(wd["x0"]), float(wd["top"]),
                                       float(wd["x1"]), float(wd["bottom"]))
                words.append({
                    "i": i, "text": wd["text"],
                    "x0": round(x0, 2), "top": round(top, 2),
                    "x1": round(x1, 2), "bottom": round(bottom, 2),
                    # normalized [0,1] for resolution-independent rendering
                    "nx0": round(x0 / w, 5), "ntop": round(top / h, 5),
                    "nx1": round(x1 / w, 5), "nbottom": round(bottom / h, 5),
                })
            pages.append({
                "page_number": pno, "width": round(w, 2), "height": round(h, 2),
                "text": page.extract_text() or "",
                "words": words,
            })
    return {
        "slug": slug, "drug": meta["drug"], "setid": meta["setid"],
        "title": meta["title"], "page_count": len(pages),
        "dailymed_url": meta["dailymed_url"], "pages": pages,
    }


def main() -> int:
    PAGES.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((ROOT / "data" / "manifest.json").read_text())
    only = sys.argv[1:] or list(manifest.keys())
    for slug in only:
        meta = manifest[slug]
        print(f"[{slug}] extracting {meta['pages']} pages ...", end=" ", flush=True)
        doc = extract_doc(slug, meta)
        out = PAGES / f"{slug}.pages.json"
        out.write_text(json.dumps(doc))
        nwords = sum(len(p["words"]) for p in doc["pages"])
        print(f"{doc['page_count']} pages, {nwords} words -> {out.relative_to(ROOT)} "
              f"({out.stat().st_size // 1024} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
