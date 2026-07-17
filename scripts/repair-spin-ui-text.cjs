const fs = require("fs");
const path = require("path");

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), "utf8");
}

function write(file, content) {
  fs.writeFileSync(path.join(process.cwd(), file), content, { encoding: "utf8" });
  console.log("Fixed:", file);
}

const componentFile = "src/components/SpinWheelClient.tsx";
let component = read(componentFile);

component = component.replace(
  /function moneyFmt\(amount: number \| string \| null \| undefined\) \{[\s\S]*?\n\}/,
  `function moneyFmt(amount: number | string | null | undefined) {
  return "\\u20A6" + Number(amount || 0).toLocaleString();
}`
);

if (!component.includes("function cleanDisplayText(")) {
  component = component.replace(
    /function normalizeLabel\(value: string \| null \| undefined\) \{/,
    `function cleanDisplayText(value: string | null | undefined) {
  return String(value || "")
    .replace(/\\u00E2\\u201A\\u00A6/g, "\\u20A6")
    .replace(/\\u00E2\\u20AC\\u00A2/g, "\\u2022")
    .replace(/\\u00E2\\u20AC\\u2122/g, "'")
    .replace(/\\u00E2\\u20AC\\u0153/g, '"')
    .replace(/\\u00E2\\u20AC\\u009D/g, '"')
    .replace(/\\u00E2\\u20AC\\u201C/g, "-")
    .replace(/\\u00E2\\u20AC\\u201D/g, "-");
}

function normalizeLabel(value: string | null | undefined) {`
  );
}

component = component.replace(
  /String\(value \|\| ""\)\s*\.toLowerCase\(\)/,
  `cleanDisplayText(value).toLowerCase()`
);

component = component.replace(
  /const label = String\(item\.label \|\| ""\)\.toUpperCase\(\);/,
  `const label = cleanDisplayText(item.label).toUpperCase();`
);

component = component.replace(
  /<div className="brand-subline">[\s\S]*?<\/div>/,
  `<div className="brand-subline">LAPTOP{String.fromCharCode(8226)}GADGET{String.fromCharCode(8226)}SOLAR</div>`
);

component = component.replace(
  /function getCashoutMotivation\(player: SpinPlayer \| null\) \{[\s\S]*?\n\}/,
  `function getCashoutMotivation(player: SpinPlayer | null) {
  const display = getCashoutDisplay(player);

  if (!player) return "Register and spin to start your cashout journey.";
  if (display.balance <= 0) return "Spin now. Your first win starts the journey.";

  if (!display.cashoutAvailable) {
    const left = Math.max(0, display.step - display.balance);
    return moneyFmt(left) + " remaining - you are " + display.percent + "% there";
  }

  if (display.nextLeft <= 0) {
    return "Cashout ready. Keep spinning to unlock the next level.";
  }

  return "Cashout ready - " + moneyFmt(display.nextLeft) + " to " + moneyFmt(display.nextTarget);
}`
);

write(componentFile, component);

const demoFile = "src/lib/spin-demo-request.ts";
let demo = read(demoFile);

demo = demo.replace(
  /const demoWheelItems = \[[\s\S]*?\];/,
  `const NAIRA = "\\u20A6";

const demoWheelItems = [
  { id: "demo-1", label: \`\${NAIRA}500 Wallet Credit\`, prize_type: "cash", monetary_value: 500 },
  { id: "demo-2", label: \`\${NAIRA}200\`, prize_type: "cash", monetary_value: 200 },
  { id: "demo-3", label: \`\${NAIRA}500\`, prize_type: "cash", monetary_value: 500 },
  { id: "demo-4", label: "Try Again", prize_type: "retry", monetary_value: 0 },
  { id: "demo-5", label: \`\${NAIRA}100\`, prize_type: "cash", monetary_value: 100 },
  { id: "demo-6", label: "Bonus Spin", prize_type: "bonus_spin", monetary_value: 0 },
  { id: "demo-7", label: "MY", prize_type: "letter", monetary_value: 0 },
  { id: "demo-8", label: "TE", prize_type: "letter", monetary_value: 0 },
  { id: "demo-9", label: "CH", prize_type: "letter", monetary_value: 0 },
  { id: "demo-10", label: "NO", prize_type: "letter", monetary_value: 0 },
  { id: "demo-11", label: "LO", prize_type: "letter", monetary_value: 0 },
];`
);

write(demoFile, demo);
