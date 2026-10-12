# HawQ

HawQ is a multi-chain crypto analytics dashboard that brings DeFi total value locked (TVL), protocol data, spot prices, perpetual market data, and prediction markets into one interface. It combines live public data feeds with a backend that stores time-series snapshots and a portfolio view for demo and testnet activity.

> Trading features have different execution boundaries: prediction and spot actions are simulated logs; perpetual orders, when enabled, are signed by the user's wallet and sent to Hyperliquid testnet. HawQ does not custody user funds.

## Product areas

- **TVL analytics:** protocol and chain TVL, total TVL history, protocol comparisons, category breakdowns, and top movers. Protocol data comes from DeFiLlama.
- **Spot prices:** BTC, ETH, SOL, and USDT prices and logos from CoinGecko, with Chainlink prices used where available.
- **Perpetuals:** Hyperliquid market data such as mark price, funding rate, open interest, and daily volume. The order flow is client-side and uses Hyperliquid testnet; the backend stores the resulting position record.
- **Prediction markets:** live Polymarket market questions, prices, categories, volume, and available market artwork. Prediction choices are recorded as simulations; HawQ does not submit Polymarket orders.
- **Chain analytics:** network statistics for Solana, Base, Arbitrum, Robinhood Chain, and Zcash. Wallet balance tracking is available for Solana and the EVM chains; Zcash is limited to public network and transparent-address data.
- **Quant research:** compare EMA trend-following and RSI mean-reversion strategies against Hyperliquid history, with a chronological holdout, fees, configurable slippage, historical funding when available, risk statistics, trade analysis, and a drawdown chart. Open/close a local paper position marked against live market prices. The paper ledger stays in the browser; no strategy order is sent to an exchange. This simplified bar model does not model liquidation, queue position, or market impact.
- **Additional dashboards:** stablecoin signals, activity, yields, and some portfolio analytics are currently simulated or estimated in the frontend. They should not be treated as verified live trading data.

See [ARCHITECTURE.md](ARCHITECTURE.md) for the application components, data flow, and service boundaries.

## Repository layout

    apps/web/                 TanStack Start and React dashboard
    services/api/             Fastify HTTP API backed by PostgreSQL
    services/ingestion/       Scheduled data collection and database writes
    packages/types/           Shared TypeScript and Zod data schemas
    packages/db/              SQL migrations and migration runner
    infra/docker-compose.yml  Local TimescaleDB and Redis services

The root Bun workspace includes packages and backend services. The web app is managed from apps/web as its own package.

## Data sources and refresh

| Data | Source | How HawQ uses it |
| --- | --- | --- |
| Protocol and chain TVL | DeFiLlama | Ingested periodically; the web app also requests live protocol data directly and merges stored rows as a fallback. |
| Total TVL history | DeFiLlama | Stored by the ingestion service and served by the API. |
| Spot prices and token logos | CoinGecko | Requested by the web app; a smaller price feed is also ingested for backend snapshots. |
| Perpetual markets | Hyperliquid public info API | Ingested for dashboard data; orders are separately signed client-side on testnet. |
| Prediction markets | Polymarket Gamma API and HawQ's own PostgreSQL market table | Polymarket markets are ingested with their artwork; HawQ markets are admin-created, Nigeria-tagged play-money forecasts with source-backed resolution. Crowd odds are derived from simulated picks. |
| Chain and wallet data | Public Solana/EVM JSON-RPC; Blockchair for Zcash | Network metrics and supported public wallet snapshots are stored and returned by the API. |
| Spot oracle prices | Chainlink Functions integration in the web app | Used where configured and available, with CoinGecko as the displayed fallback. |

Ingestion runs on a schedule. A successful API response means the latest snapshot available in the database, not necessarily a tick-by-tick feed. The frontend also calls some public providers directly, so the available data and fallback behavior vary by page.

## Local development

### Requirements

- Bun
- Docker with Docker Compose
- Node.js-compatible environment for the web tooling

### Start the database

From the repository root:

    cp .env.example .env
    docker compose -f infra/docker-compose.yml up -d
    bun install
    bun run packages/db/migrate.ts

The Compose file starts TimescaleDB/PostgreSQL and Redis. Redis is provisioned for local development but is not currently required by the API or ingestion runtime. The SQL migrations are also mounted into the database container for initialization of a fresh volume; the migration runner is useful when applying them to an existing database.

### Configure the web app

Create apps/web/.env with the backend URL:

    VITE_HAWQ_API_URL=http://localhost:4000

The backend services read DATABASE_URL from the root .env. For a hosted PostgreSQL database, set PGSSL=true when running the migration script if the provider requires SSL.

### Run the services

Run each command from the repository root in its own terminal:

    bun run api:dev
    bun run ingestion:dev

Run the web app in a separate terminal:

    cd apps/web
    bun install
    bun run dev

Open the local URL printed by Vite. The API health check is GET http://localhost:4000/health. The ingestion service starts scheduled jobs immediately and then repeats them on their configured intervals.

## Environment variables

| Variable | Purpose | Default or example |
| --- | --- | --- |
| DATABASE_URL | PostgreSQL connection shared by the API and ingestion service | Local TimescaleDB URL in .env.example |
| PORT | API listen port | 4000 |
| PGSSL | Enable SSL for the database migration runner | Set to true for hosted databases that require SSL |
| HAWQ_MARKETS_ADMIN_KEY | Protect HawQ market create/resolve endpoints | Set a long random secret on the API service; do not expose it as a VITE variable |
| VITE_HAWQ_API_URL | API base URL for the web app | http://localhost:4000 |
| SOLANA_RPC_URL | Solana JSON-RPC endpoint | Public Solana mainnet endpoint |
| BASE_RPC_URL | Base JSON-RPC endpoint | Public Base endpoint |
| ARBITRUM_RPC_URL | Arbitrum JSON-RPC endpoint | Public Arbitrum endpoint |
| ROBINHOOD_RPC_URL | Robinhood Chain JSON-RPC endpoint | Public Robinhood Chain endpoint |

Do not commit real credentials or provider keys. Public RPC defaults are suitable for light development use and may be rate limited.

## Backend API

All API routes other than /health are prefixed with /api.

| Method | Route | Description |
| --- | --- | --- |
| GET | /health | API health and server timestamp |
| GET | /api/protocols | Latest stored TVL snapshot per protocol |
| GET | /api/protocols/:slug/history | TVL history for a protocol |
| GET | /api/protocols/tvl/history | Historical total TVL |
| GET | /api/chains/distribution | Latest chain TVL share |
| GET | /api/chains/network-stats | Latest network statistics per supported chain |
| GET | /api/chains/:chain/network-stats/history | Historical network statistics |
| GET | /api/wallets/:chain/:address | Latest wallet snapshot on a wallet-trackable chain |
| GET | /api/wallets/:chain/:address/history | Historical wallet snapshots |
| GET | /api/perps/markets | Latest Hyperliquid perpetual market snapshot by symbol |
| GET | /api/perps/markets/:symbol/history | Historical perpetual market snapshots |
| GET | /api/quant/candles | Historical Hyperliquid candles for Quant backtests |
| GET | /api/predictions/markets | Latest Polymarket markets and open HawQ markets; supports category and region filters |
| GET | /api/predictions/markets/admin | List HawQ markets for management (requires `x-hawq-admin-key`) |
| POST | /api/predictions/markets | Create a Nigeria play-money market (requires `x-hawq-admin-key`) |
| POST | /api/predictions/markets/bulk | Create up to 20 Nigeria play-money markets atomically (requires `x-hawq-admin-key`) |
| POST | /api/predictions/markets/:id/resolve | Resolve a closed HawQ market as yes/no (requires `x-hawq-admin-key`) |
| PATCH | /api/predictions/markets/:id/image | Set or clear a HawQ market image URL (requires `x-hawq-admin-key`) |
| POST | /api/positions | Validate and store a simulated or testnet position record |
| GET | /api/positions?wallet=:address | List recent position records, optionally filtered by wallet |

The predictions endpoint accepts optional category and region query parameters, for example /api/predictions/markets?category=sports&region=nigeria. `POST /api/predictions/markets` creates a HawQ market and `POST /api/predictions/markets/:id/resolve` resolves one; both require the `x-hawq-admin-key` header matching `HAWQ_MARKETS_ADMIN_KEY`. Set a long random secret in the API service environment before enabling market creation. HawQ markets accept an HTTPS image URL, a close date, and a public resolution source. User picks are simulated only; the displayed crowd probability is based on those simulated positions, with a neutral 50/50 prior until picks arrive. The API currently applies a 120-request-per-minute rate limit and permissive CORS configuration; review both before exposing it to a broader production use case.

## Deployment

The production backend uses separate Railway services for the Fastify API and the scheduled ingestion worker, connected to the existing TimescaleDB/PostgreSQL database. Deploying a source change does not create a new database or infrastructure. The frontend is configured independently with VITE_HAWQ_API_URL pointing at the API service.

Set DATABASE_URL on both backend services. Set PORT for the API if the platform does not inject it. Set VITE_HAWQ_API_URL in the frontend build environment. Apply SQL migrations to the existing database when schema changes require them.

## License

See [LICENSE](LICENSE).
