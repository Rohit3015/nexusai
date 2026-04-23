export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history } = req.body;

  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Invalid message history provided.' });
  }

  // Check if API Key is configured on your hosting platform/env
  if (!process.env.GEMINI_API_KEY) {
    return res.status(500).json({ error: 'GEMINI_API_KEY is not set on the server.' });
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: {
            parts: [{ text: 'You are NexusAI, a helpful, knowledgeable, and friendly AI assistant. You are direct, clear, and concise.' }]
          },
          contents: history
        })
      }
    );

    const data = await response.json();

    // Catch errors sent back by Google
    if (data.error) {
      return res.status(response.status).json({ error: data.error.message });
    }

    const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text || 'I received an empty response.';
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect to AI service.' });
  }
}