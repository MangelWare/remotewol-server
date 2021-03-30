const fs = require("fs");
const https = require("https");
const FormData = require("form-data");

const API_HOSTNAME = "api.telegram.org";

function getAPIPath(apiKey, methodName) {
  return `/bot${apiKey}/${methodName}`;
}

function setWebhook(apiKey, webhookUrl, certPath) {
  const form = new FormData();
  form.append("url", webhookUrl);
  form.append("certificate", fs.createReadStream(certPath));
  console.log("Setting Webhook for " + webhookUrl);

  const requestOptions = {
    hostname: API_HOSTNAME,
    path: getAPIPath(apiKey, "setWebhook"),
    method: "POST",
    headers: form.getHeaders(),
  };

  const req = https.request(requestOptions, (res) => {
    res.on("data", (d) => {
      const response = JSON.parse(d.toString());
      console.log("[Telegram API] " + response.description);
    });
  });

  form.pipe(req);

  process.on("exit", () => {
    removeWebhook(apiKey).then(() => {
      process.exit();
    });
  });
  process.on("SIGINT", () => {
    removeWebhook(apiKey).then(() => {
      process.exit();
    });
  });
}

function removeWebhook(apiKey) {
  let thenFun = () => {};

  const form = new FormData();
  form.append("url", "");

  const requestOptions = {
    hostname: API_HOSTNAME,
    path: getAPIPath(apiKey, "setWebhook"),
    method: "POST",
    headers: form.getHeaders(),
  };

  const req = https.request(requestOptions, (res) => {
    res.once("data", (d) => {
      const response = JSON.parse(d.toString());
      console.log("[Telegram API] " + response.description);
      if (typeof thenFun == "function") {
        thenFun();
      }
    });
  });

  form.pipe(req);

  return {
    then: (fun) => {
      thenFun = fun;
    },
  };
}

function sendMessage(apiKey, userID, msg, res) {
  msg = msg.replace("!", "\\!");
  msg = msg.replace(".", "\\.");
  let body = {
    chat_id: userID,
    text: msg,
    parse_mode: "MarkdownV2",
  };
  if (res) {
    body.method = "sendMessage";
    res.json(body);
  } else {
    const encodedBody = JSON.stringify(body);
    const requestOptions = {
      hostname: API_HOSTNAME,
      path: getAPIPath(apiKey, "sendMessage"),
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": encodedBody.length,
      },
    };

    const req = https.request(requestOptions, (response) => {
      if (response.statusCode !== 200) {
        response.once("data", (data) => {
          console.log("[Telegram API] sendMessage failed:");
          process.stdout.write(data);
        });
      }
    });
    req.write(encodedBody);
    req.end();
  }
}

module.exports = {
  setWebhook,
  removeWebhook,
  sendMessage,
};
