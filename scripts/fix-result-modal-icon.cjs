const fs = require("fs");

const file = "src/components/SpinWheelClient.tsx";
let code = fs.readFileSync(file, "utf8");

// Replace emoji result function with safe Font Awesome icon function
code = code.replace(
  /  function resultEmoji\(\) \{[\s\S]*?  \}\r?\n\r?\n  return \(/,
  `  function resultIconClass() {
    if (!lastResult) return "fas fa-gift";
    if (lastResult.result_type === "retry") return "fas fa-redo-alt";
    if (lastResult.result_type === "letter") return "fas fa-puzzle-piece";
    if (lastResult.cashout_eligible) return "fas fa-money-bill-wave";
    if (lastResult.result_type === "bonus_spin") return "fas fa-sync-alt";
    return "fas fa-gift";
  }

  return (`
);

// Replace the big emoji display inside the result modal
code = code.replace(
  /<div className="relative mb-6 text-8xl">\{resultEmoji\(\)\}<\/div>/,
  `<div className="relative mx-auto mb-8 flex h-24 w-24 items-center justify-center rounded-full bg-white/10 text-white">
                  <i className={resultIconClass() + " text-5xl"} />
                </div>`
);

// Remove any already-corrupted emoji leftovers if they exist in text
code = code
  .replace(/ðŸ˜…/g, "")
  .replace(/ðŸŽ‰/g, "")
  .replace(/ðŸ§©/g, "")
  .replace(/ðŸ’¸/g, "")
  .replace(/ðŸ”/g, "")
  .replace(/ðŸ”¥/g, "")
  .replace(/ðŸŽ/g, "");

fs.writeFileSync(file, code, "utf8");
console.log("Result modal icon fixed.");
