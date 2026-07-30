import swaggerJSDoc from "swagger-jsdoc";

export const openApiDocument = swaggerJSDoc({
  definition: {
    openapi: "3.0.3",
    info: {
      title: "Splyt API",
      version: "1.0.0",
      description: "AI-powered bill splitting backend for MiniPay on Celo"
    },
    servers: [
      { url: "http://localhost:3001" },
      { url: "https://api.splyt.app" }
    ],
    tags: [
      { name: "parse" },
      { name: "agent" },
      { name: "session" },
      { name: "payment" },
      { name: "status" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer"
        }
      },
      schemas: {
        ErrorResponse: {
          type: "object",
          properties: {
            error: { type: "string" },
            message: { type: "string" },
            statusCode: { type: "number" }
          }
        },
        ParsedReceipt: {
          type: "object",
          properties: {
            items: { type: "array", items: { type: "object", properties: { name: { type: "string" }, amount: { type: "string" } } } },
            subtotal: { type: "string" },
            tax: { type: "string" },
            total: { type: "string" },
            currency: { type: "string", enum: ["USDm"] }
          }
        }
      }
    },
    paths: {
      "/api/parse": {
        post: {
          tags: ["parse"],
          summary: "Parse receipt image (free UI)",
          description:
            "Human MiniPay/browser path — free + rate-limited. Machine clients use /api/v1/agent/parse.",
          operationId: "parseReceipt",
          responses: {
            "200": { description: "Parsed receipt", content: { "application/json": { schema: { $ref: "#/components/schemas/ParsedReceipt" } } } },
            "400": { description: "Invalid request", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "422": { description: "Parse failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
          }
        }
      },
      "/api/v1/agent/health": {
        get: {
          tags: ["agent"],
          summary: "Agent API health + x402 quote",
          operationId: "agentHealth"
        }
      },
      "/api/v1/agent/parse": {
        post: {
          tags: ["agent"],
          summary: "Parse receipt (x402 paid, USDC)",
          description:
            "Machine path. Returns 402 without payment; with X-PAYMENT settles via Celo facilitator then runs the same parseReceipt core as free UI.",
          operationId: "agentParseReceipt",
          responses: {
            "200": { description: "Parsed receipt after payment", content: { "application/json": { schema: { $ref: "#/components/schemas/ParsedReceipt" } } } },
            "402": { description: "Payment required (x402)" },
            "415": { description: "Invalid image format" },
            "422": { description: "Parse failed" },
            "503": { description: "x402 not configured on server" }
          }
        }
      },
      "/api/session": { post: { tags: ["session"], summary: "Create split session", operationId: "createSession" } },
      "/api/session/{sessionId}": { get: { tags: ["session"], summary: "Get session", operationId: "getSession" } },
      "/api/pay/{sessionId}/{memberAddress}": { get: { tags: ["payment"], summary: "Pay member", operationId: "payMember" } },
      "/api/status/{sessionId}": {
        get: {
          tags: ["status"],
          summary: "SSE status stream",
          operationId: "streamStatus",
          responses: {
            "200": {
              description: "SSE stream",
              content: {
                "text/event-stream": {
                  schema: { type: "string" }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ["./src/routes/*.ts"]
});
