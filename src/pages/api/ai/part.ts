import { NextRequest } from 'next/server';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    const { partContext, systemInstruction, storyContext } = await req.json();

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
        return new Response(JSON.stringify({ error: 'OpenRouter API key is not configured.' }), { status: 500 });
    }

    const userMessage = `
        **OVERALL PLOT SUMMARY:**
        ---
        ${storyContext || 'No overall summary provided.'}
        ---

        **SELECTED CHAPTERS FOR ANALYSIS:**
        ---
        ${partContext}
    `;

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openRouterApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        "model": "deepseek/deepseek-r1-0528:free",
        "messages": [
          // The user's custom instruction is now the system prompt
          { "role": "system", "content": systemInstruction },
          { "role": "user", "content": userMessage }
        ],
        "stream": true
      })
    });

    if (!openRouterResponse.ok) {
        const errorBody = await openRouterResponse.text();
        return new Response(JSON.stringify({ error: `API request failed: ${errorBody}` }), { status: openRouterResponse.status });
    }
    
    // The streaming logic is the same as our other AI endpoint
    const stream = new ReadableStream({
      async start(controller) {
        const reader = openRouterResponse.body!.getReader();
        const decoder = new TextDecoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(line => line.trim() !== '');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        const data = line.substring(6);
                        if (data === '[DONE]') {
                            controller.close();
                            return;
                        }
                        try {
                            const json = JSON.parse(data);
                            const text = json.choices[0].delta.content;
                            if (text) {
                                controller.enqueue(new TextEncoder().encode(text));
                            }
                        } catch (e) {
                            // Ignore parsing errors for incomplete JSON at the end of a chunk
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error while reading stream:', error);
            controller.error(error);
        } finally {
            controller.close();
        }
      }
    });
    return new Response(stream);

  } catch (error) {
    console.error('An unexpected error occurred:', error);
    return new Response(JSON.stringify({ error: 'An unexpected error occurred.' }), { status: 500 });
  }
}
