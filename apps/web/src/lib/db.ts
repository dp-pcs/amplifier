import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from "@aws-sdk/lib-dynamodb";

export interface UserRecord {
  userId: string;
  substackCookie?: string;
  substackHandle?: string;
  linkedinHandle?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignAsset {
  id: string; // uuid
  type: "note" | "linkedin" | "infographic";
  content: string; // text for note/linkedin, base64 for infographic
  status: "draft" | "posted" | "dismissed";
  createdAt: string;
  postedAt?: string;
}

export interface Campaign {
  userId: string; // PK
  campaignId: string; // SK — uuid
  articleUrl: string;
  articleTitle: string;
  articleHandle: string; // substack publication
  isOwnArticle: boolean;
  assets: CampaignAsset[];
  status: "active" | "archived";
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
const CAMPAIGNS_TABLE_NAME =
  process.env.DYNAMODB_CAMPAIGNS_TABLE || "amplifier-dev-campaigns";

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

// Campaign CRUD functions

export async function createCampaign(
  userId: string,
  data: Omit<Campaign, "userId" | "campaignId" | "createdAt" | "updatedAt">
): Promise<Campaign> {
  try {
    const now = new Date().toISOString();
    const campaignId = crypto.randomUUID();

    const campaign: Campaign = {
      userId,
      campaignId,
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    await docClient.send(
      new PutCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Item: campaign,
      })
    );

    return campaign;
  } catch (error) {
    console.error("Error creating campaign:", error);
    throw error;
  }
}

export async function getCampaign(
  userId: string,
  campaignId: string
): Promise<Campaign | null> {
  try {
    const result = await docClient.send(
      new GetCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { userId, campaignId },
      })
    );

    return (result.Item as Campaign) || null;
  } catch (error) {
    console.error("Error getting campaign:", error);
    throw error;
  }
}

export async function listCampaigns(userId: string): Promise<Campaign[]> {
  try {
    const result = await docClient.send(
      new QueryCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        KeyConditionExpression: "userId = :userId",
        ExpressionAttributeValues: {
          ":userId": userId,
        },
        ScanIndexForward: false, // Sort by campaignId descending (newest first)
      })
    );

    return (result.Items as Campaign[]) || [];
  } catch (error) {
    console.error("Error listing campaigns:", error);
    throw error;
  }
}

export async function updateAssetStatus(
  userId: string,
  campaignId: string,
  assetId: string,
  status: CampaignAsset["status"],
  postedAt?: string
): Promise<void> {
  try {
    const campaign = await getCampaign(userId, campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    const assetIndex = campaign.assets.findIndex((a) => a.id === assetId);
    if (assetIndex === -1) {
      throw new Error("Asset not found");
    }

    campaign.assets[assetIndex].status = status;
    if (postedAt) {
      campaign.assets[assetIndex].postedAt = postedAt;
    }

    await docClient.send(
      new UpdateCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { userId, campaignId },
        UpdateExpression: "SET assets = :assets, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":assets": campaign.assets,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );
  } catch (error) {
    console.error("Error updating asset status:", error);
    throw error;
  }
}

export async function addAssetsToCampaign(
  userId: string,
  campaignId: string,
  assets: CampaignAsset[]
): Promise<void> {
  try {
    const campaign = await getCampaign(userId, campaignId);
    if (!campaign) {
      throw new Error("Campaign not found");
    }

    campaign.assets.push(...assets);

    await docClient.send(
      new UpdateCommand({
        TableName: CAMPAIGNS_TABLE_NAME,
        Key: { userId, campaignId },
        UpdateExpression: "SET assets = :assets, updatedAt = :updatedAt",
        ExpressionAttributeValues: {
          ":assets": campaign.assets,
          ":updatedAt": new Date().toISOString(),
        },
      })
    );
  } catch (error) {
    console.error("Error adding assets to campaign:", error);
    throw error;
  }
}
