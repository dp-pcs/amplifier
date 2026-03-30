# Amplifier

Content amplification platform for transforming Substack articles into LinkedIn posts.

## What is Amplifier?

Amplifier is a web application that helps content creators expand their reach by intelligently adapting Substack content for LinkedIn. It automates the process of transforming long-form articles into engaging LinkedIn posts, helping you maintain a consistent presence across platforms.

### Key Features (Planned)

- **Content Import**: Connect your Substack and automatically import articles
- **AI-Powered Adaptation**: Transform content for LinkedIn's format and audience
- **Publishing & Scheduling**: Schedule and publish posts directly to LinkedIn
- **Analytics**: Track engagement and performance across platforms

## Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **React 19** - UI library
- **TypeScript** - Type safety
- **Tailwind CSS 4** - Styling
- **NextAuth.js 5** - Authentication
- **Google Fonts** - Space Grotesk, Inter, JetBrains Mono

### Infrastructure
- **AWS ECS Fargate** - Container orchestration
- **AWS ECR** - Container registry
- **AWS Route53** - DNS management
- **AWS Application Load Balancer** - Load balancing
- **DynamoDB** - Database (planned)

### Deployment
- **Docker** - Containerization (multi-stage builds)
- **AWS Account**: 913524910742 (prod-aicoe-admin)
- **Domain**: amplify.elelem.expert
- **Region**: us-east-1

## Local Development

### Prerequisites
- Node.js 22+
- npm or yarn

### Setup

1. Install dependencies:
   ```bash
   cd apps/web
   npm install
   ```

2. Configure environment variables:
   ```bash
   cp .env.example .env
   ```

   Then edit `.env` with your credentials:
   - **Google OAuth**: Create a new project at [Google Cloud Console](https://console.cloud.google.com/)
     - Project name: `amplifier-portal`
     - Navigate to APIs & Services → Credentials
     - Create OAuth 2.0 Client ID (Web application)
     - Add authorized redirect URI: `https://amplify.elelem.expert/api/auth/callback/google`
     - For local development, also add: `http://localhost:3000/api/auth/callback/google`
     - Copy the Client ID and Client Secret to your `.env`
   - **NEXTAUTH_SECRET**: Generate with `openssl rand -base64 32`
   - **NEXTAUTH_URL**: `http://localhost:3000` for local dev, `https://amplify.elelem.expert` for production
   - **ALLOWED_EMAIL_DOMAINS**: `trilogy.com` (or your organization's domain)
   - **ALLOWED_EMAILS**: Add specific email addresses if needed (e.g., `david.proctor@trilogy.com`)

3. Run development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000)

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm start` - Start production server
- `npm run lint` - Run ESLint

## Project Structure

```
amplifier/
├── apps/
│   └── web/                 # Next.js web application
│       ├── src/
│       │   ├── app/        # App Router pages
│       │   │   ├── api/auth/[...nextauth]/ # NextAuth routes
│       │   │   ├── page.tsx           # Landing page
│       │   │   ├── dashboard/         # Protected dashboard
│       │   │   ├── login/             # Login page (Google OAuth)
│       │   │   ├── layout.tsx         # Root layout
│       │   │   └── globals.css        # Global styles
│       │   └── auth.ts     # NextAuth configuration
│       ├── public/          # Static assets
│       ├── middleware.ts    # Route protection middleware
│       ├── Dockerfile       # Production container
│       ├── .env.example     # Environment variables template
│       ├── package.json
│       └── tsconfig.json
└── infra/
    └── config.ts           # AWS infrastructure config
```

## Deployment

The application is containerized and deployed to AWS ECS Fargate.

### Build Configuration
- **ECR Repository**: `amplifier/dev/web`
- **ECS Cluster**: `amplifier-dev-cluster`
- **Domain**: `amplify.elelem.expert`

### Docker Build
```bash
cd apps/web
docker build --platform linux/amd64 -t amplifier-web .
```

### Infrastructure Setup (Coming in clawd-qhs.7)
- ECS cluster, service, and task definition
- Application Load Balancer with HTTPS
- Route53 DNS records (A record created, ALB integration pending)
- ECR repository
- DynamoDB tables

### Authentication
The application uses NextAuth.js 5 with Google OAuth for authentication:
- Only @trilogy.com email addresses are allowed by default
- Additional individual emails can be allowlisted via `ALLOWED_EMAILS` environment variable
- Protected routes (e.g., `/dashboard`) require authentication
- Middleware automatically redirects unauthenticated users to `/login`

## Roadmap

- [x] Scaffold Next.js app
- [x] Basic UI with landing, dashboard, and login stubs
- [x] Dockerfile for ECS deployment
- [x] DNS record setup
- [x] Authentication (Google OAuth + NextAuth)
  - [x] NextAuth.js 5 integration
  - [x] Google OAuth provider
  - [x] Domain allowlist (@trilogy.com)
  - [x] Protected routes with middleware
  - [x] Sign in/sign out flow
- [ ] AWS infrastructure provisioning
- [ ] Substack integration
- [ ] LinkedIn API integration
- [ ] Content transformation engine
- [ ] Publishing workflow
- [ ] Analytics dashboard

## Related Projects

This app follows the same architecture patterns as:
- **Clawporate** (openclaw-enterprise-per-user) - Enterprise OpenClaw portal

## License

Private project - David Proctor
