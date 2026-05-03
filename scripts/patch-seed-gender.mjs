import fs from "fs";
const path = "App.jsx";
const genders = [
  "Woman", "Man", "Woman", "Man", "Prefer not to say", "Man", "Woman", "Man",
  "Woman", "Man", "Non-binary", "Woman", "Man", "Man", "Man", "Woman",
  "Man", "Woman", "Prefer not to say", "Man", "Woman", "Man", "Woman", "Man",
];
let s = fs.readFileSync(path, "utf8");
const start = s.indexOf("const SEED = [");
const end = s.indexOf("\n];", start);
if (start < 0 || end < 0) throw new Error("SEED block not found");
const head = s.slice(0, start);
const tail = s.slice(end);
let block = s.slice(start, end);
let i = 0;
block = block.replace(
  /(\{[\s\S]*?)(date:\s*"[^"]+")(\s*)\}/g,
  (m, pre, dateLine, sp, off) => {
    if (pre.includes("gender:")) return m;
    const gen = genders[i++] ?? "Prefer not to say";
    return `${pre}gender: "${gen}", ${dateLine}${sp}}`;
  }
);
if (i !== 24) console.warn("expected 24 date fields, got", i);
fs.writeFileSync(path, head + block + tail);
