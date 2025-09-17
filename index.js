// Minimal Messenger ↔ ChatGPT webhook
require("dotenv").config();
const express = require("express");
const axios = require("axios");

const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN;
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// 0) Healthcheck (helpful for free hosting waking up)
app.get("/", (req, res) => {
  res.status(200).send("OK ✓ Messenger webhook is running");
});

// 1) Webhook verification (GET /webhook)
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  console.log("[VERIFY] mode=%s token=%s", mode, token);

  if (mode && token) {
    if (mode === "subscribe" && token === VERIFY_TOKEN) {
      console.log("[VERIFY] Success. Sending challenge.");
      return res.status(200).send(challenge);
    } else {
      console.warn("[VERIFY] Failed: token mismatch.");
      return res.sendStatus(403);
    }
  } else {
    console.warn("[VERIFY] Failed: missing mode/token.");
    return res.sendStatus(400);
  }
});

// 2) Receive events (POST /webhook)
app.post("/webhook", async (req, res) => {
  const body = req.body;

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  try {
    for (const entry of body.entry || []) {
      const event = (entry.messaging && entry.messaging[0]) || null;
      if (!event) continue;

      const sender = event.sender && event.sender.id;
      if (!sender) continue;

      if (event.message && event.message.text) {
        const userText = event.message.text;
        console.log("[MSG] From %s: %s", sender, userText);
        const reply = await chatWithOpenAI(userText);
        await sendMessage(sender, reply);
      } else if (event.postback && event.postback.payload) {
        await sendMessage(sender, "Postback received: " + event.postback.payload);
      } else {
        await sendMessage(sender, "I received something I don't understand yet 🤖");
      }
    }
    return res.status(200).send("EVENT_RECEIVED");
  } catch (err) {
    console.error("[POST /webhook] Handler error:", err?.response?.data || err.message);
    return res.sendStatus(500);
  }
});

// 3) Send a message back to the user
async function sendMessage(psid, text) {
  const url = `https://graph.facebook.com/v19.0/me/messages?access_token=${encodeURIComponent(
    PAGE_ACCESS_TOKEN
  )}`;
  const body = {
    recipient: { id: psid },
    messaging_type: "RESPONSE",
    message: { text: String(text || "").slice(0, 640) }, // FB limit ~640
  };
  await axios.post(url, body);
}

// 4) Call OpenAI Chat Completions
async function chatWithOpenAI(userText) {
  const url = "https://api.openai.com/v1/chat/completions";
  const payload = {
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: "You are a helpful assistant chatting on Facebook Messenger." },
      { role: "user", content: userText },
    ],
  };
  const headers = {
    Authorization: `Bearer ${OPENAI_API_KEY}`,
    "Content-Type": "application/json",
  };

  try {
    const { data } = await axios.post(url, payload, { headers });
    return data.choices?.[0]?.message?.content?.trim() || "Sorry, I couldn't think of a reply.";
  } catch (err) {
    console.error("[OpenAI] error:", err?.response?.data || err.message);
    return "Sorry, I ran into an error talking to the AI.";
  }
}

const port = process.env.PORT || 1337;
app.listen(port, () => console.log(`🚀 Webhook listening on port ${port}`));
