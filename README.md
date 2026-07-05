# SA Load-Shedding Real-Time Monitor

A real-time streaming dashboard that tracks South African load-shedding status, built with Apache Kafka, Node.js, WebSockets, and React — fully deployed to the cloud.

**Live Dashboard:** [dashboard-production-3c67.up.railway.app](https://dashboard-production-3c67.up.railway.app)
**Repository:** [github.com/mbalinonhlanhla684/sa-loadshedding-streaming](https://github.com/mbalinonhlanhla684/sa-loadshedding-streaming)
**Author:** Nonhlanhla Mbali Ntuli — [GitHub](https://github.com/mbalinonhlanhla684) · [LinkedIn](https://linkedin.com/in/nonhlanhla-mbali-ntuli-7a91b52b5)

---

## What this project does

This dashboard simulates the kind of real-time monitoring system a utility company, municipality, or civic-tech platform might use to track load-shedding across South Africa. It combines:

- **A real external data source** — the [EskomSePush API](https://eskomsepush.gumroad.com/l/api), which provides live South African load-shedding status.
- **A Kafka-based streaming pipeline** — a producer publishes updates to a Kafka topic, a consumer subscribes and re-broadcasts them over WebSockets, and the React frontend renders changes the instant they happen — no polling.
- **A full dashboard application** with 9 functional views, an interactive live map of South Africa's 9 provinces, and real-time alerts.
- **Full cloud deployment** — every service (Kafka, producer, consumer, backend, dashboard) runs live on Railway, not just locally.

## Features

- **Overview** — national load-shedding stage (real data), live province map, stage history chart, upcoming schedule, recent alerts
- **Live Map** — interactive SVG map of South Africa, click any province for its current stage
- **By Province** — grid view of all 9 provinces with current stage
- **Schedules** — full day's load-shedding schedule
- **Alerts / Notifications** — live feed of stage changes as they stream in
- **Insights** — summary statistics (average stage, highest stage, provinces at Stage 0)
- **History** — chronological log of past stage changes
- **Settings** — account and data source information
- Live clock, notification badge, and profile dropdown
- Toast notifications on every real-time update

## Architecture

```
EskomSePush API (real)
        │
        ▼
  Express backend (server.cjs) ── caches calls (free tier: 50/day)
        │
        ▼
  Kafka Producer (producer.cjs) ── publishes to topic "loadshedding-updates-v2"
        │
        ▼
     Apache Kafka (Dockerized, deployed on Railway)
        │
        ▼
  Kafka Consumer (consumer.cjs) ── subscribes, re-broadcasts via WebSocket
        │
        ▼
  React Dashboard (dashboard/) ── receives live push updates, renders instantly
```

All 6 services (Zookeeper, Kafka, producer, consumer, backend, dashboard) run as independent deployments on Railway, communicating over Railway's private internal network.

## An honest note on real vs. simulated data

EskomSePush's free tier provides **suburb-level** load-shedding data, not full province-level data. Rather than fake a false sense of national granularity, this project is transparent about the split:

- **National stage** (the big number on the Overview page) comes from the **real, live EskomSePush API** (`eskom.status`).
- **Province-level detail** (the map, the "By Province" grid, the alert feed) is **simulated** — random but realistic stage transitions, published through the same real Kafka pipeline a production system would use.

This mirrors a common real-world pattern: build the full streaming architecture against a realistic data shape, then swap in a richer paid data source (which would provide true province or municipality-level granularity) without changing the pipeline itself.

## Tech stack

| Layer | Technology |
|---|---|
| Message broker | Apache Kafka + Zookeeper (Docker, deployed on Railway) |
| Producer/Consumer | Node.js, KafkaJS |
| Real-time transport | WebSocket (`ws`) |
| Backend API | Express, node-fetch |
| Frontend | React (Vite), lucide-react icons |
| External data | EskomSePush API |
| Map data | Real South African province boundaries (simplemaps.com), converted from GeoJSON to SVG |
| Deployment | Railway (6 independent services) |

## Project structure

```
sa-loadshedding-streaming/
├── producer/           # Express backend + Kafka producer
│   ├── server.cjs      # Serves real EskomSePush data to the dashboard
│   └── producer.cjs    # Publishes streaming updates to Kafka
├── consumer/           # Kafka consumer + WebSocket server
│   └── consumer.cjs
├── dashboard/           # React frontend (Vite)
│   └── src/App.jsx
├── data/
│   └── za.json         # Real SA province boundary data (GeoJSON)
├── docker-compose.yml   # Local Kafka + Zookeeper setup
└── convert-map.cjs      # Script that converts GeoJSON to SVG paths
```

## Running it locally

**Prerequisites:** Node.js, Docker Desktop, an EskomSePush API token (free tier at the link above).

```bash
# 1. Start Kafka + Zookeeper
docker compose up -d

# 2. Start the backend (serves real API data, caches calls)
cd producer
npm install
node server.cjs

# 3. Start the Kafka producer (in a new terminal)
cd producer
node producer.cjs

# 4. Start the Kafka consumer (in a new terminal)
cd consumer
npm install
node consumer.cjs

# 5. Start the dashboard (in a new terminal)
cd dashboard
npm install
npm run dev
```

Then open `http://localhost:5173`.

You'll need a `.env` file at the project root:
```
ESKOMSEPUSH_TOKEN=your_token_here
```

## What I'd build next

- Swap the simulated province data for a paid EskomSePush tier with full municipality coverage
- Add a proper time-series database (e.g. TimescaleDB) to persist historical stage changes instead of keeping them in memory
- Add user-selectable areas/suburbs using the `areas_search` endpoint
- Add authentication so Settings/profile become meaningful beyond a static display

## Why I built this

After completing my BSc in Computer Science and Mathematics, I wanted a portfolio project that went beyond CRUD apps — something that demonstrated real streaming architecture, not just API calls. Load-shedding is something every South African deals with, which made it a natural, personally meaningful choice for a data engineering project with real civic relevance.
