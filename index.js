const express = require("express");
const app = express();

const fs = require("fs");
const crypto = require("crypto");

let key;
if (!fs.existsSync("./.secret")) {
  throw new Error("Key file does not exist!");
} else {
  key = Buffer.from(fs.readFileSync("./.secret").toString(), "base64");
  console.log(key.length);
  if (key.length != 64) {
    throw new Error("Badly formatted key!");
  }
}

const DEBUG = true;
if (DEBUG) {
  //const key = crypto.randomBytes(64);
  //console.log(key.toString("hex"));

  /*key = Buffer.from(
    "63ba6a3a0fbd4b38639c48a29eed85fdb3add1c7484c8cb4f4ccf9b13a436af48a88297a9acef170d71f0974691993cbc48347efca4f596e199bc99f25351cc6",
    "hex"
  );*/

  let ts = Date.now();
  const hmac = crypto.createHmac("SHA512-256", key);
  hmac.update(ts.toString(), "utf-8");
  let mac = hmac.digest("base64");
  console.log(`Authorization: ${ts}:${mac}`);
}

app.get("/poll", (req, res) => {
  // Check if authorization header is present
  const { authorization } = req.headers;
  if (!authorization) {
    res.status(403);
    res.send("No authorization given!");
    return;
  }

  // Parse authorization header
  let [timestamp, mac] = authorization.split(":");
  if (!timestamp || !mac) {
    res.status(400);
    res.send("Authorization was not in the correct format!");
    return;
  }

  // Parse timestamp as number
  timestamp = Number(timestamp);
  if (!timestamp || typeof timestamp !== "number" || timestamp == NaN) {
    res.status(400);
    res.send("Timestamp is not a number!");
    return;
  }

  // Check timestamp recency
  let now = Date.now();
  if (now < timestamp || now - timestamp > 1000 * 10) {
    res.status(403);
    res.send("Timestamp already expired or in the future!");
    return;
  }

  // Verify MAC
  let macInput = Buffer.from(timestamp.toString(), "utf8");
  const hmac = crypto.createHmac("SHA512-256", key);
  hmac.update(macInput);
  let newMac = hmac.digest("base64");
  if (mac !== newMac) {
    res.status(403);
    res.send("MAC was not correct!");
    return;
  }

  // Authorized
  res.send("Moooooin Meister!");
});

app.listen(8080, () => {
  console.log("Test on http://localhost:8080/poll");
});
