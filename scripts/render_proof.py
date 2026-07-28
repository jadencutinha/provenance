#!/usr/bin/env python3
"""Render a page image with a claim's anchor highlighted — the visual proof that a claim
maps to an exact region of an exact page. Mirrors what the React reviewer will draw.

usage: render_proof.py <slug> "<claim text>" [page] [out.png]
"""
from __future__ import annotations
import sys, json
from pathlib import Path
import pdfplumber
from anchor_claims import load_doc, anchor  # same dir

ROOT = Path(__file__).resolve().parents[1]


def render(slug: str, claim: str, page_hint: int | None, out: Path) -> dict:
    doc = load_doc(slug)
    res = anchor(doc, claim, page_hint)
    if not res.get("matched"):
        raise SystemExit(f"claim did not anchor (unverifiable): {claim!r}")
    manifest = json.loads((ROOT / "data" / "manifest.json").read_text())
    pdf_path = ROOT / manifest[slug]["pdf"]
    with pdfplumber.open(pdf_path) as pdf:
        page = pdf.pages[res["page_number"] - 1]
        im = page.to_image(resolution=150)
        # per-line highlight: translucent yellow fill + amber stroke
        rects = [(b["x0"], b["top"], b["x1"], b["bottom"]) for b in res["bboxes"]]
        im.draw_rects(rects, fill=(255, 214, 10, 80), stroke=(214, 122, 0), stroke_width=3)
        out.parent.mkdir(parents=True, exist_ok=True)
        im.save(out)
    return res


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print('usage: render_proof.py <slug> "<claim>" [page] [out.png]'); sys.exit(2)
    slug, claim = sys.argv[1], sys.argv[2]
    page = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else None
    out = Path(sys.argv[4]) if len(sys.argv) > 4 else (ROOT / "docs" / "assets" / f"{slug}_proof.png")
    res = render(slug, claim, page, out)
    print(f"anchored on page {res['page_number']} ({res['method']}, score {res['score']}) "
          f"-> {out}")
