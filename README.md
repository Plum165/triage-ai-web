# 🏥 Triage AI Support System

Triage AI is a cross-disciplinary web application designed to help users determine the urgency of their health symptoms using an AI-powered assistant. It provides a triage level (color-coded), advice to manage the condition, and forwards critical cases to doctors via a secure dashboard. It’s ideal for clinics, mobile health workers, and digital triage systems.

---

## 💡 Inspiration

Millions of people lack immediate access to healthcare professionals. We wanted to build a tool that uses conversational AI to help users triage their symptoms at home, especially in underserved areas. With summer travel, clinics often get overwhelmed — so we imagined a scalable solution for early guidance and alerting real doctors only when necessary.

---

## 🛠️ What It Does

- 🤖 **AI-Powered Triage**: Asks a few smart questions to understand your condition.
- 🔴🟡🟢 **Triage Color**: Assigns a red, yellow, or green code based on urgency.
- 📬 **Sends Results**: Doctor dashboard receives the latest case.
- 📥 **Download Summary**: Easily download your triage report as a PDF.
- 🧹 **Reset & Clear**: Reset conversation and clear the dashboard.
- 🏥 **Secure Dashboard**: Doctors must log in to view sensitive patient data.
- 🌐 **Planned Add-on**: Multilingual support for non-English users (coming soon).

---

## ⚙️ How We Built It

- **Frontend**: HTML/CSS, Vanilla JavaScript
- **Backend**: Node.js, Express
- **AI**: OpenAI GPT via Groq API
- **Authentication**: Simple session login for doctors
- **PDF Generation**: PDFKit for downloadable triage summaries
- **Hosting**: Local testing with ngrok for secure HTTPS tunneling

---

## 🧱 Challenges We Ran Into

- Managing conversation memory without bloating the prompt
- Preventing dashboard data leaks (secured with `checkAuth`)
- Making the chat responsive without a frontend framework
- PDF generation and file cleanup after download

---

## 🏆 Accomplishments That We're Proud Of

- Full working prototype with doctor dashboard
- AI response feels human and helpful
- PDF export of triage summaries
- Modular architecture ready for extensions

---

## 📚 What We Learned

- Prompt engineering for health-focused AI interaction
- Managing chat history and storing patient summaries securely
- Implementing PDFKit dynamically with cleanup
- How to route authenticated views with Express

---

## 🚀 What's Next for Triage AI

- 🌍 **Language Translator**: Let users chat in their native language.
- 📱 **Mobile-First UI**: Responsive design for small clinics and field agents.
- 🛡️ **Role-Based Access**: Different logins for patients, nurses, and doctors.
- 🧠 **Smarter AI**: Handle edge cases like multiple symptoms or follow-ups.
- 📈 **Analytics Dashboard**: Visualize triage patterns and urgent case load.

---

> Made for **Fusion Hacks 2** — a cross-disciplinary summer hackathon 🎉

