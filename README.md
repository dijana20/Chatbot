# Messenger ↔ ChatGPT Webhook (Quickstart)

## 1) Prereqs
- Node.js 18+ installed
- A Facebook Page & a Facebook App (Messenger product added)
- Your Page is connected to the App (you can generate a Page Access Token in the app's Messenger settings)
- OpenAI API key

## 2) Setup locally
```bash
cp .env.example .env
# then edit .env and set:
# VERIFY_TOKEN=Token_Verified_123 (or your own)
# PAGE_ACCESS_TOKEN=EAAG... (from FB)
# OPENAI_API_KEY=sk-... (from OpenAI)

npm install
npm start
```
This starts the webhook on `http://localhost:1337`.

## 3) Expose your local server
Install ngrok (or use any HTTPS tunnel) and run:
```bash
ngrok http 1337
```
Copy the **https** URL ngrok shows, e.g. `https://abcd-12-34-56-78.ngrok-free.app`.

Your **Callback URL** in Facebook will be:
```
https://abcd-12-34-56-78.ngrok-free.app/webhook
```

## 4) Verify webhook in Facebook
In **Developers → Your App → Messenger → Webhooks**:
- Callback URL: the URL from above with `/webhook`
- Verify Token: exactly the same as `VERIFY_TOKEN` in `.env`
Click **Verify and save**.

## 5) Subscribe your page to events
Still in the Messenger settings:
- Under **Webhook fields** choose at least: `messages`, `messaging_postbacks`
- Under **Subscribed Apps**, subscribe your Page to your App

## 6) Test
Open your Page in Messenger and send a message from a user who has a role on the app (Developer/Tester).
You should see replies coming from the bot.

## 7) Deploy (optional)
When you're ready for a stable Callback URL, deploy this app to a host (Render, Railway, Vercel, Fly.io, etc.).
Update the Callback URL in Facebook to your deployed URL.

## Troubleshooting
- **"The callback URL or verify token couldn't be validated"**
  - Your server isn't reachable over HTTPS (use ngrok or deploy).
  - The path isn't `/webhook` or your app isn't running.
  - `VERIFY_TOKEN` in Facebook doesn't exactly match `.env`.
  - Your GET `/webhook` handler isn't echoing `hub.challenge` (this template does).
- **No replies sent**
  - Ensure you generated a **Page Access Token** and set `PAGE_ACCESS_TOKEN`.
  - Subscribe your Page to the App and select `messages` field.
  - Check server logs for errors.
