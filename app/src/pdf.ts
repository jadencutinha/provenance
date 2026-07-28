// pdf.js worker wiring for Vite. Bundles the worker as a module URL so the PDF renders
// client-side with no CDN dependency.
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();
