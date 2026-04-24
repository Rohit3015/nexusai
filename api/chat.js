export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { history } = req.body;

  if (!history || !Array.isArray(history)) {
    return res.status(400).json({ error: 'Invalid message history.' });
  }

  if (!process.env.GROQ_API_KEY) {
    return res.status(500).json({ error: 'GROQ_API_KEY is not set on the server.' });
  }

  // Convert history from Gemini format to OpenAI format (Groq uses OpenAI format)
  const messages = [
    {
      role: 'system',
      content: 'You are NexusAI, a helpful, knowledgeable, and friendly AI assistant. You are direct, clear, and concise. You help users with any task — writing, coding, analysis, brainstorming, and more. Always be warm and professional.'
    },
    ...history.map(msg => ({
      role: msg.role === 'model' ? 'assistant' : 'user',
      content: msg.parts[0].text
    }))
  ];

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: messages,
        max_tokens: 1024
      })
    });

    const data = await response.json();

    if (data.error) {
      return res.status(500).json({ error: data.error.message });
    }

    const reply = data?.choices?.[0]?.message?.content || 'Sorry, I could not get a response.';
    return res.status(200).json({ reply });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect to AI service.' });
  }
}
