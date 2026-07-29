export function Landing({ onEnter }: { onEnter: () => void }) {
  return (
    <div className="landing">
      <div className="landing-grid" />
      <div className="landing-orb orb-a" />
      <div className="landing-orb orb-b" />
      <div className="landing-scan" />

      <div className="landing-inner">
        <img className="landing-logo" src="/provenance-logo.png" alt="provenance" />

        <h1 className="landing-tagline">Every claim, traced to its source.</h1>

        <p className="landing-sub">
          A document-to-decision claims engine. It ingests messy source PDFs, extracts structured
          claims, and links every assertion to the exact page it came from, so a reviewer can
          trust it in a single click.
        </p>

        <div className="landing-stats">
          <div className="lstat"><b>12</b><span>claims</span></div>
          <div className="lstat"><b>5</b><span>documents</span></div>
          <div className="lstat"><b>240</b><span>pages</span></div>
          <div className="lstat"><b>100%</b><span>traceable</span></div>
        </div>

        <button className="enter-btn" onClick={onEnter}>
          <span>Enter workspace</span>
          <span className="arrow">→</span>
        </button>

        <div className="landing-foot">
          <span className="live-dot" /> Live on the Foundry Ontology · Built with Palantir Foundry + AIP
        </div>
      </div>
    </div>
  );
}
