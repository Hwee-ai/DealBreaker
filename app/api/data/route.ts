import { NextRequest, NextResponse } from 'next/server';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';


function ddb() {
 const client = new DynamoDBClient({
  region: process.env.CUSTOM_AWS_REGION,
  credentials: {
    accessKeyId: process.env.CUSTOM_AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.CUSTOM_AWS_SECRET_ACCESS_KEY!,
  },
 });
 return DynamoDBDocumentClient.from(client);
}


export async function POST(req: NextRequest) {
 const body = await req.json().catch(() => ({}));
 const doc = ddb();
 await doc.send(new PutCommand({
  TableName: process.env.DDB_TABLE,
  Item: {
    pk: `user#anonymous`,
    sk: `item#${Date.now()}`,
    data: body,
  },
 }));
 return NextResponse.json({ ok: true });
}