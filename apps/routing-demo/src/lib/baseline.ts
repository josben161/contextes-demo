import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

export async function baselineAnswer(query: string): Promise<string> {
  const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

  // Correct v3 Pinecone usage:
  const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });
  const index = pinecone.index('baseline-demo', process.env.PINECONE_ENVIRONMENT!);

  const queryEmbedding = await openai.embeddings.create({
    model: 'text-embedding-3-large',
    input: query,
  });

  const results = await index.query({
    vector: queryEmbedding.data[0].embedding,
    topK: 10,
    includeMetadata: true,
  });

  const chunks = results.matches?.map((match) => ({
    id: match.id,
    text: match.metadata?.text || '',
  })) || [];

  const context = chunks.map((chunk) => `[${chunk.id}] ${chunk.text}`).join('\n\n');
  const prompt = `Answer the query using only the context below. Cite each source as [chunkId].\n\nContext:\n${context}\n\nQuery: ${query}`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });

  return completion.choices[0]?.message?.content || 'No response';
}
