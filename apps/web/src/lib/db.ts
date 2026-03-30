import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from "@aws-sdk/lib-dynamodb";

export interface UserRecord {
  userId: string;
  substackCookie?: string;
  substackHandle?: string;
  linkedinHandle?: string;
  createdAt: string;
  updatedAt: string;
}

const client = new DynamoDBClient({
  region: process.env.AWS_REGION || "us-east-1",
  ...(process.env.AWS_PROFILE && {
    credentials: undefined, // Let SDK use profile from ~/.aws/credentials
  }),
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE || "amplifier-dev-users";

export async function getUser(userId: string): Promise<UserRecord | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { userId },
      })
    );

    return (result.Item as UserRecord) || null;
  } catch (error) {
    console.error("Error getting user from DynamoDB:", error);
    throw error;
  }
}

export async function upsertUser(
  userId: string,
  data: Partial<Omit<UserRecord, "userId" | "createdAt" | "updatedAt">>
): Promise<UserRecord> {
  try {
    const now = new Date().toISOString();
    const existingUser = await getUser(userId);

    const userRecord: UserRecord = {
      userId,
      substackCookie: data.substackCookie ?? existingUser?.substackCookie,
      substackHandle: data.substackHandle ?? existingUser?.substackHandle,
      linkedinHandle: data.linkedinHandle ?? existingUser?.linkedinHandle,
      createdAt: existingUser?.createdAt || now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: userRecord,
      })
    );

    return userRecord;
  } catch (error) {
    console.error("Error upserting user to DynamoDB:", error);
    throw error;
  }
}
