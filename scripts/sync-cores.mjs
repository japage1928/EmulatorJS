// Copies the pinned emulator core payload from node_modules into data/cores/
// so the fork serves every core file itself instead of relying on a CDN.
// Run after `npm ci`. Source versions are locked by package-lock.json.
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const modulesDir = path.join(root, "node_modules", "@emulatorjs");
const destDir = path.join(root, "data", "cores");
const reportsDir = path.join(destDir, "reports");

if (!fs.existsSync(modulesDir)) {
    console.error("node_modules/@emulatorjs not found. Run `npm ci` first.");
    process.exit(1);
}

fs.mkdirSync(reportsDir, { recursive: true });

let dataFiles = 0;
let reportFiles = 0;
let otherFiles = 0;

for (const entry of fs.readdirSync(modulesDir, { withFileTypes: true })) {
    if (!entry.isDirectory() || !entry.name.startsWith("core-")) continue;
    const pkgDir = path.join(modulesDir, entry.name);
    for (const file of fs.readdirSync(pkgDir, { withFileTypes: true })) {
        if (!file.isFile()) continue;
        if (file.name.endsWith("-wasm.data") || file.name.endsWith(".zip")) {
            fs.copyFileSync(path.join(pkgDir, file.name), path.join(destDir, file.name));
            if (file.name.endsWith("-wasm.data")) dataFiles++; else otherFiles++;
        }
    }
    const pkgReports = path.join(pkgDir, "reports");
    if (fs.existsSync(pkgReports)) {
        for (const file of fs.readdirSync(pkgReports)) {
            if (file.endsWith(".json")) {
                fs.copyFileSync(path.join(pkgReports, file), path.join(reportsDir, file));
                reportFiles++;
            }
        }
    }
}

console.log(`Synced ${dataFiles} core .data files, ${reportFiles} reports, ${otherFiles} extra files into data/cores/`);
