import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import net from "net";

// 1. Создаем инстанс MCP сервера
const server = new Server({
  name: "uchet-pro-bridge",
  version: "1.0.0",
}, {
  capabilities: { tools: {} }
});

// 2. Регистрируем список доступных инструментов
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "analyze_inventory",
    description: "Анализ остатков на складе и выявление дефицита",
    inputSchema: {
      type: "object",
      properties: {
        threshold: { 
          type: "number", 
          description: "Порог остатка, ниже которого товар считается дефицитным" 
        }
      }
    }
  }]
}));

// 3. Обработчик вызова инструментов
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "analyze_inventory") {
    // Выводим в stderr, чтобы видеть в консоли сервера
    console.error(`[MCP] Исполняю analyze_inventory. Порог: ${args?.threshold || 'не задан'}`);

    // Имитация логики: здесь может быть запрос к вашей БД или API
    const resultText = `Анализ завершен. Порог: ${args?.threshold || 10} ед. 
    Статус: На складе достаточно товаров. 
    Дефицитных позиций не обнаружено.`;

    return {
      content: [{ type: "text", text: resultText }]
    };
  }

  throw new Error(`Инструмент ${name} не найден`);
});

// 4. Настройка TCP сервера для связи
const tcpServer = net.createServer(async (socket) => {
  console.error("[MCP] Новое подключение клиента через TCP");

  // Создаем кастомный транспорт для этого сокета
  const transport = {
    onClose: undefined,
    onError: undefined,
    onMessage: undefined,
    
    // Отправка: добавляем \n для разделения JSON-пакетов
    send: async (message) => {
      socket.write(JSON.stringify(message) + "\n");
    },
    
    // Чтение: собираем буфер и парсим по строкам
    start: async () => {
      let buffer = "";
      socket.on("data", (chunk) => {
        buffer += chunk.toString();
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Оставляем незавершенную строку в буфере
        
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed && transport.onMessage) {
            try {
              transport.onMessage(JSON.parse(trimmed));
            } catch (e) {
              console.error("[MCP Error] Ошибка парсинга входящего JSON:", e.message);
            }
          }
        }
      });

      socket.on("error", (err) => {
        console.error("[MCP Socket Error]:", err.message);
      });

      socket.on("close", () => {
        console.error("[MCP] Клиент отключился");
      });
    },
    
    close: async () => {
      socket.destroy();
    }
  };

  try {
    // КРИТИЧНО: Сначала запускаем прослушивание данных
    await transport.start();
    // Затем подключаем сервер к этому транспорту
    await server.connect(transport);
  } catch (err) {
    console.error("[MCP Conn Error]:", err);
  }
});

// 5. Запуск на порту 3031
const PORT = 3031;
const HOST = "127.0.0.1";

tcpServer.listen(PORT, HOST, () => {
  console.error(`
  ┌──────────────────────────────────────────────────┐
  │  🚀 MCP TCP SERVER RUNNING                       │
  │  📍 Address: ${HOST}:${PORT}                   │
  │  🛠  Tools: analyze_inventory                    │
  └──────────────────────────────────────────────────┘
  `);
});