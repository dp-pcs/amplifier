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

2. Run development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:3000](http://localhost:3000)

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
│       │   └── app/        # App Router pages
│       │       ├── page.tsx           # Landing page
│       │       ├── dashboard/         # Dashboard (stub)
│       │       ├── login/             # Login (stub)
│       │       ├── layout.tsx         # Root layout
│       │       └── globals.css        # Global styles
│       ├── public/          # Static assets
│       ├── Dockerfile       # Production container
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

## Roadmap

- [x] Scaffold Next.js app
- [x] Basic UI with landing, dashboard, and login stubs
- [x] Dockerfile for ECS deployment
- [x] DNS record setup
- [ ] Authentication (Google OAuth + NextAuth)
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
