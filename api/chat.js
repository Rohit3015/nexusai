export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { messages } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Invalid request' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY, // Stored securely in Vercel
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1024,
        system: 'You are NexusAI, a helpful, knowledgeable, and friendly AI assistant. You are direct, clear, and concise. You help users with any task they have — writing, coding, analysis, brainstorming, and more. Always be warm and professional.',
        messages: messages
      })
    });

    const data = await response.json();
    const reply = data?.content?.[0]?.text || 'Sorry, I could not get a response.';

    return res.status(200).json({ reply });
  } catch (error) {
    return res.status(500).json({ error: 'Something went wrong. Please try again.' });
  }
}
