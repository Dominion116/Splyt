# API

Backend exposes:

- `POST /api/parse` (x402-gated): parse receipt image with Claude Vision
- `POST /api/session`: create split session
- `GET /api/session/:id`: read split session
- `GET /api/pay/:session/:member` (x402-gated): settle member payment
- `GET /api/status/:session` (SSE): live payment status stream
