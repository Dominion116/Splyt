/**
 * Offline ERC-8004 metadata compliance check (no keys, no chain).
 *
 *   npm run validate-agent-metadata -w apps/backend
 */
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const path = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../agent/metadata.json"
);

const raw = readFileSync(path, "utf8");
const meta = JSON.parse(raw) as Record<string, unknown>;

const errors: string[] = [];

if (meta.type !== "https://eips.ethereum.org/EIPS/eip-8004#registration-v1") {
  errors.push(
    'type must be "https://eips.ethereum.org/EIPS/eip-8004#registration-v1"'
  );
}
if ("endpoints" in meta) {
  errors.push('use "services" not "endpoints"');
}
if (typeof meta.name !== "string" || !meta.name.trim()) {
  errors.push("name is required");
}
if (typeof meta.description !== "string" || !meta.description.trim()) {
  errors.push("description is required");
}
if (!Array.isArray(meta.services) || meta.services.length === 0) {
  errors.push("services must be a non-empty array");
} else {
  meta.services.forEach((s, i) => {
    const e = s as Record<string, unknown>;
    if (typeof e.name !== "string") errors.push(`services[${i}].name required`);
    if (typeof e.endpoint !== "string") {
      errors.push(`services[${i}].endpoint required`);
    }
    if ("url" in e) errors.push(`services[${i}] must not use "url"`);
  });
}

if (errors.length) {
  console.error("FAIL agent/metadata.json:\n- " + errors.join("\n- "));
  process.exit(1);
}

console.log("OK agent/metadata.json — ERC-8004 registration-v1 shape is valid");
console.log("  name:", meta.name);
console.log("  services:", (meta.services as unknown[]).length);
console.log(
  "  note: replace image/service URL placeholders and pin to IPFS before mainnet register"
);
