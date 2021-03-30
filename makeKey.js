const fs = require("fs");
const crypto = require("crypto");
const rl = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

rl.once("line", function (line) {
  rl.close();
  const confirmations = ["y", "yes", "j", "ja"];
  if (confirmations.includes(line.toLowerCase())) {
    let lines;
    if (fs.existsSync("./.env")) {
      const envFile = fs.readFileSync("./.env", "utf-8");
      lines = envFile
        .split("\n")
        .filter((line) => !/^HMAC_KEY=/.test(line) && line.length > 0);
    } else {
      lines = [];
    }
    const newKey = crypto.randomBytes(32).toString("base64");
    lines.push(`HMAC_KEY=${newKey}`);
    const newEnvFile = lines.join("\n") + "\n";
    fs.writeFileSync("./.env", newEnvFile);
    console.log("Done!");
  } else {
    console.log("Ok! Exiting...");
    process.exit(0);
  }
});
console.log(
  "WARNING! This will overwrite any key in the .env file. Are you sure? [y/n]"
);
