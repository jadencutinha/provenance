import { useState } from "react";
import App from "./App";
import { Landing } from "./Landing";

// Landing page first, then the reviewer workspace.
export default function Root() {
  const [entered, setEntered] = useState(false);
  return entered ? (
    <App onHome={() => setEntered(false)} />
  ) : (
    <Landing onEnter={() => setEntered(true)} />
  );
}
