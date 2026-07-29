# Provenance — demo script (target 2:35, hard cap 3:00)

Legend: 🖥️ **SCREEN** = what's on screen · 🖱️ **DO** = the click/action · 🎙️ **SAY** = your line.

## Before you record
- **One thing open:** the app at **http://localhost:5173/** on the **landing page** (hard-refresh: ⌘⇧R). No Foundry tabs this time — the whole demo lives in the app.
- **State is clean:** all 12 claims are `unreviewed` (0 decisions). Leave it that way.
- Practice clicking the **Warfarin "…major or fatal bleeding"** card once so the highlight lands on camera.
- Record at 1080p+; hide the bookmarks bar; close noisy tabs. Talk a touch slower than feels natural — and just talk to one person, not a room.
- **Do a timed dry-run.** You've got room, but don't dawdle on the landing page.

---

## The script

### [0:00–0:25] The problem
🖥️ **SCREEN:** Landing page (the glowing *provenance* logo).
🎙️ **SAY:** "Okay, so here's the problem I kept running into. A lot of really important decisions — think drug safety, regulation — come down to a claim that's buried somewhere in thousands of pages of PDFs. Someone reads that a drug can cause fatal bleeding, and before they can do anything with that, they have to go figure out: wait, where did that actually come from? And that hunt can eat up minutes, every single time. So I built Provenance to make it one click."

### [0:25–1:05] The core move — claim → source page
🖱️ **DO:** Click **Enter workspace**.
🎙️ **SAY:** "This is the reviewer's workspace. It's reading live from a corpus of real FDA drug labels, and on the left is every claim we pulled out of those documents. Let me just show you the thing instead of describing it — watch when I click one."
🖱️ **DO:** Click the **Warfarin** card — *"Warfarin sodium can cause major or fatal bleeding."*
🎙️ **SAY:** (as the PDF loads and the highlight lands) "There. One click, and I'm on the exact page of the real label, with the exact sentence highlighted. And you can follow the trail up top — this claim, page one, the warfarin label, all the way back to the source on DailyMed. No searching. That link, from a claim back to where it came from, never breaks. Honestly, that's the whole product right there."

### [1:05–1:30] Why you can trust it
🎙️ **SAY:** "And a reviewer can only trust what they can actually check. So every claim carries the real source text, word for word, and the page it's on — never a paraphrase, never a summary. And if something can't be pinned to a real page, we don't pretend — it gets flagged as unverifiable."
🖱️ **DO:** Click the **⚠ unverifiable** toggle (filter bar).
🎙️ **SAY:** "So I can filter for just those — anything the system couldn't trace — and here, there's nothing. It all checks out."
🖱️ **DO:** Click **⚠ unverifiable** again to clear it.

### [1:30–1:55] Document-to-decision (the writeback)
🎙️ **SAY:** "But this isn't just a nice viewer. The reviewer actually makes the call."
🖱️ **DO:** Click **✓ Accept** on the current claim. (Watch the **Decisions** counter tick 0 → 1 and the green "Accepted" badge appear.)
🎙️ **SAY:** "Accept, reject, or flag — and watch, that decision gets stamped with my name, a timestamp, and written straight back into the ontology. So the reviewer's judgment doesn't just live in someone's head or a spreadsheet — it becomes tracked data, right alongside the claim."

### [1:55–2:20] The matrix — a signal the PDFs hide
🖱️ **DO:** Click the **Matrix** tab (top center).
🎙️ **SAY:** "And here's where it gets interesting. Because every claim is a real structured object now, I can pivot on it. This is a drug-by-condition matrix — look at the pregnancy column. Three different drugs, all flagged, color-coded by severity. That's a pattern you'd never spot flipping through separate PDFs. Here you see it in about a second."
🖱️ **DO:** *(optional, only if under time)* Click the **Isotretinoin × Pregnancy** cell — it jumps back to that claim.

### [2:20–2:40] Close
🖱️ **DO:** Click back to the **Claims** tab (or the highlighted Warfarin claim).
🎙️ **SAY:** "So that's it. Tracing a claim to its source goes from minutes of digging to one click — and provenance stops being a chore and just becomes a property of the data. It's all running on Palantir Foundry and AIP under the hood — the same platform used to help get lifesaving drugs to market. This is that idea, built in the open. Thanks for watching."

---

## If you're pushing 3:00, cut in this order
1. Drop the optional matrix cell-click (1:55).
2. Trim the trust section to one line: "Every claim carries the real source text and page — and anything it can't anchor gets flagged unverifiable. I can filter for those, and here there are none."
3. Shorten the close to: "Minutes of digging become one click, and provenance becomes a property of the data — all on Foundry and AIP. That's Provenance. Thanks for watching."

## Honesty notes (so you can field FDE questions)
- **Live on camera (this cut):** the app reading live from the Ontology via the Foundry API, the claim → source-page highlight, the unverifiable filter, and the Accept/Reject/Flag **writeback** (verified round-trip into the Ontology through a Foundry Action).
- **Not shown on camera anymore (but real, mention if asked):** the raw label PDFs live in a Foundry **Media Set**; extraction runs in **AIP Logic** (per page, the model pulls every atomic claim verbatim — typed, severity-graded, tagged to a drug and condition); everything resolves into the **Ontology** (Claim linked to Source Document, with an edit-claim Action for writeback).
- **The claim I'd defend hardest:** the model never produces coordinates. A separate, deterministic step (`scripts/anchor_claims.py`, proof image `docs/assets/warfarin_boxed_warning.png`) finds where the exact text sits on the page — so provenance is a function of the source document, not the model's opinion. 12/12 seed claims anchored; a fabricated claim correctly flagged unverifiable.
- **Anchoring** is the one piece not yet wired as an in-Foundry Pipeline transform — honest next step; logic is done and validated.
- If asked "why not the generated OSDK package?": chose the **Foundry Ontology REST API** (what OSDK wraps) via a token-injecting dev proxy — same live-Ontology result, without private-npm + OAuth-redirect friction for a demo.
