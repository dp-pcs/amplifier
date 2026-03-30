# Amplifier

Content amplification platform for transforming Substack articles into multi-channel social media content.

## What is Amplifier?

Amplifier is an internal tool for the Trilogy AI CoE team that helps amplify content reach by transforming Substack articles into optimized formats for multiple platforms. Select an article, and Amplifier generates:

- **Substack Notes** (1st and 3rd person variations)
- **LinkedIn posts** optimized for engagement
- **Infographics** via Google Gemini
- **Campaign scheduling** for coordinated drip releases

Designed for internal use by the Trilogy AI CoE team to maximize content impact across platforms.

## Features

### ✅ Implemented

- **Google OAuth Authentication** - Secure sign-in restricted to @trilogy.com accounts via NextAuth v5
- **User Settings Management** - Persistent storage for Substack cookies and social media handles
- **DynamoDB Integration** - User preferences stored in `amplifier-dev-users` table
- **Protected Dashboard** - Session-aware navigation with automatic redirect to login
- **AWS Deployment Ready** - Containerized for ECS Fargate deployment

### 🔄 In Development

- **Substack Article Browser** - Select author → browse and select articles
- **Multi-Format Content Generator** - Generate Notes, LinkedIn posts, and infographics from selected articles
- **Campaign Manager** - Schedule and coordinate content releases across platforms
- **Drip Scheduler** - Automated posting timeline for maximum engagement
- **Browser Extension** - One-click Substack cookie export for seamless authentication
- **ALS Link Integration** - Automatic aicoe.fit short link creation for tracking

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - Latest React with server components
- **TypeScript** - Full type safety
- **Tailwind CSS 4** - Modern utility-first styling
- **NextAuth.js 5** - Authentication with Google OAuth provider

### Backend & Infrastructure
- **DynamoDB** - NoSQL database for user settings
  - Table: `amplifier-dev-users`
  - Primary Key: `userId` (email)
  - Attributes: `substackCookie`, `substackHandle`, `linkedinHandle`
- **AWS ECS Fargate** - Containerized deployment
- **AWS ECR** - Container registry
- **AWS Route53** - DNS management
- **Application Load Balancer** - Traffic distribution with HTTPS

### Cloud Services
- **AWS Account**: 913524910742 (prod-aicoe-admin)
- **AWS Region**: us-east-1
- **GCP Project**: amplify (onyx-sequencer-491817-i5) in devfactory.com org
- **Domain**: amplify.elelem.expert

## Local Development

### Prerequisites
- Node.js 22+
- AWS CLI configured with `prod-aicoe-admin` profile (for DynamoDB access)
- Access to GCP project for OAuth credentials

### Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd amplifier/apps/web
   npm install
   ```

2. **Configure environment variables**:

   Create `apps/web/.env.local` with the following variables:

   ```bash
   # NextAuth Configuration
   NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
   NEXTAUTH_URL=http://localhost:3000

   # Google OAuth (from GCP Console)
   GOOGLE_CLIENT_ID=<your-client-id>
   GOOGLE_CLIENT_SECRET=<your-client-secret>

   # Authentication Allowlist
   ALLOWED_EMAIL_DOMAINS=trilogy.com
   ALLOWED_EMAILS=<optional comma-separated list of specific emails>

   # AWS DynamoDB
   AWS_REGION=us-east-1
   AWS_PROFILE=prod-aicoe-admin
   DYNAMODB_TABLE_NAME=amplifier-dev-users
   ```

3. **Run development server**:
   ```bash
   npm run dev
   ```

4. **Open application**:
   - Navigate to [http://localhost:3000](http://localhost:3000)
   - Sign in with your @trilogy.com Google account

### Available Scripts

- `npm run dev` - Start development server (port 3000)
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Google OAuth Setup

To configure Google OAuth for local development or new environments:

1. **Access GCP Console**:
   - Navigate to [Google Cloud Console](https://console.cloud.google.com/)
   - Select project: `amplify` (onyx-sequencer-491817-i5)

2. **Configure OAuth 2.0 Credentials**:
   - Go to APIs & Services → Credentials
   - Create or edit OAuth 2.0 Client ID (Web application)

3. **Set Authorized Redirect URIs**:
   - Production: `https://amplify.elelem.expert/api/auth/callback/google`
   - Local dev: `http://localhost:3000/api/auth/callback/google`

4. **Copy Credentials**:
   - Copy Client ID and Client Secret to your `.env.local` file

5. **Enable Required APIs**:
   - Ensure Google+ API is enabled for profile information

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Route53 (DNS)                             │
│                   amplify.elelem.expert                          │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│              Application Load Balancer (HTTPS)                   │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ECS Fargate Service                           │
│  ┌────────────────────────────────────────────────────────┐     │
│  │              Next.js App (Container)                    │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  App Router                                   │      │     │
│  │  │  • / (landing)                                │      │     │
│  │  │  • /login (Google OAuth)                      │      │     │
│  │  │  • /dashboard (protected)                     │      │     │
│  │  │  • /dashboard/settings (user preferences)     │      │     │
│  │  │  • /api/settings (DynamoDB CRUD)              │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  │  ┌──────────────────────────────────────────────┐      │     │
│  │  │  NextAuth v5                                  │      │     │
│  │  │  • Google OAuth provider                      │      │     │
│  │  │  • Domain allowlist (@trilogy.com)            │      │     │
│  │  │  • Session management                         │      │     │
│  │  └──────────────────────────────────────────────┘      │     │
│  └────────────────────────────────────────────────────────┘     │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      DynamoDB                                    │
│                  amplifier-dev-users                             │
│  ┌──────────────────────────────────────────────────────┐       │
│  │ PK: userId (email)                                   │       │
│  │ • substackCookie (masked in UI)                      │       │
│  │ • substackHandle                                     │       │
│  │ • linkedinHandle                                     │       │
│  └──────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────┘

External Services:
• Google Cloud Platform - OAuth authentication
• Google Gemini API - Infographic generation (planned)
• Substack API - Article fetching (planned)
• LinkedIn API - Post publishing (planned)
```

### Data Flow

1. **Authentication**: User signs in via Google OAuth → NextAuth validates @trilogy.com domain → Session created
2. **Settings Management**: User updates Substack/LinkedIn credentials → API route → DynamoDB write
3. **Content Generation** (planned): Select article → Fetch from Substack → Generate variations → Preview → Schedule/publish

## Deployment

The application is containerized and deployed to AWS ECS Fargate.

### Infrastructure Details

- **ECS Cluster**: `amplifier-dev-cluster`
- **ECR Repository**: `amplifier/dev/web`
- **Domain**: amplify.elelem.expert
- **AWS Account**: 913524910742 (prod-aicoe-admin)
- **Region**: us-east-1

### Docker Build

```bash
cd apps/web
docker build --platform linux/amd64 -t amplifier-web .
```

### Environment Variables for Production

Ensure the following environment variables are configured in ECS task definition:

```bash
NEXTAUTH_SECRET=<production-secret>
NEXTAUTH_URL=https://amplify.elelem.expert
GOOGLE_CLIENT_ID=<gcp-oauth-client-id>
GOOGLE_CLIENT_SECRET=<gcp-oauth-client-secret>
ALLOWED_EMAIL_DOMAINS=trilogy.com
AWS_REGION=us-east-1
DYNAMODB_TABLE_NAME=amplifier-dev-users
```

**Note**: AWS credentials are provided via ECS task role, not environment variables.

## Project Structure

```
amplifier/
├── apps/
│   └── web/                          # Next.js web application
│       ├── src/
│       │   ├── app/                  # App Router
│       │   │   ├── api/
│       │   │   │   └── settings/
│       │   │   │       └── route.ts  # Settings API (GET/POST)
│       │   │   ├── dashboard/
│       │   │   │   ├── page.tsx      # Main dashboard
│       │   │   │   └── settings/
│       │   │   │       └── page.tsx  # User settings UI
│       │   │   ├── login/
│       │   │   │   └── page.tsx      # OAuth login page
│       │   │   ├── layout.tsx        # Root layout with navigation
│       │   │   ├── page.tsx          # Landing page
│       │   │   └── globals.css       # Global styles
│       │   ├── lib/
│       │   │   └── db.ts             # DynamoDB client wrapper
│       │   └── auth.ts               # NextAuth v5 configuration
│       ├── public/                   # Static assets
│       ├── middleware.ts             # Route protection
│       ├── Dockerfile                # Production container
│       ├── .env.example              # Environment template
│       ├── .env.local                # Local config (gitignored)
│       ├── package.json
│       └── tsconfig.json
├── infra/
│   └── config.ts                     # AWS infrastructure config
└── README.md
```

## Development Roadmap

### Phase 1: Foundation ✅
- [x] Next.js 16 application scaffold
- [x] Google OAuth authentication with domain allowlist
- [x] DynamoDB user settings storage
- [x] Protected dashboard and settings page
- [x] AWS deployment configuration

### Phase 2: Content Integration 🔄
- [ ] Substack article browser (author selection → article list)
- [ ] Article content fetching and parsing
- [ ] Browser extension for cookie export
- [ ] LinkedIn API integration

### Phase 3: Content Generation 🔄
- [ ] Substack Notes generator (1st/3rd person)
- [ ] LinkedIn post generator (multiple variations)
- [ ] Google Gemini infographic generation
- [ ] Content preview and editing interface

### Phase 4: Campaign Management 🔄
- [ ] Campaign creation and management
- [ ] Drip schedule configuration
- [ ] Multi-platform publishing coordination
- [ ] ALS link integration (aicoe.fit short links)

### Phase 5: Analytics & Optimization 📋
- [ ] Engagement tracking across platforms
- [ ] Performance analytics dashboard
- [ ] A/B testing for content variations
- [ ] Automated content optimization suggestions

## Related Projects

This application follows similar architecture patterns as:
- **Clawporate** (openclaw-enterprise-per-user) - Enterprise OpenClaw portal
- Both use: NextAuth v5, ECS Fargate, DynamoDB, domain-restricted OAuth

## License

Private project - Trilogy AI CoE
