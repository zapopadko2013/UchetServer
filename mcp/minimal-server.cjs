// minimal-server.cjs
const { Server } = require("@modelcontextprotocol/sdk/server/index.js");
const { StdioServerTransport } = require("@modelcontextprotocol/sdk/server/stdio.js");
const { CallToolRequestSchema, ListToolsRequestSchema } = require("@modelcontextprotocol/sdk/types.js");

const server = new Server(
  { name: "minimal", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    { name: "ping", description: "Простой тест", inputSchema: { type: "object", properties: {} } }
  ]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  console.log("📩 Received request:", request.params.name);
  const { name } = request.params;
  if (name === "ping") return { content: [{ type: "text", text: "pong" }] };
  return { content: [{ type: "text", text: "unknown tool" }] };
});

const transport = new StdioServerTransport();

// Прямо перед connect добавляем задержку, чтобы stdin/stdout прогрелись
setTimeout(() => {
  server.connect(transport);
  console.log("✅ MCP Server started");
}, 50);
