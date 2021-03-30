# Remote Wake-on-LAN: Server

A server for passing a wakeup call to a small local device.
Calls are received from a pre-defined Telegram user using a bot.

### Configuration

Create a `.env` file, in which you specify the following environment variables:
  - `HMAC_KEY`: Pre-shared key between client and server device for authentication of status requests. Can be generated using `makeKey.js` (simply run `node makeKey.js`)
- `TELEGRAM_API_KEY`: The Telegram API key of your bot
- `TELEGRAM_USER_ID`: The Telegram user ID of the user which is authorized to perform requests
- `TELEGRAM_ADMIN_UNAME`: The Telegram username which should be referenced by the bot when unauthorized users message it
- `TELEGRAM_CERT_PATH`: Path of a self-signed certificate for communication with the Telegram API, see [here](https://core.telegram.org/bots/self-signed) for more information
- `TELEGRAM_PRIV_PATH`: Path of the private key belonging to the self-signed certificate, see [here](https://core.telegram.org/bots/self-signed) for more information
- `WEBHOOK_SUFFIX`: The suffix used for the Telegram API webhook path. I would recommend a string of at least 32 random alphanumeric characters to avoid URL encoding issues
- `DEBUG` (optional): If this environment variable is present, a debug UI can be found at the `/ui` path, and once `/poll` is called the first time, a valid authorization token is printed to stdout of the server

### Deployment

1. Build the image
```bash
docker build . -t remotewol-server:latest
```
2. Run the container
```bash
docker run -d -p 8080:8080 -p 8443:8443 --restart always --name remotewol-server remotewol-server
```
