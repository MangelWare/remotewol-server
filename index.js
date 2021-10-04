require("dotenv").config();
const express = require("express");
const app = express();
const fs = require("fs");
const crypto = require("crypto");
const http = require("http");
const https = require("https");

const AuthCache = require("./lib/authCache");
const authCache = new AuthCache();

const WOLStateLogger = require("./lib/wolStateLogger");
const { env } = require("process");
const wolStateLogger = new WOLStateLogger();

// Reading the key for the HMAC-based WOL device authentication
let hmacKey;
if (!process.env.HMAC_KEY) {
  throw new Error("Key environment variable does not exist!");
} else {
  hmacKey = Buffer.from(process.env.HMAC_KEY, "base64");
  if (hmacKey.length != 32) {
    throw new Error("Badly formatted key!");
  }
}

/**
 * Polling API for the WOL Device.
 * Uses a common challenge-response authentication based on 512-bit
 * randoms and HMAC (SHA512).
 */
app.get("/poll", (req, res) => {
  // Check if authorization header is present
  const { authorization } = req.headers;
  if (!authorization) {
    const newRandom = crypto.randomBytes(64).toString("base64");
    authCache.add(newRandom);
    res.send(newRandom);

    if (process.env.DEBUG) {
      const hmac = crypto.createHmac("SHA256", hmacKey);
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
  const hmac = crypto.createHmac("SHA256", hmacKey);
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

app.post("/" + process.env.WEBHOOK_SUFFIX, (req, res) => {
  req.on("data", (d) => {
    const update = JSON.parse(d.toString());
    if (update.message) {
      const { message } = update;
      if (
        message.from &&
        message.from.id &&
        String(message.from.id) === process.env.TELEGRAM_USER_ID
      ) {
        const { text } = message;
        switch (text) {
          case "/wakeup":
            console.log("Wakeup call received!");
            wolStateLogger.wakeup({ telegram_uid: message.from.id }, () => {
              telegramAPI.sendMessage(
                process.env.TELEGRAM_API_KEY,
                message.from.id,
                "Device woke up!"
              );
            });
            telegramAPI.sendMessage(
              process.env.TELEGRAM_API_KEY,
              message.from.id,
              "Waking up the WOL device!",
              res
            );
            break;
          case "/info":
            telegramAPI.sendMessage(
              process.env.TELEGRAM_API_KEY,
              message.from.id,
              "```" + JSON.stringify(wolStateLogger.getLog(10)) + "```",
              res
            );
            break;
          default:
            telegramAPI.sendMessage(
              process.env.TELEGRAM_API_KEY,
              message.from.id,
              "I do not understand!",
              res
            );
            break;
        }
      } else {
        console.log("Unauthorized message!");
        telegramAPI.sendMessage(
          process.env.TELEGRAM_API_KEY,
          message.from.id,
          `You are not authorized! Talk to @${process.env.TELEGRAM_ADMIN_UNAME} if you think you should be authorized to use this bot!`,
          res
        );
      }
    } else {
      console.log("Non-message update:");
      console.log(JSON.stringify(update, null, 2));
      res.send();
    }
  });
});

if (process.env.DEBUG) {
  const uiPage = fs.readFileSync("./lib/ui.html");
  app.get("/ui", (req, res) => {
    res.type(".html");
    res.send(uiPage);
  });
}

app.post("/wakeup", (req, res) => {
  res.send();
  console.log("Received wakeup!");
  wolStateLogger.wakeup({ debugUI: true });
});

var credentials = {
  key: fs.readFileSync(process.env.TELEGRAM_PRIV_PATH),
  cert: fs.readFileSync(process.env.TELEGRAM_CERT_PATH),
};

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);
httpServer.listen(8080);
httpsServer.listen(8443);

const telegramAPI = require("./lib/telegramAPI");
const { Console } = require("console");
telegramAPI.setWebhook(
  process.env.TELEGRAM_API_KEY,
  "https://" + process.env.VM_HOSTNAME + ":8443/" + process.env.WEBHOOK_SUFFIX,
  process.env.TELEGRAM_CERT_PATH
);
