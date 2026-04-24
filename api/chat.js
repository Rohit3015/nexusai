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

  // Get the latest user message
  const lastMessage = history[history.length - 1];
  const userText = lastMessage?.parts?.[0]?.text || '';

  // Decide if we need to search the web
  const needsSearch = await shouldSearch(userText);
  let searchContext = '';

  if (needsSearch && process.env.TAVILY_API_KEY) {
    try {
      searchContext = await searchWeb(userText);
    } catch (e) {
      searchContext = '';
    }
  }

  // Build system prompt
  const systemPrompt = `You are NexusAI, a helpful, knowledgeable, and friendly AI assistant. You are direct, clear, and concise. You help users with any task — writing, coding, analysis, brainstorming, and more. Always be warm and professional.

${searchContext ? `You have access to real-time web search. Here are the latest search results for the user's query:

${searchContext}

Use this information to give an accurate, up-to-date answer. Always mention when you're using web search results. Cite sources naturally in your response.` : ''}`;

  // Convert history to Groq format
  const messages = [
    { role: 'system', content: systemPrompt },
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
    return res.status(200).json({ reply, searched: needsSearch && !!searchContext });

  } catch (error) {
    return res.status(500).json({ error: 'Failed to connect to AI service.' });
  }
}

// Decide whether a message needs a web search
function shouldSearch(text) {
  const lower = text.toLowerCase();

  const searchTriggers = [
    // Time-sensitive
    'latest', 'recent', 'today', 'yesterday', 'this week', 'this month',
    'current', 'now', 'right now', 'breaking', 'news', 'update', 'updated',
    // Questions about real world
    'who is', 'what is the', 'where is', 'when did', 'how much',
    'price of', 'cost of', 'stock', 'weather', 'score',
    // Explicit search intent
    'search', 'look up', 'find', 'browse', 'google',
    'what happened', 'tell me about', 'in 2024', 'in 2025', 'in 2026',
  ];

  return searchTriggers.some(trigger => lower.includes(trigger));
}

// Search the web using Tavily
async function searchWeb(query) {
  const response = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: process.env.TAVILY_API_KEY,
      query: query,
      search_depth: 'basic',
      max_results: 4,
      include_answer: true
    })
  });

  const data = await response.json();

  if (!data.results || data.results.length === 0) {
    return '';
  }

  // Format results for AI
  let context = '';

  if (data.answer) {
    context += `Quick answer: ${data.answer}\n\n`;
  }

  context += 'Sources:\n';
  data.results.forEach((result, i) => {
    context += `\n[${i + 1}] ${result.title}\nURL: ${result.url}\n${result.content}\n`;
  });

  return context;
}
