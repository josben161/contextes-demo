// Required environment variables: BUCKET, INGEST_JOBS_URL
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { APIGatewayProxyHandler } from 'aws-lambda';
import Busboy from 'busboy';
import { Buffer } from 'buffer';
// If you see type errors for process or Buffer, run: npm i --save-dev @types/node

const s3 = new S3Client({});
const sqs = new SQSClient({});

const BUCKET = process.env.BUCKET!;
const SQS_URL = process.env.INGEST_JOBS_URL!;

export const handler: APIGatewayProxyHandler = async (event) => {
  if (!event.headers['content-type'] && !event.headers['Content-Type']) {
    return { statusCode: 400, body: 'Missing Content-Type header' };
  }

  const contentType = event.headers['content-type'] || event.headers['Content-Type'];
  const busboy = Busboy({ headers: { 'content-type': contentType } });

  const fileBuffer: Buffer[] = [];
  let filename = '';
  let pack = '';
  let licence = '';

  return new Promise((resolve) => {
    busboy.on('file', (fieldname, file, info) => {
      filename = info.filename;
      file.on('data', (data) => fileBuffer.push(data));
    });
    busboy.on('field', (fieldname, value) => {
      if (fieldname === 'pack') pack = value;
      if (fieldname === 'licence') licence = value;
    });
    busboy.on('finish', async () => {
      try {
        if (!filename || !pack) {
          resolve({ statusCode: 400, body: 'Missing filename or pack' });
          return;
        }
        const s3Key = `${pack}/${filename}`;
        await s3.send(new PutObjectCommand({
          Bucket: BUCKET,
          Key: s3Key,
          Body: Buffer.concat(fileBuffer),
        }));
        await sqs.send(new SendMessageCommand({
          QueueUrl: SQS_URL,
          MessageBody: JSON.stringify({ s3Key, pack, licence }),
        }));
        resolve({ statusCode: 202, body: '' });
      } catch (err) {
        resolve({ statusCode: 500, body: 'Error processing upload' });
      }
    });
    busboy.end(Buffer.from(event.body!, event.isBase64Encoded ? 'base64' : 'utf8'));
  });
}; 