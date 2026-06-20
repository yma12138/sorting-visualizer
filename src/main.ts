import "./styles.css";
import { Controller } from "./controller";

function main() {
  const canvas = document.getElementById("canvas") as HTMLCanvasElement | null;
  if (!canvas) {
    throw new Error("Canvas element not found");
  }
  new Controller(canvas);
}

// Wait for DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", main);
} else {
  main();
}
