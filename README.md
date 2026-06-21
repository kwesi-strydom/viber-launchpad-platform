# VIBER Apps Platform

A modern full-stack web application for hosting and showcasing AI-generated apps created during 60-minute "vibecoding" hackathon sessions. Built with React, Express, and Drizzle ORM, featuring a gaming-inspired UI with retro aesthetics.

## 🎯 Overview

The VIBER Apps Platform successfully hosted live hackathon competitions where developers create innovative apps in 60-minute sprint challenges. The platform features secure authentication, fair voting systems, and real-time leaderboards.

## ✨ Key Features

- **Role-Based Access Control**: Separate portals for Competitors and Spectators
- **Real-Time Voting System**: Cross-device rating sync with fraud prevention
- **Fair Leaderboard**: IMDb weighted rating formula prevents apps with few votes from unfairly dominating
- **Live Competition Ready**: Battle-tested during successful live events
- **Modern UI**: Glass-effect design with neon color scheme
- **Mobile Optimized**: Full mobile authentication and rating support

## 🏗️ Architecture

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and builds
- **Shadcn/ui** components with Radix UI primitives
- **Tailwind CSS** with custom design system
- **TanStack Query** for server state management
- **React Router** for navigation

### Backend
- **Node.js** with Express.js
- **TypeScript** with ES modules
- **Cookie-based authentication** with secure sessions
- **Drizzle ORM** with PostgreSQL
- **Real-time data sync**

### Database
- **Neon PostgreSQL** serverless database
- **Drizzle Kit** for schema management
- **Type-safe** database operations

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL database (Neon recommended)

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Nassaramuto/VIBER-Platform.git
cd VIBER-Platform
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
# Required: Database connection URL
DATABASE_URL=your_neon_database_url_here

# Optional: Leaderboard minimum votes threshold (default: 5)
# This controls the IMDb weighted rating formula
LEADERBOARD_MIN_VOTES=5
```

4. Push database schema:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

## 📊 Competition Results

The platform successfully hosted a live competition with the following winners:

🥇 **NS News** (Team Star) - 4.58★ (12 votes)
🥈 **Flappy Debbie** (Pure Positivity) - 4.50★ (8 votes)  
🥉 **Don't drop the ball** (Rainfall 2) - 4.27★ (11 votes)

## 🎮 User Types

### Competitors
- Create team profiles (2 members + team name)
- Submit apps with title, description, thumbnail, and URL
- View personal dashboard with submitted apps
- Access dedicated submission form

### Spectators
- Create individual profiles (name + email)
- Browse and rate apps in gallery
- View personal dashboard with rated apps
- Cross-device rating synchronization

## 🛡️ Security Features

- **Session-based authentication** with secure cookies
- **Rate limiting** and duplicate vote prevention
- **IP tracking** and user agent fingerprinting
- **Cross-device sync** for authenticated users
- **Mobile-optimized** authentication flow

## 🎨 Design System

- **Color Scheme**: Orange/Red/Purple on black background
- **Typography**: JetBrains Mono for pixel-perfect text
- **Effects**: Glass morphism with gradient buttons
- **Icons**: Lucide React icon library
- **Responsive**: Mobile-first design approach

## 📱 Mobile Support

- Full authentication system optimized for mobile browsers
- Touch-friendly rating interface
- Responsive navigation and layouts
- Cross-device data synchronization

## 🔧 Development

### Database Operations
```bash
# Push schema changes
npm run db:push

# Generate migrations (if using migrations)
npm run db:generate
```

### Project Structure
```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types and schema
├── attached_assets/ # Static assets
└── README.md
```

## 🏆 Live Competition Success

> "Last night's event was an absolute banger!" - User feedback

The platform successfully handled:
- Real-time app submissions during live 60-minute sprints
- Concurrent voting from multiple spectators
- Live leaderboard updates
- Cross-device authentication and rating sync

## 🤝 Contributing

This platform was built for the VIBER hackathon series. For contributions or questions, please open an issue.

## 📄 License

Built for VIBER hackathon competitions. All rights reserved.

---

**Live Platform**: Successfully hosting vibecoding championships since July 2025 🎉