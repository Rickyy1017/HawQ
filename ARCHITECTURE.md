# HawQ Architecture

## System overview

HawQ is a Bun monorepo with a TanStack Start web application and two backend services. The ingestion worker reads public market and chain data on a schedule and writes snapshots to PostgreSQL/TimescaleDB. The Fastify API serves the stored data and records demo or testnet position activity. The web application combines the API with selected public data sources and renders the dashboards.

    Public data providers
      DeFiLlama · CoinGecko · Hyperliquid · Polymarket Gamma
      Solana/EVM JSON-RPC · Blockchair · Chainlink Functions
                       │
                       ├─────────────── Web app direct reads
                       │                for selected screens
                       ▼
             Scheduled ingestion worker
             services/ingestion
                       │
                       ▼
          PostgreSQL + TimescaleDB
          protocols, market metadata,
          snapshots, position records
                       │
                       ▼
                Fastify API
                services/api
                       │ JSON over HTTP
                       ▼
         TanStack Start / React web app
                 apps/web

Production runs the API and ingestion worker as separate Railway services against the existing database. The frontend is deployed separately and uses VITE_HAWQ_API_URL to locate the API.

## Repository components

### Web application: apps/web

- TanStack Start, TanStack Router, React, and Vite provide the application shell, file-based routes, and server/client rendering.
- TanStack Query manages request caching, refresh intervals, loading states, and retries.
- apps/web/src/lib/api/hawq.ts validates API responses with Zod and calls the configured backend URL.
- Other modules under apps/web/src/lib/api connect directly to public data providers where the page uses a direct or fallback integration.
- Routes cover overview, protocol and chain analytics, spot prices, perps, prediction markets, stablecoins, yields, RWA, activity, comparison, and portfolio pages.

The web app is not a pure API client. For example, protocol listings are fetched directly from DeFiLlama and merged with backend records; prices use CoinGecko with a Chainlink fallback when available. Some activity, stablecoin, wallet analytics, and yield views are explicitly simulated or estimated. Quant currently provides EMA trend and RSI mean-reversion backtests, risk and trade analytics, historical funding and execution-cost assumptions, and a local browser-only paper-position ledger; it does not automate exchange orders.

### Ingestion worker: services/ingestion

The worker uses adapters to fetch and normalize external data, then writes results through services/ingestion/src/db.ts. The scheduler runs jobs immediately at startup and repeats them at these intervals:

| Job | Interval | Source and stored data |
| --- | --- | --- |
| Protocol TVL | 5 minutes | DeFiLlama protocols, protocol metadata and latest TVL snapshots, plus chain TVL distribution |
| Total TVL history | 15 minutes | DeFiLlama historical chain TVL, retaining the latest year of source data per run |
| Spot prices | 1 minute | CoinGecko prices for BTC, ETH, USDT, SOL, and ZEC |
| Chain network statistics | 2 minutes | Solana, Base, Arbitrum, Robinhood Chain, and Zcash public network metrics |
| Perpetual markets | 30 seconds | Hyperliquid public market contexts |
| Prediction markets | 5 minutes | Polymarket active markets, paginated in batches of up to 100; market art falls back to parent-event art |

Each job writes a row to ingestion_runs with success or failure status. The worker logs job errors and continues running other scheduled work. Data providers are accessed through a shared timeout-enabled fetch helper.

### API: services/api

Fastify registers route modules under /api/protocols, /api/chains, /api/wallets, /api/perps, /api/quant, /api/predictions, and /api/positions. It reads the latest rows from PostgreSQL/TimescaleDB using the shared connection pool, and the Quant candle route proxies bounded historical candle requests to Hyperliquid. It also exposes GET /health. CORS is currently open and the rate limit is 120 requests per minute.

The API is a storage and position-record boundary, not a trading execution service. Position creation validates requests with SimulatedPositionSchema and stores the submitted record. It does not custody keys or broadcast an order.

### Shared packages

- packages/types holds shared TypeScript types and Zod validation schemas used by the API, ingestion, and web app.
- packages/db/migrations defines the PostgreSQL/TimescaleDB schema. packages/db/migrate.ts applies SQL migration files in filename order.

## Data flow

### TVL and protocol analytics

1. The ingestion worker downloads the DeFiLlama protocol list.
2. The normalizer maps provider fields into HawQ protocol records.
3. Protocol metadata is upserted and time-series TVL and chain distribution are stored.
4. The API serves the latest snapshot per protocol and the requested history.
5. The web app merges the backend dataset with a direct DeFiLlama result when that provider is reachable.

Total TVL history is ingested separately from DeFiLlama's historical chain endpoint. Historical routes read from the application database.

### Perpetual market data and orders

1. The worker reads Hyperliquid mainnet market contexts for mark price, funding, open interest, and daily volume.
2. Snapshots are stored and exposed through the perps API routes.
3. The web app reads those market snapshots and may request token logos from CoinGecko.
4. If the user submits an order with a connected wallet, the browser signs and submits it to Hyperliquid testnet. The API records the resulting position; it does not place the order.

Market data and order execution therefore use different environments: public mainnet data, testnet execution.

### Quant backtesting and paper trading

1. The web app requests bounded Hyperliquid candle history through GET /api/quant/candles. The API limits the market symbol, interval, lookback, page size, and total candle count, and requests historical funding rates for the same period.
2. The browser calculates EMA trend-following or RSI mean-reversion signals from completed candles, then simulates fills at the next bar open. It applies configurable fees and slippage and applies historical funding events when the endpoint returns them.
3. The page runs a separate chronological holdout over the latest 30% of the sample, warming indicators with earlier candles without tuning parameters against the holdout. Results include an equity curve, cost-adjusted buy-and-hold comparison, return, CAGR, drawdown, volatility, Sharpe and Sortino ratios, exposure, trade expectancy, win rate, profit factor, fee/funding totals, and the trade ledger.
4. A separate manual paper position uses the latest live mark price and is stored in localStorage on that browser. It is not sent to the API or an exchange.

The strategies are intentionally simple research examples. Historical bars do not contain order-book depth, and the model does not simulate queue position, liquidation, or market impact. If historical funding cannot be loaded, the UI explicitly reports that funding was excluded. Results are for research and demonstration, not a promise of future performance.

### Prediction markets

1. The worker requests active, open Polymarket markets in pages of at most 100 records, up to the configured page cap.
2. It maps market and parent-event image/icon URLs, classifies markets by topic and region, and parses yes/no prices.
3. Market metadata is upserted while price, volume, and liquidity snapshots are appended.
4. HawQ-authored Nigeria markets live in `hawq_prediction_markets`. An admin-key protected API creates and resolves them; each market requires an image, close date, and public resolution source.
5. The API combines Polymarket snapshots with open HawQ markets. HawQ prices are a smoothed 50/50 prior updated from simulated yes/no positions, not exchange prices or real-money odds.
6. The web UI defaults to Nigeria, can switch to all regions, labels the source, and records picks as simulated positions. HawQ markets never send orders or request wallet signatures.

### Chain and wallet data

The worker reads Solana RPC, EVM-compatible RPC endpoints for Base, Arbitrum, and Robinhood Chain, and Blockchair's Zcash endpoint. Chain-level metrics are stored for all five networks. Wallet snapshots are supported for Solana and the EVM networks. Zcash shielded balances and activity are not observable; HawQ only represents public network and transparent-address information.

## Storage model

TimescaleDB runs PostgreSQL with hypertables for time-series data. Core tables include:

- protocols and protocol_tvl_snapshots for protocol metadata and TVL measurements.
- chain_tvl_snapshots and total_tvl_history for chain distribution and total market TVL history.
- price_snapshots for ingested spot prices.
- perps_market_snapshots for Hyperliquid market data.
- prediction_markets and prediction_market_snapshots for Polymarket metadata and market history.
- chain_network_stats and chain_wallet_snapshots for network and supported wallet observations.
- simulated_positions for demo/testnet track records.
- ingestion_runs for scheduler job status and errors.

The schema is defined in packages/db/migrations. TimescaleDB is used for time-indexed snapshots; reference metadata and position records remain ordinary PostgreSQL tables.

## Product and data boundaries

| Area | Current behavior |
| --- | --- |
| TVL and protocol data | Live public DeFiLlama data, with stored historical snapshots and frontend fallbacks |
| Spot prices | Live CoinGecko prices; Chainlink prices used where available |
| Perpetual market data | Live Hyperliquid mainnet market data |
| Perpetual orders | Wallet-signed Hyperliquid testnet orders from the client; fake testnet funds |
| Spot actions | Demo records only; no swap is executed |
| Prediction actions | Demo records only; no Polymarket order is executed |
| Quant | Coming soon; strategy research/backtesting are not implemented |
| Activity and selected signals | Some views are generated or estimated in the frontend; treat as illustrative |
| Custody | HawQ does not store wallet private keys or custody funds |

## Configuration and runtime

- DATABASE_URL configures the API and ingestion database connection.
- PORT configures the Fastify listener; Railway may provide this automatically.
- VITE_HAWQ_API_URL configures the web app's backend API origin at build time.
- SOLANA_RPC_URL, BASE_RPC_URL, ARBITRUM_RPC_URL, and ROBINHOOD_RPC_URL can override public RPC endpoints.
- PGSSL=true enables SSL in the migration runner for hosted PostgreSQL providers that require it.

The local Compose stack starts TimescaleDB/PostgreSQL and Redis. Redis is not currently used by the API or ingestion code. Provider endpoints and default public RPCs can rate-limit or change their response shape; adapter failures are recorded in ingestion_runs and service logs.
