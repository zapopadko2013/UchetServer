const path = require("path");
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

(async () => {
  const mcpPath = path.join(__dirname, "mcp", "minimal-server.cjs");

  const transport = new StdioClientTransport({
    command: "node",
    args: [mcpPath],
  });

  // Слушаем stderr сервера
  if (transport.stderr) {
    transport.stderr.on("data", (data) => {
      process.stdout.write("[SERVER STDERR] " + data.toString());
    });
  }

  const client = new Client(
    { name: "test-client", version: "1.0.0" },
    { capabilities: {} }
  );

  await client.connect(transport);
  console.log("✅ MCP Client connected");

  // Ждём немного, чтобы сервер полностью прогрелся
  await new Promise(resolve => setTimeout(resolve, 300));

  // Тестовый вызов
  const result = await client.callTool("ping", {}, { timeout: 10000 });
  console.log("✅ RESULT:", result);
})();
