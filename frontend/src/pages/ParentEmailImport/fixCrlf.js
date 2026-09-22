      import { readFileSync, writeFileSync } from "fs";
import { resolve } from "path";

const file = resolve(import.meta.dirname, "ParentEmailImport.jsx");
let original = readFileSync(file, "utf8");
const changed = original.replace(/\r\n/g, "\n");
writeFileSync(file, changed, "utf8");
console.log(changed === readFileSync(file, "utf8") ? "no change" : "written");
