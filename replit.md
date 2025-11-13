# Snake.io - Multiplayer Snake Game

## Overview

Snake.io is a real-time multiplayer snake game built with a modern web stack. Players control a snake that grows by eating pellets scattered across a 3D arena. The game features smooth 3D graphics powered by Three.js/React Three Fiber, AI-controlled opponents, and competitive leaderboard mechanics. The core gameplay involves navigating the arena, consuming pellets to grow your snake, and avoiding collisions with other snakes while competing for the highest score.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**React + TypeScript SPA**
- Single-page application built with React and TypeScript for type safety
- Vite as the build tool and development server for fast HMR and optimized production builds
- Client-side routing handled entirely within the React application
- The application root is located at `client/` with entry point at `client/src/main.tsx`

**3D Graphics Engine**
- Uses React Three Fiber (@react-three/fiber) as a React renderer for Three.js
- Three.js provides the underlying WebGL-based 3D rendering capabilities
- @react-three/drei library provides helpful 3D helpers and abstractions
- @react-three/postprocessing adds visual effects and post-processing capabilities
- GLSL shader support enabled through vite-plugin-glsl for custom visual effects
- Canvas-based rendering fills the entire viewport with touch-action controls disabled for mobile

**State Management**
- Zustand for lightweight, hook-based state management
- Multiple domain-specific stores:
  - `useSnakeGame`: Core game state including snakes, pellets, phase management, and player controls
  - `useGame`: Simple game phase state machine (ready/playing/ended)
  - `useAudio`: Audio state and playback controls with mute toggling
- State management uses `subscribeWithSelector` middleware for granular subscriptions
- No global Redux store; each domain manages its own state independently

**UI Component System**
- Radix UI primitives for accessible, unstyled components
- Tailwind CSS for utility-first styling with custom design tokens
- shadcn/ui pattern for composable, customizable UI components
- Custom CSS variables for theming (--background, --foreground, --primary, etc.)
- Responsive design with mobile-first approach

**Game Loop Architecture**
- useFrame hook from React Three Fiber drives the game loop at 60fps
- Game state updates happen in the render loop synchronized with frame rendering
- Input handling through DOM events (mousemove, keydown, keyup) stored in refs
- Camera follows player snake with smooth interpolation
- Collision detection and physics calculated each frame

### Backend Architecture

**Express.js REST API**
- Minimal Express server serving both API routes and static frontend assets
- Development mode uses Vite middleware for HMR
- Production mode serves pre-built static assets from dist/public
- API routes prefixed with `/api` for clear separation from frontend routes
- Request/response logging middleware for debugging

**Storage Layer Abstraction**
- IStorage interface defines CRUD operations for data persistence
- MemStorage implementation provides in-memory storage for development
- Storage interface designed to be swappable (can add PostgreSQL implementation later)
- Current implementation supports user management (getUser, getUserByUsername, createUser)
- Auto-incrementing IDs managed in-memory

**Build and Deployment**
- Separate build processes for client and server
- Client builds to dist/public using Vite
- Server bundles to dist/index.js using esbuild with ESM format
- NODE_ENV=production flag controls environment-specific behavior
- TypeScript compilation checking via `npm run check`

### Data Models

**User Schema** (Drizzle ORM)
- PostgreSQL table definition using Drizzle ORM
- Fields: id (serial primary key), username (unique text), password (text)
- Zod schema validation for input validation
- Type inference from schema for TypeScript safety

**Game Entities**
- Snake: segments array, direction vector, speed, color, length, score, boost state
- Pellet: position vector, color, size, unique ID
- Segment: position vector, radius for collision detection

### External Dependencies

**Database**
- Drizzle ORM (@neondatabase/serverless) configured for PostgreSQL
- Neon serverless driver for database connections
- DATABASE_URL environment variable required
- Schema located at `shared/schema.ts`
- Migrations output to `./migrations` directory
- Currently uses in-memory storage; PostgreSQL integration prepared but not active

**Third-party Services**
- No external API integrations currently configured
- No authentication service (basic user schema exists but not implemented)
- No session management or WebSocket connections for real-time multiplayer

**Asset Management**
- Vite configured to handle 3D model formats (GLTF, GLB)
- Audio file support (MP3, OGG, WAV)
- Font loading via @fontsource/inter
- Static assets served from client/public directory

**Development Tools**
- @replit/vite-plugin-runtime-error-modal for development error overlay
- TypeScript for static type checking
- PostCSS with Tailwind and Autoprefixer for CSS processing
- Path aliases (@/ for client/src, @shared/ for shared code)