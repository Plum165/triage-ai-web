const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const session = require("express-session");
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(session({
  secret: "triage_secret_key",
  resave: false,
  saveUninitialized: true,
}));

// In-memory user store
let users = [];

// Per-session conversation (for simplicity, global per user)
let conversation = [
  {
    role: "system",
    content: "You are a friendly triage assistant. Ask one question at a time to understand the patient's condition. Then classify the urgency as Critical, Urgent, or Non-Urgent. Finally, give clear advice."
  }
];

// === Auth Routes ===

// Signup
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  const userExists = users.find(u => u.username === username);

  if (userExists) {
    return res.status(400).json({ error: "Username already taken." });
  }

  users.push({ username, password });
  req.session.user = username;
  res.json({ success: true, user: username });
});

// Login
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }

  req.session.user = username;
  res.json({ success: true, user: username });
});

// Logout
app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// Middleware to check auth
function checkAuth(req, res, next) {
  if (req.session.user) return next();
  res.status(401).json({ error: "Not logged in." });
}

// === AI Route ===
app.post("/ask", checkAuth, async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: "No message provided." });
  }

  conversation.push({ role: "user", content: userMessage });

  try {
    const aiResponse = await callGrokAPI(userMessage, conversation);

    conversation.push({ role: "assistant", content: aiResponse.message });

    res.json({
      message: aiResponse.message,
      triage: aiResponse.triage,
      advice: aiResponse.advice
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ error: "Something went wrong calling the AI." });
  }
});

// === Call Grok API ===
async function callGrokAPI(userMessage, conversation) {
  const apiKey = "YOUR_GROK_API_KEY"; // Replace with your actual key
  const apiURL = "https://api.grok.com/v1/chat/completions";
  const modelName = "llama3-8b-8192"; 

  const response = await fetch(apiURL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: modelName,
      messages: conversation
    })
  });

  const data = await response.json();
  const replyText = data.choices?.[0]?.message?.content || "No response from Grok.";

  return {
    message: replyText,
    triage: extractTriage(replyText),
    advice: extractAdvice(replyText)
  };
}

// === Helpers ===
function extractTriage(text) {
  const lower = text.toLowerCase();
  if (lower.includes("critical")) return "Red";
  if (lower.includes("urgent")) return "Orange";
  if (lower.includes("non-urgent")) return "Green";
  return null;
}

function extractAdvice(text) {
  const match = text.match(/advice[:\-]?\s*(.+)/i);
  return match ? match[1].trim() : null;
}

// === Page Routes ===
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});

app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/public/signup.html");
});
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚑 Triage AI server running on http://localhost:${PORT}/login`);
});
