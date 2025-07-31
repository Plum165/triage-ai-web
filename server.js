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
    content: `You are a friendly triage assistant. 
Ask one question at a time to understand the patient's condition. 
Once enough information is gathered, classify the urgency clearly as one of these triage levels: Critical, Urgent, Non-Urgent, or Mild.
Provide clear advice on how to minimize symptoms or next steps.
Format your final message exactly like this:

Triage Level: [Critical/Urgent/Non-Urgent/Mild]

Advice:
- [Advice bullet points here]

If you are still asking for more information, do not provide triage or advice yet.`
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
  if (username === doctor.username && password === doctor.password) {
    req.session.doctor = true;
    res.json({ success: true });
  } else {
    res.status(401).json({ error: "Invalid doctor credentials." });
  }
});

// Auth middleware
function checkAuth(req, res, next) {
  if (req.session.user || req.session.doctor) return next();
  res.status(401).json({ error: "Not logged in." });
}

// === AI Route for patient chat ===
app.post("/ask", async (req, res) => {
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
      triage: aiResponse.triage || "Not determined yet",
      advice: aiResponse.advice || "No advice provided yet"
    };

   

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
/*function simulateEmail(responseData) {
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
For dev purposes
}
*/
// === Grok API Call ===
async function callGrokAPI(userMessage, conversation) {
  const apiKey = "Grok_API_KEY_Here"; // Replace with your actual key
  const apiURL = "https://api.groq.com/openai/v1/chat/completions";
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
  

    if (!data.choices || data.choices.length === 0) {
      throw new Error("No response choices returned from Grok.");
    }

    const replyText = data.choices[0].message.content || "No response from Grok.";

    // Parse triage level & advice dynamically
    const triage = extractTriage(replyText);
    const advice = extractAdvice(replyText);

    return {
      message: replyText,
      triage,
      advice
    };

  } catch (error) {
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
  const triageMatch = text.match(/Triage Level:\s*(Critical|Urgent|Non-Urgent|Mild)/i);
  if (triageMatch) {
    const level = triageMatch[1];
    // Map textual levels to color codes or whatever you want
    switch (level.toLowerCase()) {
      case "critical": return "Red";
      case "urgent": return "Orange";
      case "non-urgent": return "Green";
      case "mild": return "Yellow";
      default: return "Yellow";
    }
  }
  return null; // no triage found yet
}

function extractAdvice(text) {
  const adviceMatch = text.match(/Advice:\s*((?:- .+(?:\n|$))*)/i);
  if (adviceMatch) {
    // Clean and join advice bullet points if multiple lines
    const advText = adviceMatch[1].trim();
    return advText.replace(/^\-\s*/gm, "").trim();
  }
  return null; // no advice found yet
}



// === Endpoint for doctor dashboard to view latest patient result ===
app.get("/triage-data", checkAuth, (req, res) => {
  if (latestResponse) {
    res.json([latestResponse]);
  } else {
    res.json([]);
  }
});

// === Clear the conversation memory ===
app.post("/reset", checkAuth, (req, res) => {
  conversation = [conversation[0]]; // keep system prompt
  res.sendStatus(200);
});

// === Delete triage data ===
app.delete("/triage-data", checkAuth, (req, res) => {
  latestResponse = null;
  res.sendStatus(200);
});

// === Generate downloadable PDF summary ===
app.get("/triage-pdf", checkAuth, (req, res) => {
  if (!latestResponse) return res.status(404).send("No data to export");

  const doc = new PDFDocument();
  const filename = `triage_summary_${Date.now()}.pdf`;
  const filePath = path.join(__dirname, filename);

  doc.pipe(fs.createWriteStream(filePath));
  doc.fontSize(16).text("Triage Summary", { underline: true });
  doc.moveDown();
  doc.fontSize(12).text(`Patient: ${latestResponse.username}`);
  doc.text(`Issue: ${latestResponse.issue}`);
  doc.text(`Triage: ${latestResponse.triage}`);
  doc.text(`Advice: ${latestResponse.advice}`);
  doc.end();

  doc.on("finish", () => {
    res.download(filePath, filename, () => fs.unlinkSync(filePath));
  });
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

