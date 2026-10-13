import { cp, mkdir, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const roots = dirname(dirname(fileURLToPath(import.meta.url)));
const from = join(roots, "node_modules", "onnxruntime-web", "dist");
const to = join(roots, "public", "ort");

const KEEP = /\.(wasm|mjs)$/;

await mkdir(to, { recursive: true });

let copied = 0;
for (const name of await readdir(from)) {
  if (!KEEP.test(name)) continue;
  await cp(join(from, name), join(to, name));
  copied++;
}

console.log(`[copy-ort] copied ${copied} runtime file(s) -> public/ort`);
