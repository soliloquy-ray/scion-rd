import { NextRequest } from 'next/server';

export const runtime = 'edge';

export default async function handler(req: NextRequest) {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405 });
  }

  try {
    // **UPDATED**: Now receives the overall story context and chapter number
    const { content, promptType, storyContext, chapterNumber, recentChaptersContent } = await req.json();

    if (!content || !promptType) {
      return new Response(JSON.stringify({ error: 'Content and promptType are required.' }), { status: 400 });
    }

    const openRouterApiKey = process.env.OPENROUTER_API_KEY;
    if (!openRouterApiKey) {
      return new Response(JSON.stringify({ error: 'OpenRouter API key is not configured.' }), { status: 500 });
    }

    let systemPrompt = '';
    let userMessage = content;

    if (promptType === 'critique') {
      systemPrompt = "You are an expert literary critic providing feedback on a novel-in-progress. Please understand that this novel's goal is traditional publishing so hold it to the highest of standards. Use the provided OVERALL PLOT SUMMARY for context on the entire story. The user will provide the current chapter content they want feedback on. Analyze the current chapter in relation to the established plot summary and its chapter number in the sequence. Focus on plot consistency, character development, and pacing. Ensure to assign an assessment score 1-10 for the chapter. After this, have another separate section titled CHAPTER SUMMARY. Under this you will provide a comprehensive summary of the CURRENT CHAPTER. The goal is to provide a write-up containing all of the necessary details and story points";
    } else if (promptType === 'summarize') {
      systemPrompt = "You are a helpful writing assistant. Provide a comprehensive summary of the entire story using the OVERALL PLOT SUMMARY as context as well as the CURRENT CHAPTER. The goal is to provide a write-up containing all of the necessary details and story points.";
    }
      // **UPDATED**: The user message is now much more focused
      if (storyContext) {
         userMessage = `
        **1. OVERALL PLOT SUMMARY:**
        ---
        ${storyContext || 'No overall summary provided.'}
        ---

        **2. RECENT PRECEDING CHAPTERS:**
        ---
        ${recentChaptersContent || 'No preceding chapters.'}
        ---

        **3. CURRENT CHAPTER (${chapterNumber}) FOR REVIEW:**
        ---
        ${content}
      `;
      }

    const openRouterResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: { "Authorization": `Bearer ${openRouterApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        "model": "deepseek/deepseek-r1-0528:free",
        "messages": [
          { "role": "system", "content": systemPrompt },
          { "role": "user", "content": userMessage }
        ],
        "stream": true
      })
    });

    if (!openRouterResponse.ok) {
        const errorBody = await openRouterResponse.text();
        return new Response(JSON.stringify({ error: `API request failed: ${errorBody}` }), { status: openRouterResponse.status });
    }
    
    // The streaming logic remains the same
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
    return new Response(JSON.stringify({ error: 'An unexpected error occurred on the server.' }), { status: 500 });
  }
}

