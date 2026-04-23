export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history } = req.body;

  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'You are NexusAI, a helpful, knowledgeable, and friendly AI assistant. You are direct, clear, and concise. You help users with any task — writing, coding, analysis, brainstorming, and more. Always be warm and professional.' }]
          },
          contents: history
        })
      }
    );

    const data = await response.json();
    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'Sorry, I could not get a response.';
    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong.' });
  }
}
