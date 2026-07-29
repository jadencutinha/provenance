# Provenance — demo script (target 3:45, hard cap 4:00)

Legend: 🖥️ **SCREEN** = what's on screen · 🖱️ **DO** = the click/action · 🎙️ **SAY** = your line.

## Before you record
- **Two things open, ready to switch between:**
  1. The app at **http://localhost:5173/** on the **landing page** (hard-refresh: ⌘⇧R).
  2. **Foundry** with two tabs handy: **Media Set `label_pdfs`** (the 5 PDFs) and **Ontology Manager → Claim** (showing its properties, the *Claim → Source Document* link, and the *edit-claim* action).
- **State is clean:** all 12 claims are `unreviewed` (0 decisions). Good — leave it.
- Practice clicking the **Warfarin "…major or fatal bleeding"** card once so the highlight lands on camera.
- Record at 1080p+; hide the bookmarks bar; close noisy tabs. Speak a touch slower than feels natural.
- **Dry-run once with a timer.** This is tight — if you're over 4:00, use the cut list at the bottom.

---

## The script

### [0:00–0:35] The problem + who it's for
🖥️ **SCREEN:** Landing page (the glowing *provenance* logo).
🎙️ **SAY:** "High-stakes decisions — in drug safety, in regulation, in intelligence — rest on claims buried in thousands of pages of unstructured PDFs. A reviewer reads that a drug can cause fatal bleeding, or that it's contraindicated in pregnancy, and before they can act, they have to answer one question: where exactly did that come from? Today, tracing a single claim to its source can take minutes of hunting. This is Provenance — it makes that one click."

### [0:35–1:15] Show, don't tell — claim → source page
🖱️ **DO:** Click **Enter workspace**.
🎙️ **SAY:** "This is the reviewer's workspace, reading live from a corpus of real FDA drug labels. On the left is every claim we pulled out of those documents. Watch what happens when I click one."
🖱️ **DO:** Click the **Warfarin** card — *"Warfarin sodium can cause major or fatal bleeding."*
🎙️ **SAY:** (as the PDF loads and the highlight lands) "One click, and I'm on the exact page of the original label, with the exact sentence highlighted. The trail up top traces it: this claim → page one → the warfarin label → straight to the source on DailyMed. No searching. The link from a claim to its source is never broken. That's the whole product."

### [1:15–1:45] Why it's trustworthy
🎙️ **SAY:** "A reviewer can only trust what they can verify. So every claim carries the verbatim source text and its page — never a paraphrase. And if a claim can't be anchored to a real page, it's flagged unverifiable."
🖱️ **DO:** Click the **⚠ unverifiable** toggle (filter bar).
🎙️ **SAY:** "I can filter for exactly those — anything the system couldn't trace — and here, there are none. Everything is traceable."
🖱️ **DO:** Click **⚠ unverifiable** again to clear it.

### [1:45–2:08] Document-to-decision (the writeback)
🎙️ **SAY:** "And this isn't just a viewer — it's document-to-decision."
🖱️ **DO:** Click **✓ Accept** on the current claim. (Watch the **Decisions** counter tick 0 → 1 and the green "Accepted" badge appear.)
🎙️ **SAY:** "The reviewer makes the call — accept, reject, or flag. That decision is attributed to me, timestamped, and written straight back into the Ontology through a Foundry Action. The judgment becomes tracked data too."

### [2:08–2:32] The matrix — a signal the PDFs hide
🖱️ **DO:** Click the **Matrix** tab (top center).
🎙️ **SAY:** "Because every claim is a structured object, I can pivot instantly. This is a drug-by-condition matrix. Look at the pregnancy column — three different drugs, all flagged, colored by severity. That cross-drug signal was invisible across separate PDFs. Here it's obvious in a second."
🖱️ **DO:** *(optional)* Click the **Isotretinoin × Pregnancy** cell — it jumps back to that claim.

### [2:32–3:28] Under the hood
🖱️ **DO:** Switch to **Foundry** → the **Media Set `label_pdfs`** (5 PDFs).
🎙️ **SAY:** "Under the hood, this is Palantir Foundry and AIP. The raw label PDFs live in a Media Set."
🖱️ **DO:** Open **AIP Logic → Extract Claims**, then click **Preview run**. (Let the structured array stream into the output panel.)
🎙️ **SAY:** "This is the extraction, live in AIP Logic. For each page, the model pulls out every atomic claim and copies it verbatim — typed, severity-graded, tagged to a drug and a condition. And here's the decision I'd defend hardest: the model never produces coordinates. A separate, deterministic step finds where that exact text sits on the page."
🖱️ **DO:** Switch to **Ontology Manager → Claim** — its properties, the **Claim → Source Document** link, and the **edit-claim** action.
🎙️ **SAY:** "So provenance isn't the model's opinion — it's a function of the source document. Everything resolves into the Ontology: Claims linked to their Source Documents, with an edit-claim Action for writeback. And the app reads live from this Ontology through the Foundry API."

### [3:22–3:52] Impact + close
🖱️ **DO:** Switch back to the app (the highlighted claim, or the landing page).
🎙️ **SAY:** "The impact is simple. Tracing a claim to its source drops from minutes of manual hunting to one click — and provenance becomes a property of the data, not a chore. Palantir uses this exact platform to help bring lifesaving drugs to market. Provenance is that idea, built in the open. Thanks for watching."

---

## If you're over 4:00, cut in this order
1. Drop the optional matrix cell-click (2:32).
2. Trim the trust section (1:15) to one sentence: "Every claim carries the verbatim text and page, and anything it can't anchor is flagged unverifiable."
3. Shorten the close to: "Minutes of hunting become one click, and provenance becomes a property of the data. That's Provenance."

## Honesty notes (so you can field FDE questions)
- **Live on camera:** the **AIP Logic Extract Claims** function (you run it — verbatim, typed, severity-graded array output), the Media Set, the Ontology (Claim, Source Document, the link, the edit-claim action), the app reading live via the Foundry API, and the Accept/Reject/Flag **writeback** (verified round-trip).
- **Deterministic anchoring** (claim text → exact page coordinates) runs in `scripts/anchor_claims.py` (proof image `docs/assets/warfarin_boxed_warning.png`). It's the one piece not yet wired as an in-Foundry Pipeline transform — if asked, that's the honest next step; the logic is done and validated (12/12 seed claims anchored, fabricated claim flagged unverifiable).
- If asked "why not the generated OSDK package?": you chose the **Foundry Ontology REST API** (what OSDK wraps) via a token-injecting dev proxy — same live-Ontology result, without private-npm + OAuth-redirect friction for a demo.
- **Timing:** with the live AIP Logic run this lands near 4:00. Do a timed dry-run; if over, drop the optional matrix cell-click and trim the trust section (cut list above).
