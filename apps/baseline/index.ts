import OpenAI from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

if (!process.env.OPENAI_API_KEY || !process.env.PINECONE_API_KEY || !process.env.PINECONE_ENV) {
  console.error('Missing required environment variables: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_ENV');
  process.exit(1);
}

const query = process.argv[2];
if (!query) {
  console.error('Usage: ts-node index.ts "your query here"');
  process.exit(1);
}

async function main() {
  try {
    const index = pinecone.index('baseline-demo', process.env.PINECONE_ENV!);
    const queryEmbedding = await openai.embeddings.create({
      model: 'text-embedding-3-large',
      input: query,
    });
    const results = await index.query({
      vector: queryEmbedding.data[0].embedding,
      topK: 10,
      includeMetadata: true,
    });
    const chunks = results.matches?.map(match => ({
      id: match.id,
      text: match.metadata?.text || '',
    })) || [];
    const context = chunks.map(chunk => `[${chunk.id}] ${chunk.text}`).join('\n\n');
    const prompt = `Answer the query using only the context below. Cite each source as [chunkId].\n\nContext:\n${context}\n\nQuery: ${query}`;
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
    });
    console.log(completion.choices[0]?.message?.content || 'No response');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
