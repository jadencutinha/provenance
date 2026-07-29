import { useMemo } from "react";
import type { Claim } from "../types";
import { SEVERITY_RANK } from "../types";

const SEV_ORDER = ["boxed_warning", "contraindication", "serious", "moderate", "info"];

// Drug × Condition matrix — every cell is a claim linking a drug to a condition, colored by the
// most severe claim in it. Shared conditions (e.g. Pregnancy) light up multiple drugs, surfacing
// cross-drug signals. Click a cell to jump to that claim in the reviewer.
export function Matrix({ claims, onPick }: { claims: Claim[]; onPick: (id: string) => void }) {
  const { drugs, conditions, byPair } = useMemo(() => {
    const drugs = Array.from(new Set(claims.map((c) => c.subject_drug))).sort();
    const conditions = Array.from(new Set(claims.map((c) => c.object_condition ?? "—"))).sort();
    const byPair = new Map<string, Claim[]>();
    for (const c of claims) {
      const k = `${c.subject_drug}|${c.object_condition ?? "—"}`;
      const arr = byPair.get(k) ?? [];
      arr.push(c);
      byPair.set(k, arr);
    }
    return { drugs, conditions, byPair };
  }, [claims]);

  const topSev = (cs: Claim[]) =>
    cs.slice().sort((a, b) => (SEVERITY_RANK[a.severity] ?? 9) - (SEVERITY_RANK[b.severity] ?? 9))[0].severity;

  const sharedConditions = conditions.filter(
    (c) => new Set(claims.filter((x) => (x.object_condition ?? "—") === c).map((x) => x.subject_drug)).size > 1,
  ).length;

  return (
    <div className="matrix-wrap">
      <div className="matrix-head-row">
        <div>
          <h2 className="matrix-title">Drug × Condition matrix</h2>
          <p className="matrix-sub">
            {claims.length} claims across {drugs.length} drugs and {conditions.length} conditions.
            {" "}
            {sharedConditions} condition{sharedConditions === 1 ? "" : "s"}{" "}
            {sharedConditions === 1 ? "links" : "link"} more than one drug, surfacing cross-drug
            signals. Click any cell to open the claim.
          </p>
        </div>
        <div className="matrix-legend">
          {SEV_ORDER.map((s) => (
            <span key={s} className="leg">
              <span className={`leg-dot sev-${s}`} />
              {s.replace(/_/g, " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="matrix-scroll">
        <div
          className="matrix-grid"
          style={{ gridTemplateColumns: `172px repeat(${conditions.length}, minmax(64px, 1fr))` }}
        >
          <div className="mcell corner" />
          {conditions.map((c) => (
            <div key={c} className="mcell colhead">
              <span>{c}</span>
            </div>
          ))}
          {drugs.flatMap((d) => [
            <div key={`${d}__h`} className="mcell rowhead">{d}</div>,
            ...conditions.map((c) => {
              const cs = byPair.get(`${d}|${c}`);
              const sev = cs ? topSev(cs) : null;
              return (
                <button
                  key={`${d}|${c}`}
                  className={`mcell cell ${cs ? `filled sev-${sev}` : ""}`}
                  disabled={!cs}
                  onClick={() => cs && onPick(cs[0].claim_id)}
                  title={cs ? cs.map((x) => `• ${x.claim_text}`).join("\n") : ""}
                >
                  {cs ? cs.length : ""}
                </button>
              );
            }),
          ])}
        </div>
      </div>
    </div>
  );
}
