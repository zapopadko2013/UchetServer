import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import net from "net";

export async function getMcpClient() {
    const socket = net.connect(3031, "127.0.0.1");

    return new Promise((resolve, reject) => {
        socket.on('connect', async () => {
            console.log("📡 Сетевой канал для MCP открыт");

            const transport = {
                onClose: undefined,
                onError: undefined,
                onMessage: undefined,
                send: async (message) => {
                    // Обязательно добавляем \n, чтобы сервер понял конец сообщения
                    socket.write(JSON.stringify(message) + "\n");
                },
                start: async () => {
                    let buffer = "";
                    socket.on("data", (chunk) => {
                        buffer += chunk.toString();
                        const lines = buffer.split("\n");
                        buffer = lines.pop(); 
                        for (const line of lines) {
                            if (line.trim() && transport.onMessage) {
                                try {
                                    transport.onMessage(JSON.parse(line));
                                } catch (e) { console.error("Ошибка парсинга ответа:", e); }
                            }
                        }
                    });
                },
                close: async () => { socket.destroy(); }
            };

            const client = new Client(
                { name: "uchet-host", version: "1.0.0" },
                { capabilities: { tools: {} } }
            );

            try {
                // ВАЖНО: сначала запускаем чтение, потом коннектим клиента
                await transport.start(); 
                await client.connect(transport);
                console.log("✅ MCP Клиент полностью готов (TCP режим)");
                resolve(client);
            } catch (err) {
                console.error("Ошибка при коннекте клиента:", err);
                reject(err);
            }
        });

        socket.on('error', (err) => {
            console.error("❌ Ошибка сокета:", err.message);
            reject(err);
        });
    });
}