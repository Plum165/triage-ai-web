document.getElementById('triage-form').addEventListener('submit', async function (e) {
  e.preventDefault();

  const symptoms = document.getElementById('symptoms').value;
  const onset = document.getElementById('onset').value;
  const history = document.getElementById('history').value;
  const meds = document.getElementById('meds').value;
  const location = document.getElementById('location').value;

  const prompt = `
A patient in ${location} reports:
- Symptoms: ${symptoms}
- Onset: ${onset}
- Medical history: ${history}
- Medications and allergies: ${meds}

Classify the urgency (triage) as: Critical, Urgent, or Non-Urgent.
Suggest the best course of action and nearby services (if available).
`;

  try {
        console.log("Tester");
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      
      method: 'POST',
      headers: {
        'Authorization': `Bearer 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`, // Replace this with your real key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: "llama3-8b-8192", // You can switch to "llama3-70b-8192" if needed
        messages: [
          {
            role: "system",
            content: "You are a friendly assistant helping students with triage questions.",
          },
          {
            role: "user",
            content: message,
          },
        ],
      }),
    });

    const data = await response.json();
    console.log(data);
    console.log(message);
    console.log("Tester");
    const reply = data.choices?.[0]?.message?.content || 'No response received.';

    document.getElementById('result').innerText = reply;
  } catch (error) {
    console.error('Error calling OpenAI:', error);
    document.getElementById('result').innerText = 'Something went wrong. Please try again.';
  }
});
