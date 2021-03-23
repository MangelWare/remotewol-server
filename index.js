const DEBUG = true;

const express = require("express");
const app = express();
const fs = require("fs");
const crypto = require("crypto");

const AuthCache = require("./lib/authCache");
const authCache = new AuthCache();

const WOLStateLogger = require("./lib/wolStateLogger");
const wolStateLogger = new WOLStateLogger();

// Reading the key for the HMAC-based WOL device authentication
let hmacKey;
if (!fs.existsSync("./.secret")) {
  throw new Error("Key file does not exist!");
} else {
  hmacKey = Buffer.from(fs.readFileSync("./.secret").toString(), "base64");
  if (hmacKey.length != 64) {
    throw new Error("Badly formatted key!");
  }
}

/**
 * Polling API for the WOL Device.
 * Uses a common challenge-response authentication based on 512-bit
 * randoms and HMAC (SHA512-256).
 */
app.get("/poll", (req, res) => {
  // Check if authorization header is present
  const { authorization } = req.headers;
  if (!authorization) {
    const newRandom = crypto.randomBytes(64).toString("base64");
    authCache.add(newRandom);
    res.send(newRandom);

    if (DEBUG) {
      const hmac = crypto.createHmac("SHA512-256", hmacKey);
      hmac.update(Buffer.from(newRandom, "base64"));
      const mac = hmac.digest("base64");
      console.log(`Valid authorization:\n${newRandom}:${mac}`);
    }

    return;
  }

  // Parse authorization header
  const [random, mac] = authorization.split(":");
  if (!random || !mac) {
    res.status(400);
    res.send("Authorization was not in the correct format!");
    return;
  }

  // Check if random is correct
  if (!authCache.has(random)) {
    res.status(403);
    res.send("Invalid random!");
    return;
  }

  // Prevent replay attack by invalidating random
  authCache.remove(random);

  // Verify MAC
  const macInput = Buffer.from(random, "base64");
  const hmac = crypto.createHmac("SHA512-256", hmacKey);
  hmac.update(macInput);
  const newMac = hmac.digest("base64");
  if (mac !== newMac) {
    res.status(403);
    res.send("MAC was not correct!");
    return;
  }

  // Authorized
  res.send(
    wolStateLogger.poll({ debug: true }) ? "Wake up!" : "Go back to sleep!"
  );
});

const uiPage = fs.readFileSync("./ui.html");
app.get("/ui", (req, res) => {
  res.type(".html");
  res.send(uiPage);
});

app.post("/wakeup", (req, res) => {
  res.send();
  console.log("Received wakeup!");
  wolStateLogger.wakeup({ debugUI: true });
});

app.listen(8080, () => {
  console.log("Test on http://localhost:8080/poll");
});
