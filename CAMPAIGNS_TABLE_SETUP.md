# DynamoDB Campaigns Table Setup

## Table Creation

The campaign manager requires a DynamoDB table to store campaign and asset data. Run the following AWS CLI command to create the table:

```bash
aws --profile prod-aicoe-admin dynamodb create-table \
  --table-name amplifier-dev-campaigns \
  --attribute-definitions \
    AttributeName=userId,AttributeType=S \
    AttributeName=campaignId,AttributeType=S \
  --key-schema \
    AttributeName=userId,KeyType=HASH \
    AttributeName=campaignId,KeyType=RANGE \
  --billing-mode PAY_PER_REQUEST \
  --region us-east-1
```

## Schema

```typescript
type Campaign = {
  userId: string;          // PK — user's email
  campaignId: string;      // SK — uuid
  articleUrl: string;
  articleTitle: string;
  articleHandle: string;   // substack publication
  isOwnArticle: boolean;
  assets: CampaignAsset[];
  status: "active" | "archived";
  createdAt: string;
  updatedAt: string;
}

type CampaignAsset = {
  id: string;              // uuid
  type: "note" | "linkedin" | "infographic";
  content: string;         // text for note/linkedin, base64 for infographic
  status: "draft" | "posted" | "dismissed";
  createdAt: string;
  postedAt?: string;
}
```

## Environment Variables

Add to `.env.local`:

```
DYNAMODB_CAMPAIGNS_TABLE=amplifier-dev-campaigns
```

The table name defaults to `amplifier-dev-campaigns` if not set.

## Accessing the Table

The application uses the same AWS credentials as the users table. Ensure your AWS profile has permissions to:
- `dynamodb:PutItem`
- `dynamodb:GetItem`
- `dynamodb:Query`
- `dynamodb:UpdateItem`

## Testing

After creating the table:

1. Start the dev server: `npm run dev`
2. Navigate to `/dashboard/articles`
3. Click "Generate Content" on any article
4. Generate some content (note, LinkedIn post, or infographic)
5. Click "Save to Campaign"
6. Verify you're redirected to `/dashboard/campaigns`
7. Click on the campaign to view details and manage assets
