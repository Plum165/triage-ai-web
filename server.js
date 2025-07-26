const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static("public"));

// Store conversation context per session (for now just global)
let conversation = [
  {
    role: "system",
    content: "You are a friendly triage assistant. Ask one question at a time to understand the patient's condition. Then classify the urgency as Critical, Urgent, or Non-Urgent. Finally, give clear advice."
  }
];

// Route: POST /ask
app.post("/ask", async (req, res) => {
  const userMessage = req.body.message;
  if (!userMessage) {
    return res.status(400).json({ error: "No message provided." });
  }

  // Add user's message to conversation
  conversation.push({ role: "user", content: userMessage });

  try {
    const aiResponse = await callGrokAPI(userMessage, conversation);

    // Push AI response to conversation
    conversation.push({ role: "assistant", content: aiResponse.message });

    // Return response
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

// Function: Call Grok/OpenAI-style API
async function callGrokAPI(userMessage, conversation) {
  const apiKey = "YOUR_GROK_API_KEY"; // Replace with your actual API key
  const apiURL = "https://api.grok.com/v1/chat/completions"; 
  const modelName = "llama3-8b-8192"; // ⚙️ Replace with the actual model name

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

// Extract triage level from text
function extractTriage(text) {
  const lower = text.toLowerCase();
  if (lower.includes("critical")) return "Red";
  if (lower.includes("urgent")) return "Orange";
  if (lower.includes("non-urgent")) return "Green";
  return null;
}

// Extract advice from text (simple method)
function extractAdvice(text) {
  const match = text.match(/advice[:\-]?\s*(.+)/i);
  return match ? match[1].trim() : null;
}

// Start server
app.listen(PORT, () => {
  console.log(`🚑 Triage AI server running on http://localhost:${PORT}`);
});
