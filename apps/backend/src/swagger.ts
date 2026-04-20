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
      { name: "session" },
      { name: "payment" },
      { name: "status" }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer"
        },
        x402Proof: {
          type: "apiKey",
          in: "header",
          name: "x-x402-proof"
        }
      },
      headers: {
        X402Protocol: { schema: { type: "string" }, description: "x402 protocol name" },
        X402Price: { schema: { type: "string" }, description: "Required payment amount" },
        X402PayTo: { schema: { type: "string" }, description: "Pay-to wallet address" }
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
            currency: { type: "string", enum: ["cUSD"] }
          }
        }
      }
    },
    paths: {
      "/api/parse": {
        post: {
          tags: ["parse"],
          summary: "Parse receipt image",
          description: "x402 gated parse endpoint",
          operationId: "parseReceipt",
          responses: {
            "200": { description: "Parsed receipt", content: { "application/json": { schema: { $ref: "#/components/schemas/ParsedReceipt" } } } },
            "400": { description: "Invalid request", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "402": {
              description: "x402 payment required",
              headers: {
                "x402-protocol": { $ref: "#/components/headers/X402Protocol" },
                "x402-price": { $ref: "#/components/headers/X402Price" },
                "x402-pay-to": { $ref: "#/components/headers/X402PayTo" }
              }
            },
            "422": { description: "Parse failed", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } },
            "500": { description: "Server error", content: { "application/json": { schema: { $ref: "#/components/schemas/ErrorResponse" } } } }
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
