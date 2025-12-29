/* import express from 'express';
import OpenAI from 'openai';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";


const router = express.Router();
const OPENAI_KEY="";

//const openai = new OpenAI({ apiKey: process.env.OPENAI_KEY });
const openai = new OpenAI({ apiKey: OPENAI_KEY });

// 1. Настройка подключения к MCP серверу (теперь просто через node)
const transport = new StdioClientTransport({
  command: "node", 
  args: ["./mcp/pos-mcp-server.js"] // Убедитесь, что путь к JS файлу верный
});

//const mcpClient = new Client({ name: "uchet-host" }, { capabilities: {} });
const mcpClient = new Client(
  { name: "uchet-host", version: "1.0.0" }, // Версия теперь обязательна
  { capabilities: {} }
);

// Инициализируем соединение с MCP сервером
// В реальном приложении лучше обернуть в try/catch при старте сервера
await mcpClient.connect(transport);

router.post("/chat", async (req, res) => {
  const { message } = req.body;

  try {
    // 2. Первый запрос к OpenAI: передаем инструменты
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Ты помощник по учету товаров. Используй инструменты для получения данных." },
        { role: "user", content: message }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "analyze_inventory",
            description: "Анализ остатков на складе",
            parameters: {
              type: "object",
              properties: { threshold: { type: "number" } }
            }
          }
        },
        {
          type: "function",
          function: {
            name: "get_sales_analytics",
            description: "Аналитика продаж",
            parameters: {
              type: "object",
              properties: { period: { type: "string", enum: ["today", "week"] } },
              required: ["period"]
            }
          }
        }
      ]
    });

    const aiMsg = response.choices[0].message;

    // 3. Если ИИ решил вызвать инструмент (Tool Call)
    if (aiMsg.tool_calls) {
      const toolCall = aiMsg.tool_calls[0];
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      // Вызываем инструмент в нашем MCP сервере
      const result = await mcpClient.callTool(functionName, functionArgs);

      // 4. Отправляем результат обратно в OpenAI для формирования текста
      const finalResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "user", content: message },
          aiMsg,
          { 
            role: "tool", 
            tool_call_id: toolCall.id, 
            content: result.content[0].text 
          }
        ]
      });

      return res.json({ answer: finalResponse.choices[0].message.content });
    }

    // Если инструментов не потребовалось
    res.json({ answer: aiMsg.content });

  } catch (err) {
    console.error("Ошибка чата:", err);
    res.status(500).json({ error: "Ошибка при обработке запроса ИИ" });
  }
});

export default router; */


/* const express = require('express');
const router = express.Router();
const { OpenAI } = require('openai');

let mcpClient;

// 1. Инициализация MCP
async function initMCP() {
  try {
    const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
    const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

    const transport = new StdioClientTransport({
      command: "node",
      args: ["./mcp/pos-mcp-server.mjs"] // Проверьте, что файл переименован в .mjs
    }); 
   const transport = new StdioClientTransport({
  command: "node",
  args: [path.join(process.cwd(), "mcp", "pos-mcp-server.mjs")] // Точный путь от корня
}); 
const transport = new StdioClientTransport({
      command: "node",
      args: ["./mcp/pos-mcp-server.mjs"] // Проверьте, что файл переименован в .mjs
    });

    mcpClient = new Client(
      { name: "uchet-host", version: "1.0.0" },
      { capabilities: {} }
    );

    await mcpClient.connect(transport);
    console.log("✅ MCP Client connected");
  } catch (err) {
    console.error("❌ Ошибка подключения MCP:", err.message);
  }
}

initMCP();

// 2. Настройка OpenAI (используем ваш ключ напрямую для теста, если env не работает)
const OPENAI_KEY = process.env.OPENAI_KEY || "ВАШ_КЛЮЧ_ЗДЕСЬ";
const openai = new OpenAI({ apiKey: OPENAI_KEY });

router.post("/chat", async (req, res) => {
  if (!mcpClient) {
    return res.status(503).json({ error: "MCP сервер еще не готов" });
  }
  
  const { message } = req.body;
  const authToken = req.headers['authorization']
  
  try {

    console.log("1. Сообщение от пользователя:", message);
    // ШАГ 1: Запрос к ИИ
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
         { role: "system", content: "Ты помощник по учету товаров." },
         
       { role: "system", content: "Ты профессиональный бухгалтер. Если пользователь спрашивает про остатки или склад — ОБЯЗАТЕЛЬНО вызывай функцию analyze_inventory." },
       { role: "user", content: message }
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "analyze_inventory",
            description: "Анализ остатков на складе",
            parameters: { type: "object", properties: { threshold: { type: "number" } } }
          }
        }
      ]
    });

    const aiMsg = response.choices[0].message;

    console.log("2. Ответ от OpenAI (сырой):", JSON.stringify(aiMsg));

    // ШАГ 2: Проверка вызова инструментов
    if (aiMsg.tool_calls) {
       const toolCall = aiMsg.tool_calls[0];
      
      try {
        const result = await mcpClient.callTool(
          toolCall.function.name, 
          JSON.parse(toolCall.function.arguments)
        ); 
         console.log("3. Ответ ");


        const toolCall = aiMsg.tool_calls[0];
    const functionArgs = JSON.parse(toolCall.function.arguments);
try {
    // Добавляем токен в аргументы, которые уходят в MCP-сервер
    const result = await mcpClient.callTool(toolCall.function.name, {
      ...functionArgs,
      _token: authToken // Передаем токен скрыто от ИИ
    });

        // Безопасное извлечение текста из ответа MCP
        const toolContent = result.content?.[0]?.text || "Нет данных от сервера";

        // ШАГ 3: Финальный ответ ИИ с данными от инструмента
        const finalResponse = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            { role: "user", content: message },
            aiMsg,
            { role: "tool", tool_call_id: toolCall.id, content: toolContent }
          ]
        });

        return res.json({ answer: finalResponse.choices[0].message.content });
      } catch (toolErr) {
        console.error("Ошибка инструмента:", toolErr.message);
        return res.json({ answer: "Не удалось получить данные со склада: " + toolErr.message });
      }
    }

    // Если инструменты не нужны
    res.json({ answer: aiMsg.content });

  } catch (err) {
    console.error("ПОЛНАЯ ОШИБКА В КОНСОЛИ:", err);
    res.status(500).json({ error: "Ошибка ИИ: " + err.message });
  }
});

module.exports = router; */

const express = require('express');
const router = express.Router();
 const { OpenAI } = require('openai');
/*const path = require("path");
const process = require("process");

const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = require("@modelcontextprotocol/sdk/client/stdio.js");

let mcpClient; */

/* async function initMCP() {
    try {
        const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
        const { StdioClientTransport } = await import('@modelcontextprotocol/sdk/client/stdio.js');

        const mcpPath = path.join(process.cwd(), 'mcp', 'pos-mcp-server.mjs');

        const transport = new StdioClientTransport({
            command: "node",
            args: [mcpPath],
            env: { ...process.env, NODE_OPTIONS: "--no-warnings" }
        });

        mcpClient = new Client(
            { name: "uchet-host", version: "1.0.0" },
            { capabilities: { tools: {} } }
        );

        // Увеличиваем таймаут ожидания ответа от инструментов до 30 секунд
        await mcpClient.connect(transport);
        console.log("✅ MCP Client connected to:", mcpPath);

        try {
            const tools = await mcpClient.listTools();
            console.log("✅ MCP Tools loaded:", tools.tools.length);
        } catch (e) {
            console.error("❌ Не удалось загрузить список инструментов:", e.message);
        }

    } catch (err) {
        console.error("❌ Ошибка подключения MCP:", err.message);
    }
} */

////

async function initMCP1() {
  const mcpPath = path.join(process.cwd(), "mcp", "minimal-server.mjs");
const transport = new StdioClientTransport({
  command: "node",
  args: [mcpPath],
});

const client = new Client(
  { name: "test-client", version: "1.0.0" },
  { capabilities: {} }
);

await client.connect(transport);
console.log("✅ MCP connected");

const result = await client.callTool("ping", {}, { timeout: 10000 });
console.log("✅ RESULT:", result);
}


/////

// В chat.route.js
/* async function initMCP() {
    try {
        // Динамический импорт нашего нового менеджера
        const { getMcpClient } = await import('./mcp-manager.mjs');
        mcpClient = await getMcpClient();
    } catch (err) {
        console.error("❌ Не удалось загрузить MCP Manager:", err.message);
    }
}

initMCP(); */

const OPENAI_KEY = process.env.OPENAI_KEY || "ВАШ_КЛЮЧ";
const openai = new OpenAI({ apiKey: OPENAI_KEY });

router.post("/chat", async (req, res) => {
    const { message } = req.body;
    const authToken = req.headers['authorization'];
    
    let problematicItems = [];
    let salesData = []; 
    let dataType = "none";
    let periodNameGlobal ;

    try {
       // console.log("1. Сообщение:", message);

       const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
/*     messages: [
        { 
            role: "system", 
            content: `Ты помощник по учету товаров. 
            Если пользователь спрашивает про продажи (без указания периода), ВСЕГДА вызывый get_sales_analytics с периодом "week". 
            Никогда не переспрашивай период, если не было явного запроса на другой срок.` 
        },
        { role: "user", content: message }
    ], */
    messages: [
        /* { 
            role: "system", 
            content: `Ты помощник по учету товаров. Сегодня: ${new Date().toLocaleDateString('ru-RU')}.
            ИНСТРУКЦИЯ ПО ПЕРИОДАМ:
            - "день", "сегодня" -> period: "today"
            - "неделя" -> period: "week"
            - "месяц" -> period: "month"
            - "полгода", "6 месяцев" -> period: "half_year"
            - "год" -> period: "year"
            Если пользователь не указал период, используй "week".` 
        }, */
        
        /////

        { 
        role: "system", 
        content: `Ты помощник по учету товаров. Сегодня: ${new Date().toLocaleDateString('ru-RU')}.
        
        СТРОГИЕ ПРАВИЛА:
        1. Если пользователь спрашивает про ПРОДАЖИ (день, неделя, сумма, прибыль) — вызывай ТОЛЬКО get_sales_analytics.
        2. Если пользователь спрашивает про ОСТАТКИ (наличие, дефицит, много, склад) — вызывай ТОЛЬКО analyze_inventory.
        3. НЕ вызывай оба инструмента сразу, если об этом не попросили явно (например, "дай продажи и остатки").
        
        ИНСТРУКЦИЯ ПО ПЕРИОДАМ:
        - "день", "сегодня" -> period: "today"
            - "неделя" -> period: "week"
            - "месяц" -> period: "month"
            - "полгода", "6 месяцев" -> period: "half_year"
            - "год" -> period: "year"
            Если пользователь не указал период, используй "week".` 
    },

        //////


        { role: "user", content: message }
    ],
    tools: [
        {
            type: "function",
            function: {
                name: "analyze_inventory",
                description: "Анализ остатков на складе",
                parameters: { type: "object", properties: {} }
            }
        },
        {
            type: "function",
            function: {
                name: "get_sales_analytics",
                description: "Аналитика продаж за указанный период",
                parameters: {
                    type: "object",
                    properties: { 
                        period: { 
                            type: "string", 
                            enum: ["today", "week", "month", "half_year", "year"],
                            description: "Временной интервал для анализа"
                        } 
                    },
                    required: ["period"]
                }
            }
        }
    ]
});

        const aiMsg = response.choices[0].message;

        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
            const toolResponses = [];

            for (const toolCall of aiMsg.tool_calls) {
                const functionName = toolCall.function.name;
                let currentResultText = "Нет данных";

                // --- ЛОГИКА ОСТАТКОВ (ВОССТАНОВЛЕНА) ---
                if (functionName === "analyze_inventory") {
                    const stockRes = await fetch(`${process.env.BACKEND_URL}/api/report/stockbalance/simple`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'Authorization': authToken || '' },
                        body: JSON.stringify({ "barcode": "", "brand": "@", "counterparty": "0", "stockID": "0" })
                    });

                    // ПРОВЕРКА СЕССИИ
                if (!stockRes.ok && stockRes.status === 401) {
                    return res.json({ answer: '❌ Сессия истекла. Перезайдите.' });
                }

                    const data = await stockRes.json();
                    let items = Array.isArray(data) ? data : (data.result || data.data || []);

                    if (items.length > 0) {
                        dataType = "stock";
                        const cleanedData = items.map((item) => {
                            const units = parseFloat(item.units) || 0;
                            let status = "✅ Норма";
                            if (units <= 5) status = "⚠️ Дефицит";
                            if (units >= 15) status = "📦 Много";

                            return {
                                brand: item.brand && item.brand !== "No brand" ? item.brand : "",
                                name: item.productname || "Товар",
                                stock: units,
                                price: item.price || 0,
                                status: status,
                                point: item.pointname,
                                purchaseprice: item.purchaseprice || 0,
                                category: item.category || "",
                            };
                        });

                        const deficitItems = cleanedData.filter(i => i.status === "⚠️ Дефицит").sort((a, b) => a.stock - b.stock).slice(0, 30);
                        const surplusItems = cleanedData.filter(i => i.status === "📦 Много").sort((a, b) => b.stock - a.stock).slice(0, 30);
                        problematicItems = [...deficitItems, ...surplusItems];

                        const formattedText = problematicItems.map(i => 
                            `${i.status}|${i.brand}|${i.name}|${i.stock}|${i.price}|${i.point}`
                        ).join("\n");

                        currentResultText = `Отчет по отклонениям (Топ-30 Дефицит + Топ-30 Много):\n${formattedText}`;
                    }
                   
                }

                // --- ЛОГИКА ПРОДАЖ ---
                if (functionName === "get_sales_analytics") {
                    try {
                       // Функция для корректного форматирования локальной даты в YYYY-MM-DD
       
                       const getLocalDate = (d) => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        const now = new Date();
        let dateFrom, dateTo = getLocalDate(now);

        const args = JSON.parse(toolCall.function.arguments || "{}");
        const period = args.period || "week";

        const dFrom = new Date(now); // Создаем копию текущей даты для манипуляций

        // ВАЖНО: Рассчитываем dateFrom в зависимости от периода
        switch (period) {
            case "today":
                dateFrom = dateTo;
                break;
            case "week":
                dFrom.setDate(now.getDate() - 7);
                dateFrom = getLocalDate(dFrom);
                break;
            case "month":
                dFrom.setMonth(now.getMonth() - 1);
                dateFrom = getLocalDate(dFrom);
                break;
            /* case "half_year":
                dFrom.setMonth(now.getMonth() - 6);
                dateFrom = getLocalDate(dFrom);
                break;
            case "year":
                dFrom.setFullYear(now.getFullYear() - 1);
                dateFrom = getLocalDate(dFrom);
                break; */
            default:
                dFrom.setDate(now.getDate() - 7);
                dateFrom = getLocalDate(dFrom);
        }

        //console.log(`[DEBUG] Период: ${period}. Даты: ${dateFrom} - ${dateTo}`);


        let periodNameRu = "";


switch (period) {
    case "today": 
        periodNameRu = "сегодня"; 
        break;
    case "month": 
        periodNameRu = "месяц"; 
        break;
    case "half_year": 
        periodNameRu = "полгода"; 
        break;
    case "year": 
        periodNameRu = "год"; 
        break;
    case "week":
    default: 
        periodNameRu = "неделю"; 
        break;
}

// Сохраняем это в глобальную переменную (рядом с dateFromGlobal)
 periodNameGlobal = periodNameRu;


// Определяем количество дней в выбранном периоде для расчета скорости
    const periodDays = period === "today" ? 1 : 
                       period === "week" ? 7 : 
                       period === "month" ? 30 : 7;

        
        const salesRes = await fetch(`${process.env.BACKEND_URL}/api/report/grossprofit`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', 'Authorization': authToken || '' },
                            body: JSON.stringify({ "dateFrom": dateFrom, "dateTo": dateTo, "notattr": "0", "point": "0" })
                        });

                        // ПРОВЕРКА СЕССИИ
        if (!salesRes.ok && salesRes.status === 401) {
            return res.json({ answer: '❌ Сессия истекла. Перезайдите.' });
        }

                        const data = await salesRes.json();
                        const items = Array.isArray(data) ? data : (data.result || data.data || []);

                        //console.log(items);
                      //////

                      const salesDataRaw = data;
        const salesItems = Array.isArray(salesDataRaw) ? salesDataRaw : (salesDataRaw.result || []);

        // 2. СРОЧНО ЗАПРАШИВАЕМ АКТУАЛЬНЫЕ ОСТАТКИ (так как в продажах они 0)
        const stockRes = await fetch(`${process.env.BACKEND_URL}/api/report/stockbalance/simple`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authToken || '' },
            body: JSON.stringify({ "barcode": "", "brand": "@", "counterparty": "0", "stockID": "0" })
        });

        const stockDataRaw = await stockRes.json();
        const stockItems = Array.isArray(stockDataRaw) ? stockDataRaw : (stockDataRaw.result || []);

                      ///////



                        if (items.length > 0) {
                            dataType = "sales";
                            const totals = items.reduce((acc, item) => {
                                acc.units += parseFloat(item.units) || 0;
                                acc.sales += parseFloat(item.salesamount) || 0;
                                acc.profit += parseFloat(item.gross_profit) || 0;
                                acc.cost += parseFloat(item.cost) || 0;
                                return acc;
                            }, { units: 0, sales: 0, profit: 0, cost: 0 });

      //console.log(items);                      

      ////////////

           /*  // Расширяем данные товаров прогнозом
    const itemsWithForecast = items.map(i => {
        const soldQty = parseFloat(i.units) || 0;
        const currentStock = parseFloat(i.dateto_units) || 0; // Остаток на конец периода
        const ads = soldQty / periodDays; // Среднедневные продажи (Average Daily Sales)
        
        // Сколько дней осталось до конца стока
        const daysLeft = ads > 0 ? Math.floor(currentStock / ads) : Infinity;
        
        return { ...i, ads, daysLeft, currentStock };
    });

    // Выбираем товары, которые закончатся быстрее всего (но которые продаются)
    const outOfStockSoon = itemsWithForecast
        .filter(i => i.ads > 0 && i.daysLeft <= 7) // Закончатся в течение недели
        .sort((a, b) => a.daysLeft - b.daysLeft)
        .slice(0, 3);

    const forecastText = outOfStockSoon.length > 0
        ? outOfStockSoon.map(i => `- **${i.name}**: осталось на **${i.daysLeft}** дн. (сток: ${i.currentStock}, спрос: ${i.ads.toFixed(1)}/дн)`).join("\n")
        : "Запасов ходовых товаров достаточно более чем на неделю.";                
 */

           // Создаем быструю карту остатков для поиска по коду/имени
            const stockMap = new Map();
            /* stockItems.forEach(s => {
                stockMap.set(s.productname, parseFloat(s.units) || 0);
            }); */

            stockItems.forEach(s => {
    // Используем имя товара как ключ
    stockMap.set(s.productname, {
        units: parseFloat(s.units) || 0,
        point: s.pointname || ""
    });
});

            const periodDays = period === "today" ? 1 : period === "week" ? 7 : period === "month" ? 30 : 7;

            // Расширяем данные продаж данными из карты остатков
            const itemsWithForecast = salesItems.map(i => {
                const soldQty = parseFloat(i.units) || 0;
                // Ищем актуальный остаток в карте остатков по имени товара
                // const realStock = stockMap.get(i.name) || 0; 

                const stockData = stockMap.get(i.name) || { units: 0, point: "Нет данных" };
    
               const realStock = stockData.units;
               const point = stockData.point; 


                const ads = soldQty / periodDays;
                const daysLeft = ads > 0 ? Math.floor(realStock / ads) : Infinity;
                
                return { ...i, ads, daysLeft, realStock, point };
            });

            //console.log(itemsWithForecast);

            // Фильтр для прогноза
            const outOfStockSoon = itemsWithForecast
                .filter(i => i.ads > 0 && i.daysLeft <= 7)
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, 5);

            const forecastText = outOfStockSoon.length > 0
                /* ? outOfStockSoon.map(i => `- **${i.name}** : хватит на **${i.daysLeft}** дн. (остаток: ${i.realStock}, спрос: ${i.ads.toFixed(1)}/дн)`).join("\n")
                 */
                ?outOfStockSoon.map(i => {
        // Берем название точки из данных товара (если поле называется pointname)
        const point = i.pointname || i.point || "";
        
        return `- **${i.name}** (${point}): хватит на **${i.daysLeft}** дн. (остаток: ${i.realStock}, спрос: ${i.ads.toFixed(1)}/дн)`;
    }).join("\n")
                : "Запасов достаточно.";    

          //////////


          //////
          //////

          // 1. Считаем среднюю прибыль на один товар в этом списке
/* const avgProfit = totals.profit / items.length;

// 2. Ищем аномальные всплески (Прибыль выше средней в 5 раз)
const spikes = items
    .filter(i => parseFloat(i.gross_profit) > avgProfit * 5)
    .slice(0, 3);

// 3. Ищем аномальные падения или возвраты (Отрицательная выручка или прибыль)
// В некоторых системах возвраты идут с отрицательным 'units' или 'salesamount'
const anomalies = items.filter(i => 
    parseFloat(i.gross_profit) < 0 || 
    parseFloat(i.units) < 0 || 
    (parseFloat(i.salesamount) < parseFloat(i.cost) && parseFloat(i.salesamount) > 0)
);

// Формируем текст для ИИ
const spikesText = spikes.length > 0 
    ? spikes.map(i => `- **${i.name}**: Всплеск прибыли (${Math.round(i.gross_profit).toLocaleString()})`).join("\n")
    : "Резких всплесков не обнаружено.";

const anomaliesText = anomalies.length > 0
    ? anomalies.map(i => `- **${i.name}**: ${parseFloat(i.gross_profit) < 0 ? 'Продажа в убыток' : 'Странные показатели'} (${Math.round(i.gross_profit).toLocaleString()})`).join("\n")
    : "Критичных отклонений нет."; */

          //////
          //////



                             //  ВЫДЕЛЯЕМ ЛИДЕРОВ (Топ-3)
            const topByQty = [...items]
                .sort((a, b) => parseFloat(b.units) - parseFloat(a.units))
                .slice(0, 3);
            
            const topByProfit = [...items]
                .sort((a, b) => (parseFloat(b.gross_profit) || 0) - (parseFloat(a.gross_profit) || 0))
                .slice(0, 3);

                //  Ищем "Товары-убийцы" (Отрицательная прибыль)
    const moneyLosers = items
        .filter(i => parseFloat(i.gross_profit) < 0)
        .sort((a, b) => a.gross_profit - b.gross_profit)
        .slice(0, 3);

    // Ищем "Золотые товары" (Высокая маржа)
    const starItems = items
        .filter(i => parseFloat(i.salesamount) > 0)
        .map(i => ({
            ...i,
            margin: ((parseFloat(i.gross_profit) / parseFloat(i.salesamount)) * 100)
        }))
        .sort((a, b) => b.margin - a.margin)
        .slice(0, 3);

    // Формируем текст рекомендаций для ИИ
    const alertText = moneyLosers.length > 0 
        ? moneyLosers.map(i => `⚠️ УБЫТОК: ${i.name} (Минус ${Math.abs(Math.round(i.gross_profit)).toLocaleString()})`).join("\n")
        : "Убыточных товаров не обнаружено.";

    const starText = starItems.map(i => `⭐ МАРЖА ${Math.round(i.margin)}%: ${i.name}`).join("\n");

            const qtyLeadersText = topByQty.map(i => `- ${i.name}: ${parseFloat(i.units)} шт.`).join("\n");
            const profitLeadersText = topByProfit.map(i => `- ${i.name}: ${Math.round(i.gross_profit).toLocaleString()}`).join("\n");

                            //salesData = items.slice(0, 50).map(i => ({
                            salesData = items.map(i => ({
                                name: i.name,
                                quantity: parseFloat(i.units),
                                sum: i.salesamount,
                                profit: i.gross_profit,
                                cost: i.cost,
                                date: `${dateFrom} - ${dateTo}`
                            }));

                            currentResultText = `Итоги за ${periodNameGlobal}: 
                            Продано товаров ${totals.units.toFixed(0)}, Себестоимость ${totals.cost.toLocaleString()},  Сумма реализации ${totals.sales.toLocaleString()} , Прибыль ${totals.profit.toLocaleString()}.
                            ЛИДЕРЫ ПО КОЛИЧЕСТВУ:
                            ${qtyLeadersText}
            
                            ЛИДЕРЫ ПО ПРИБЫЛИ:
                            ${profitLeadersText}

                            АНАЛИТИКА ДЛЯ ПРИНЯТИЯ РЕШЕНИЙ:
                            КРИТИЧЕСКИЕ ОШИБКИ (ПРОДАЖА В УБЫТОК):
                            ${alertText}
    
                            САМЫЕ ВЫГОДНЫЕ ПОЗИЦИИ:
                            ${starText}

                            ### ПРОГНОЗ ЗАПАСОВ:
                            КРИТИЧЕСКИЙ ОСТАТОК (МЕНЕЕ 7 ДНЕЙ):
                            ${forecastText}

                            
                            `;

                            /* ### АНОМАЛИИ И ОТКЛОНЕНИЯ:
                            ${spikesText}
                            ${anomaliesText} */
                        }
                         else {
    // Явно пишем, что данных нет, чтобы ИИ не рисовал нули в шаблоне
    currentResultText = `ИНФОРМАЦИЯ: За выбранный период (${periodNameGlobal}) данных по продажам в системе нет.`;
}

                    } catch (e) { currentResultText = "Ошибка в продажах"; }
                }

                toolResponses.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: currentResultText
                });
            }

            console.log (toolResponses);

            // Финальный вызов ИИ
            const finalResponse = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                  ///
                
        /* { 
            role: "system", 
            content: `Ты — финансовый аналитик. 
            
            ПРАВИЛА ОФОРМЛЕНИЯ ПРОДАЖ:
            1. Начни ответ строго со строки: "### Итоги за ${periodNameGlobal} "
            
            2. Далее выведи данные по пунктам:
               - Продано товаров
               - Себестоимость
               - Сумма реализации
               - Прибыль
            
            ВАЖНО: Пиши ТОЛЬКО числа без валюты. Разделяй тысячи пробелами.` 
        }, */
        { 
            role: "system", 
            content: `Ты — аналитик торговой системы. 

            ВАЖНО: Отвечай ТОЛЬКО на основе данных, полученных от инструментов (tool_calls). 
            Если инструмент предоставил данные по продажам — оформляй продажи. 
            Если по остаткам — остатки. 
            Если данных по какой-то категории НЕТ в ответах инструментов — НЕ упоминай её вообще.
            
            ПРАВИЛА ОФОРМЛЕНИЯ ПРОДАЖ:
              Если в данных есть ПРОДАЖИ (Sales):
               - Начни со строки: "### Итоги за ${periodNameGlobal}"
               - Выведи общие показатели КАЖДЫЙ С НОВОЙ СТРОКИ:
                 **Количество проданных товаров:** [число]
                 **Себестоимость:** [число]
                 **Сумма реализации:** [число]
                 **Прибыль:** [число]
               - ОБЯЗАТЕЛЬНО добавь блоки:
                "**🔥 Лидеры по продажам:**"
                "**💰 Самые прибыльные товары:**"
               - Если есть товары с УБЫТКОМ:
                   Напиши заголовок "### 🔴 СРОЧНО ПРОВЕРЬТЕ ЦЕНЫ!"
                   Перечисли эти товары и кратко скажи, что они тянут прибыль вниз.
               - Заголовок "### 🚀 Точки роста (Высокая маржа):"
                   Перечисли товары с самой высокой рентабельностью.
               - ОБЯЗАТЕЛЬНО добавь блок:
                  "### 📉 Прогноз и закупки:"
                  (Перечисли товары, у которых осталось мало дней запаса, и посоветуй сделать заказ).
               - Пиши ТОЛЬКО числа без валюты.

            ПРАВИЛА ОФОРМЛЕНИЯ ОСТАТКОВ:
            - Начни с фразы: "На текущий момент ситуация с остатками выглядит следующим образом:"
            - Создай два раздела: "### Дефицит:" и "### Много:".
            - Для каждого товара из списка пиши:
              1. **Название товара** (с брендом в скобках, если он есть)
              - Количество: [число]
              - Склад: [название склада]
            - В конце добавь вежливое предложение о дальнейших действиях.
            
            ВАЖНО: Если данных по одному из разделов нет, не пиши этот раздел. Будь аккуратным в разметке Markdown.`
           },

          /*  - ОБЯЗАТЕЛЬНО добавь блок "### 🔍 Анализ аномалий":
                  Если в данных от инструмента есть раздел "АНОМАЛИИ И ОТКЛОНЕНИЯ", перескажи его подробно. 
                  Если всплесков или убытков нет, так и напиши: "Аномалий в этом периоде не обнаружено".
             */ 
                  ///
                    { role: "user", content: message },
                    { role: "assistant", tool_calls: aiMsg.tool_calls },
                    ...toolResponses
                ]
            });

            return res.json({ 
                answer: finalResponse.choices[0].message.content,
                dataType: dataType,
                stockData: problematicItems,
                salesData: salesData
            });
        }

        return res.json({ answer: aiMsg.content });

    } catch (err) {
        console.error("🔥 КРИТИЧЕСКАЯ ОШИБКА:", err);
        if (!res.headersSent) res.status(500).json({ error: err.message });
    }
});

module.exports = router;