# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NestJS-based API service for a cryptocurrency/blockchain platform with user authentication, asset management, BTC prediction game, e-commerce, admin panel, DEX integration, and payment processing.

## Development Commands

### Installation
```bash
npm install
# Note: postinstall automatically builds both backend and admin-browser frontend
```

### Running the Application
```bash
npm run start:dev          # Development mode with watch
npm run start:local        # Local with scheduling and debugging
npm run start:debug        # Debug mode with scheduling enabled
npm run start:prod         # Production
```

### Building & Testing
```bash
npm run build              # Build backend and admin-browser
npm run lint               # Lint and auto-fix
npm run format             # Format code
npm test                   # Run all tests
npm run test:watch         # Watch mode
npm run test:cov           # Coverage report
npm run test:e2e           # E2E tests
npm run test:debug         # Debug tests
```

## Architecture Overview

### Module Organization

```
src
├── api-modules                              # HTTP REST endpoints
│   ├── admin                                # Admin panel backend (Google OAuth, JWT)
│   ├── assets                               # Asset management (deposits, withdrawals, balances)
│   │   ├── dex                              # OKX DEX integration
│   │   ├── entities                         # Balance & on-chain entities
│   │   └── services                         # Asset, transaction, deposit/withdraw
│   ├── dex                                  # DEX trading and token management
│   ├── ecommerce                            # Products, draws, orders, showcases
│   ├── jwk                                  # JSON Web Key endpoints
│   ├── pay                                  # Payment processing
│   │   └── onramp                           # Alchemy Pay, OnRamper integrations
│   ├── task                                 # Onboarding task system
│   │   ├── handlers                         # Task completion handlers
│   │   ├── rewards                          # Reward distribution
│   │   └── scopes                           # Task scope definitions
│   └── user                                 # User management
│       └── socialmedia                      # OAuth (Google, Facebook, Discord, etc.)
├── common-modules                           # Shared services
│   ├── auth                                 # JWT & API key strategies
│   ├── casl                                 # Authorization (CASL ability)
│   ├── email                                # Email service
│   ├── id                                   # Snowflake ID generation
│   ├── queue                                # Redis-based queue
│   ├── redis                                # Redis client & session store
│   └── sign                                 # Signing utilities
├── websocket-modules                        # Real-time features
│   └── btc-prediction                       # BTC prediction game (Socket.IO)
├── middleware                               # Global middleware (auth, logging)
├── decorators                               # Custom decorators
└── utils                                    # Utility functions
```

### Authentication Strategies

1. **API Key Auth**: `headerapikey` strategy via `AuthMiddleware` for `/api/v1/inner` routes
2. **JWT Auth**: Standard JWT authentication for user endpoints
3. **Admin Auth**: Separate Google OAuth + JWT with `AdminJwtGuard`

All use Redis-backed sessions via `connect-redis`.

### Database

- **ORM**: TypeORM with PostgreSQL
- **Auto-sync enabled**: `synchronize: true` (be cautious in production)
- **Connection**: Via `DATABASE_URL` environment variable
- **SSL**: Required with `rejectUnauthorized: false`

### Environment Configuration

Environment files priority: Heroku ConfigVars → `.env.${NODE_ENV}` → `.env`

Key variables:
- `NODE_ENV`: development, staging, production, local
- `DATABASE_URL`: PostgreSQL connection string
- `IS_SCHEDULE_PROCESS`: Enable scheduled tasks (`"1"` or `"true"`)
- `IS_GAME_MODULE`: Enable WebSocket game (defaults enabled, set `"false"` to disable)
- `SWAGGER_ENABLE`: Enable Swagger at `/docs` (set to `"1"`)
- `PORT`: Server port (defaults to 3001)

### Admin Frontend Integration

- **Location**: `admin-browser/` directory
- **Stack**: React 19 + Vite + TypeScript + Tailwind + React Query
- **Build**: Auto-built during `npm install` postinstall hook
- **Served at**: `/admin` with SPA fallback routing by NestJS
- **Dev mode**: Run `npm run dev` in `admin-browser/` directory

### Key Services & Patterns

- **AssetService**: Manages user balances (off-chain and on-chain)
- **DepositWithdrawService**: Handles deposit/withdrawal operations with hooks
- **GameService**: BTC prediction game logic and round management
- **OKXQueueService**: Queue-based DEX operations
- **IdService**: Generates Snowflake IDs (initialized in AppModule)
- **BinanceIndexService**: Fetches real-time BTC price data

### WebSocket Game Architecture

The `btc-prediction` module uses:
- **EventsGateway**: Socket.IO gateway for real-time communication
- **GameService**: Game rounds, bets, payouts
- **GameStorageService**: Database persistence
- **BinanceIndexService**: BTC price data for resolution

### Middleware Flow

1. `HttpLoggerMiddleware`: Logs all requests except `/api/v1/tokens`
2. `AuthMiddleware`: API key auth for `/api/v1/inner` routes
3. Global `ValidationPipe`: Class-validator/transformer validation

### Important Notes

- **Decimal.js** used for precise financial calculations
- **Ethers.js & Web3** for blockchain interactions
- **Particle Network SDK** for universal accounts
- **Sentry** via nest-raven for error tracking
- **JWT secrets hardcoded** in modules (consider moving to env vars)
- **ScheduleModule** conditionally loaded based on `IS_SCHEDULE_PROCESS`
- **TypeORM sync enabled** in all environments (use migrations for production)
