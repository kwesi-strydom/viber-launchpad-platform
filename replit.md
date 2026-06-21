# Viber Apps Platform

## Overview
A full-stack web application designed for hosting and showcasing AI-generated applications from 60-minute "vibecoding" hackathons. The platform features a gaming-inspired UI with retro aesthetics, built with React, Express, and Drizzle ORM, and integrates with a Neon serverless PostgreSQL database. It supports competitor app submissions, spectator rating, user authentication, and a fair leaderboard system using the IMDb weighted rating formula.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture

### UI/UX Decisions
- **Design Theme**: Gaming-inspired UI with retro aesthetics and a neon-glow modern design.
- **Color Scheme**: Orange, red, purple on a black background, with turquoise green accents.
- **Components**: Shadcn/ui components with Radix UI primitives for accessible, unstyled elements.
- **Styling**: Tailwind CSS with custom pixel-art inspired design system.
- **Layout**: Responsive layout with Navbar, Footer, and main content area.
- **Visual Elements**: Partner logos on the home page.

### Technical Implementations
- **Frontend**: React 18 with TypeScript, Vite for bundling, TanStack Query for server state, and React Router for navigation.
- **Backend**: Node.js with Express.js, TypeScript with ES modules, TSX for development, and ESBuild for production builds.
- **Database**: Drizzle ORM with PostgreSQL dialect, connected to Neon serverless PostgreSQL.
- **Schema Management**: Drizzle Kit for database migrations, `shared/schema.ts` for type-safe schema definitions.
- **Monorepo Structure**: Clear separation between client, server, and shared code for type safety.
- **Authentication**: Cookie-based session management, user sign-up/login, and role-based access control (competitors submit, spectators rate).
- **App Rating System**: 5-star rating, stored with user IDs for cross-device sync, calculated using IMDb weighted rating formula (`WR = (v/(v+m)) * R + (m/(v+m)) * C`) for fair leaderboard ranking.
- **Data Flow**:
    - **Competitor**: Create team profile, submit app (title, description, thumbnail, URL), update existing apps instead of creating duplicates.
    - **Spectator**: Create profile, browse apps, rate apps, view personalized dashboard of rated apps.
- **Dashboards**: Personalized dashboards for competitors (submitted apps) and spectators (rated apps).
- **API**: RESTful endpoints prefixed with `/api`.
- **Storage**: Abstracted storage layer using Drizzle ORM.
- **Error Handling**: Centralized error handling.

### Feature Specifications
- **App Gallery**: Interactive cards with search and filtering.
- **Leaderboard**: Sortable table displaying apps ranked by IMDb weighted rating formula, with a configurable minimum votes threshold. Apps with fewer than minimum votes rank below those with sufficient votes.
- **App Submission**: Form-based submission with validation and update functionality.
- **User Management**: Sign-up, login, logout, and profile management for competitors and spectators.
- **Cross-Device Sync**: Ratings linked to authenticated user accounts for seamless syncing.

## External Dependencies

- **Database**:
    - `@neondatabase/serverless`: Neon PostgreSQL driver
    - `drizzle-orm`: Type-safe ORM
    - `drizzle-kit`: Database schema management
- **Frontend/UI**:
    - `@tanstack/react-query`: Server state management
    - `@radix-ui/*`: Unstyled, accessible UI primitives
    - `react-router-dom`: Client-side routing
    - `tailwindcss`: Utility-first CSS framework
    - `class-variance-authority`: Type-safe variant handling
    - `clsx`: Conditional className utility
    - `lucide-react`: Icon library
- **Development Tools**:
    - `typescript`: Static type checking
    - `@replit/vite-plugin-runtime-error-modal`: Enhanced error reporting in Replit
- **Partners**:
    - Nanobag, Nucleus, Devfolio, Fracton, I Bet on You, Arc, Replit (logos displayed on the home page)