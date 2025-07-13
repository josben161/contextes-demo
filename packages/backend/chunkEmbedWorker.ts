// Required environment variables: OPENAI_API_KEY, PINECONE_API_KEY, PINECONE_ENV, PINECONE_INDEX, CHUNKS_TABLE, PACKS_TABLE, S3_BUCKET
// npm install @aws-sdk/client-s3 @aws-sdk/client-dynamodb pdf-parse html-to-text openai uuid
// npm install --save-dev @types/html-to-text

import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { DynamoDBClient, UpdateItemCommand, PutItemCommand } from '@aws-sdk/client-dynamodb';
import pdfParse from 'pdf-parse';
import { htmlToText } from 'html-to-text';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { SQSEvent } from 'aws-lambda';
import { Buffer } from 'buffer';
// Pinecone v6+ (JS SDK)
import { Pinecone } from '@pinecone-database/pinecone';

const s3 = new S3Client({});
const dynamo = new DynamoDBClient({});
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const pinecone = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! });

const S3_BUCKET = process.env.S3_BUCKET!;
const CHUNKS_TABLE = process.env.CHUNKS_TABLE!;
const PACKS_TABLE = process.env.PACKS_TABLE!;
const PINECONE_INDEX = process.env.PINECONE_INDEX!;
const PINECONE_ENV = process.env.PINECONE_ENV!;

// Helper: Split text into ~800-token chunks (naive, by words)
function splitText(text: string, maxTokens = 800): string[] {
  const words = text.split(/\s+/);
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxTokens) {
    chunks.push(words.slice(i, i + maxTokens).join(' '));
  }
  return chunks;
}

export const handler = async (event: SQSEvent) => {
  // Pinecone v6: index(name, environment)
  const index = pinecone.index(PINECONE_INDEX, PINECONE_ENV);

  for (const record of event.Records) {
    const { s3Key, pack, licence } = JSON.parse(record.body);
    // Download file from S3
    const s3Obj = await s3.send(new GetObjectCommand({ Bucket: S3_BUCKET, Key: s3Key }));
    const streamToBuffer = (stream: any) => new Promise<Buffer>((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk: Buffer) => chunks.push(chunk));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
      stream.on('error', reject);
    });
    const fileBuffer = await streamToBuffer(s3Obj.Body);
    let text = '';
    if (s3Key.endsWith('.pdf')) {
      const pdfData = await pdfParse(fileBuffer);
      text = pdfData.text;
    } else if (s3Key.endsWith('.html') || s3Key.endsWith('.htm')) {
      text = htmlToText(fileBuffer.toString('utf8'));
    } else {
      text = fileBuffer.toString('utf8');
    }
    // Split into chunks
    const chunks = splitText(text, 800);
    // Embed and upsert
    const vectors: {
      id: string;
      values: number[];
      metadata: Record<string, any>;
    }[] = [];
    for (const chunk of chunks) {
      const embeddingResp = await openai.embeddings.create({
        model: 'text-embedding-3-large',
        input: chunk,
      });
      const embedding = embeddingResp.data[0].embedding;
      const chunkId = uuidv4();
      vectors.push({
        id: chunkId,
        values: embedding,
        metadata: { packId: pack, licence, tokenCount: chunk.split(/\s+/).length },
      });
      // Write chunk to DynamoDB
      await dynamo.send(new PutItemCommand({
        TableName: CHUNKS_TABLE,
        Item: {
          chunkId: { S: chunkId },
          packId: { S: pack },
          licence: { S: licence },
          tokenCount: { N: chunk.split(/\s+/).length.toString() },
        },
      }));
    }
    const vectorsWithNamespace = vectors.map(v => ({ ...v, namespace: pack }));
    await index.upsert(vectorsWithNamespace);
    // Increment chunkCount in PacksTable
    await dynamo.send(new UpdateItemCommand({
      TableName: PACKS_TABLE,
      Key: { packId: { S: pack } },
      UpdateExpression: 'ADD chunkCount :inc',
      ExpressionAttributeValues: { ':inc': { N: chunks.length.toString() } },
    }));
  }
}; 