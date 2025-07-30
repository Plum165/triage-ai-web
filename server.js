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

// In-memory user stores
let users = [{ username: "patient", password: "1234" }];
let doctor = { username: "doctor", password: "1234" };

// Per-session conversation (for simplicity, global per user)
let conversation = [
  {
    role: "system",
    content: "You are a friendly triage assistant. Ask one question at a time to understand the patient's condition. Then classify the urgency as Critical, Urgent, or Non-Urgent and suggest simple remedies to minimize symptoms."
  }
];

let latestResponse = null; // Store latest AI result for doctor view

// === Auth Routes for patients ===
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

app.post("/login", (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username && u.password === password);
  if (!user) {
    return res.status(401).json({ error: "Invalid credentials." });
  }
  req.session.user = username;
  res.json({ success: true, user: username });
});

app.post("/logout", (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// === Auth Routes for doctors ===
app.post("/doctor-login", (req, res) => {
  const { username, password } = req.body;
  // We use the fixed doctor object for simplicity:
  if (username === doctor.username && password === doctor.password) {
    req.session.doctor = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid doctor credentials." });
  }
});

// Auth middleware for patients (or generic session)
function checkAuth(req, res, next) {
  if (req.session.user || req.session.doctor) return next();
  res.status(401).json({ error: "Not logged in." });
}

// === AI Route for patient chat ===
app.post("/ask", checkAuth, async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: "No message provided." });
  }
  conversation.push({ role: "user", content: userMessage });
  try {
    const aiResponse = await callGrokAPI(userMessage, conversation);
    conversation.push({ role: "assistant", content: aiResponse.message });
    latestResponse = {
      username: req.session.user || "Anonymous",
      issue: userMessage,
      triage: aiResponse.triage,
      advice: aiResponse.advice
    };
    // Simulate sending an email (replace this with a real email service in production)
    simulateEmail(latestResponse);
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

// === Simulate sending an email ===
function simulateEmail(responseData) {
  // This is a simulation. In a real application, integrate with an email service.
  console.log("Simulated Email Sent:");
  console.log(`To: doctor@example.com
Subject: New Patient Triage Result
Body:
Patient: ${responseData.username}
Issue: ${responseData.issue}
Triage: ${responseData.triage}
Advice: ${responseData.advice}
----------------------------
(Note: This is a simulated email.)`);
}

// === Grok API Call (simulate if not available) ===
async function callGrokAPI(userMessage, conversation) {
  const apiKey = "YOUR_GROK_API_KEY"; // Replace with your real key
  const apiURL = "https://api.grok.com/v1/chat/completions";
  const modelName = "llama3-8b-8192"; 
  try {
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
  } catch (error) {
    // Fallback simulation logic if Grok API call fails:
    console.error("Grok API call error:", error);
    return {
      message: "Based on your symptoms, please rest, hydrate, and monitor your condition closely.",
      triage: "Yellow",
      advice: "Try to minimize symptoms by staying calm, drinking water, and resting. If conditions worsen, seek professional care."
    };
  }
}

// === Helpers to extract triage and advice ===
function extractTriage(text) {
  const lower = text.toLowerCase();
  if (lower.includes("critical")) return "Red";
  if (lower.includes("urgent")) return "Orange";
  if (lower.includes("non-urgent")) return "Green";
  return "Yellow"; // default
}

function extractAdvice(text) {
  const match = text.match(/advice[:\-]?\s*(.+)/i);
  return match ? match[1].trim() : "Rest and monitor your symptoms. If they worsen, seek medical help.";
}

// === Endpoint for doctor dashboard to view latest patient result ===
app.get("/triage-data", (req, res) => {
  if (!req.session.doctor) {
    return res.status(403).json({ error: "Not authorized" });
  }
  if (latestResponse) {
    res.json([latestResponse]); // Return as an array for table display
  } else {
    res.json([]);
  }
});

// === Static Page Routes ===
app.get("/login", (req, res) => {
  res.sendFile(__dirname + "/public/login.html");
});
app.get("/signup", (req, res) => {
  res.sendFile(__dirname + "/public/signup.html");
});
app.get("/doctor-login", (req, res) => {
  res.sendFile(__dirname + "/public/doctor_login.html");
});
app.get("/doctor-dashboard", checkAuth, (req, res) => {
  res.sendFile(__dirname + "/public/doctor_dashboard.html");
});
app.get("/", (req, res) => {
  res.redirect("/login");
});

// Start server
app.listen(PORT, () => {
  console.log(`🚑 Triage AI server running on http://localhost:${PORT}/login`);
});
