# API

Backend exposes:

- `POST /api/parse` (free): parse receipt image with Claude Vision
- `POST /api/session`: create split session
- `GET /api/session/:id`: read split session
- `GET /api/pay/:session/:member` (direct): settle member payment on-chain
- `GET /api/status/:session` (SSE): live payment status stream
