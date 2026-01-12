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
const knex = require("../../db/knex");
const helpers = require("../../middlewares/_helpers");
const router = express.Router();
 const { OpenAI } = require('openai');

const { GoogleGenAI } = require("@google/genai");
const { GoogleGenerativeAI } = require("@google/generative-ai");



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
//const openai = new OpenAI({ apiKey: OPENAI_KEY });

//console.log(OPENAI_KEY);

/* const MODEL = "gemini-1.5-flash";
const API_KEY = OPENAI_KEY;

const openai =  new OpenAI({
  apiKey: OPENAI_KEY,
  baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});

const genAI = new GoogleGenerativeAI(OPENAI_KEY);
 */
/* const openai = new OpenAI({
    apiKey: OPENAI_KEY,
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/"
});
const MODEL_NAME = "gemini-1.5-flash";
 */
/* // --- ВАРИАНТ ДЛЯ GROQ (Рекомендуется для скорости) ---
const openai = new OpenAI({
    apiKey: OPENAI_KEY,
    baseURL: "https://api.groq.com/openai/v1"
});
const MODEL_NAME = "llama-3.3-70b-versatile"; 
*/

const groq = new OpenAI({
    apiKey: OPENAI_KEY, // Получить на console.groq.com
    baseURL: "https://api.groq.com/openai/v1"
});

router.post("/chat", async (req, res) => {

   
    const { message, lang = 'ru' } = req.body;
    const authToken = req.headers['authorization'];
    
    const company = req.userData.company;
    
    let problematicItems = [];
    let salesData = []; 
    let dataType = "none";
    let periodNameGlobal ;

    /////

    // Словарь для системных ответов сервера
    const i18n = {
        ru: {
            stockResults: "Результаты по",
            searchTitle: "📦 Результаты поиска по остаткам",
            notFound: "товаров не найдено",
            inventoryReport: "Отчет по остаткам",
            salesError: "Ошибка при получении данных о продажах.",
            deficit: "Дефицит",
            salesSummary: "Итоги за",
            sold: "Продано",
            cost: "Себестоимость",
            revenue: "Выручка",
            profit: "Прибыль",
            inventoryIntro: "На текущий момент ситуация с остатками выглядит следующим образом:",
            deficitTitle: "⚠️ Дефицит (Топ-30)",
            surplusTitle: "📦 Много (Топ-30)",
            pcs: "шт.",
            searchResults: "Результаты по запросу",
            forPeriod: "За период",
            stockStatus: "Статус остатков",
            addedToTable: "Все найденные позиции ({count}) добавлены в таблицу.",
            forecastEnough: "Запасов достаточно.",
            loss: "УБЫТОК",
            minus: "Минус",
            noLossItems: "Убыточных товаров не обнаружено.",
            urgentPriceCheck: "🔴 СРОЧНО ПРОВЕРЬТЕ ЦЕНЫ!",
            profitLeaders: "💰 Лидеры по прибыли:",
            qtyLeaders: "🔥 Лидеры по количеству:",
            starItems: "⭐ Самые выгодные позиции:",
            margin: "МАРЖА",
            noDataFound: "ИНФОРМАЦИЯ: За период ({period}) данных по запросу \"{query}\" не найдено.",
            generalReport: "общий отчет",
            forecastLeft: "хватит на",
            daysShort: "дн.",
            stockShort: "остаток",
            nothingFound: "По запросу \"{query}\" ничего не найдено на складах.",
            sessionExpired: "❌ Сессия истекла. Перезайдите.",
            noData: "данных не найдено",
            periods: { today: "сегодня", week: "неделю", month: "месяц", half_year: "полгода", year: "год" },
            status: { norm: "✅ Норма", low: "⚠️ Дефицит", high: "📦 Много" }
        },
        kk: {
            stockResults: "Нәтижелер",
            searchTitle: "📦 Қалдықтар бойынша іздеу нәтижелері",
            notFound: "тауар табылмады",
            noDataFound: "АҚПАРАТ: Көрсетілген кезеңде ({period}) \"{query}\" сұранысы бойынша мәлімет табылмады.",
            generalReport: "жалпы есеп",
            inventoryReport: "Қалдықтар есебі",
            deficit: "Талшылық",
            salesSummary: "Қорытынды",
            sold: "Сатылды",
            cost: "Өзіндік құны",
            salesError: "Сатылым мәліметтерін алу кезінде қате кетті.",
            revenue: "Түсім",
            profit: "Пайда",
            forecastEnough: "Қор жеткілікті.",
            forecastLeft: "жеткілікті",
            daysShort: "күнге",
            stockShort: "қалдық",
            searchResults: "Сұраныс бойынша нәтижелер",
            forPeriod: "Кезең",
            loss: "ШЫҒЫН",
            minus: "Минус",
            noLossItems: "Шығын әкелген тауарлар табылмады.",
            urgentPriceCheck: "🔴 БАҒАЛАРДЫ ТЕЗ АРАДА ТЕКСЕРІҢІЗ!",
            profitLeaders: "💰 Пайда бойынша көшбасшылар:",
            qtyLeaders: "🔥 Саны бойынша көшбасшылар:",
            starItems: "⭐ Ең тиімді позициялар:",
            margin: "МАРЖА",
            stockStatus: "Қалдықтар мәртебесі",
            addedToTable: "Барлық табылған позициялар ({count}) кестеге қосылды.",
            inventoryIntro: "Қазіргі уақытта қалдықтар бойынша жағдай келесідей:",
            deficitTitle: "⚠️ Талшылық (Топ-30)",
            surplusTitle: "📦 Артық (Топ-30)",
            pcs: "дана",
            sessionExpired: "❌ Сессия аяқталды. Қайта кіріңіз.",
            nothingFound: "\"{query}\" сұранысы бойынша қоймалардан ештеңе табылмады.",
            noData: "мәлімет табылмады",
            periods: { today: "бүгін", week: "апта", month: "ай", half_year: "жарты жыл", year: "жыл" },
            status: { norm: "✅ Қалыпты", low: "⚠️ Талшылық", high: "📦 Артық" }
        },
        en: {
            stockResults: "Results for",
            searchTitle: "📦 Stock search results",
            notFound: "no items found",
            inventoryReport: "Inventory Report",
            deficit: "Deficit",
            salesSummary: "Summary for",
            forecastEnough: "Stock is sufficient.",
            noDataFound: "INFORMATION: No data found for the period ({period}) for the request \"{query}\".",
            generalReport: "general report",
            forecastLeft: "enough for",
            daysShort: "days",
            stockShort: "stock",
            sold: "Sold",
            cost: "Cost Price",
            revenue: "Revenue",
            profit: "Profit",
            searchResults: "Search results for",
            salesError: "Error retrieving sales data.",
            forPeriod: "For the period",
            stockStatus: "Stock status",
            addedToTable: "All found items ({count}) have been added to the table.",
            inventoryIntro: "At the moment, the stock situation is as follows:",
            deficitTitle: "⚠️ Deficit (Top-30)",
            surplusTitle: "📦 Surplus (Top-30)",
            loss: "LOSS",
            minus: "Minus",
            noLossItems: "No loss-making items detected.",
            urgentPriceCheck: "🔴 URGENTLY CHECK PRICES!",
            profitLeaders: "💰 Profit Leaders:",
            qtyLeaders: "🔥 Quantity Leaders:",
            starItems: "⭐ Most Profitable Positions:",
            margin: "MARGIN",
            pcs: "pcs",
            sessionExpired: "❌ Session expired. Please log in again.",
            nothingFound: "Nothing found in warehouses for the request \"{query}\".",
            noData: "no data found",
            periods: { today: "today", week: "week", month: "month", half_year: "half year", year: "year" },
            status: { norm: "✅ Normal", low: "⚠️ Low Stock", high: "📦 Surplus" }
        }
    };

    const t = i18n[lang] || i18n.ru;

    //////


    try {
       // console.log("1. Сообщение:", message);

      

   /*  const response1 = await openai.chat.completions.create({
  model: "gemini-1.5-flash", 
  messages: [{ role: "user", content: "Привет!" }],
  // tools также поддерживаются здесь
});

//console.log(data1);
//const data1 = await response1.json();
console.log(response1); */

       //const response = await openai.chat.completions.create({
    //model: "gpt-4o-mini",
    /* const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
  
    messages: [
        

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
}); */

/* const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            messages: [
                { 
                    role: "system", 
                    content: `Ты помощник по учету товаров. Сегодня: ${new Date().toLocaleDateString('ru-RU')}.
ПРАВИЛА:
1. Если спрашивают про ПРОДАЖИ (день, неделя, сумма, прибыль) — вызывай get_sales_analytics.
2. Если спрашивают про ОСТАТКИ (наличие, дефицит, склад) — вызывай analyze_inventory.
3. В параметре "query" передавай название товара ТОЛЬКО если пользователь явно его назвал. Если вопрос общий (например, "какие продажи?") — НЕ заполняй query.

ИНСТРУКЦИЯ ПО ПЕРИОДАМ:
        - "день", "сегодня" -> period: "today"
            - "неделя" -> period: "week"
            - "месяц" -> period: "month"
            - "полгода", "6 месяцев" -> period: "half_year"
            - "год" -> period: "year"
            Если пользователь не указал период, используй "week".

`



},
                { role: "user", content: message }
            ],
            tools: [
    {
        type: "function",
        function: {
            name: "analyze_inventory",
            description: "Анализ остатков на складе. Если пользователь спрашивает про конкретный товар, укажи его в query. Если про все остатки сразу — оставь query пустым или не передавай.",
            parameters: {
                type: "object",
                properties: {
                    query: { 
                        type: "string", 
                        description: "Название товара (необязательно)" 
                    }
                }
                // ВАЖНО: НЕ добавляйте здесь required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_sales_analytics",
            description: "Аналитика продаж. Обязательно укажи период.",
            parameters: {
                type: "object",
                properties: { 
                    period: { 
                        type: "string", 
                        enum: ["today", "week", "month"],
                        description: "Временной интервал"
                    },
                    query: { 
                        type: "string", 
                        description: "Название товара для фильтрации (необязательно)" 
                    }
                },
                required: ["period"] // Только период обязателен
            }
        }
    }
]
        });

        const aiMsg = response.choices[0].message;
 */


const response = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
            // Снижаем температуру для стабильности вызова функций
            temperature: 0.1, 
            messages: [
                { 
                    role: "system", 
                    content: `Ты помощник по учету товаров. Сегодня: ${new Date().toLocaleDateString('ru-RU')}.
Твоя задача: анализировать продажи и остатки.
- Если вопрос о продажах, выручке или прибыли -> вызывай get_sales_analytics.
- Если вопрос об остатках, наличии или дефиците -> вызывай analyze_inventory.
- Не выдумывай данные, если функция ничего не вернула.
- По умолчанию, если период не указан, используй 'week'.
- Если пользователь хочет заказать, купить или оформить поступление товара -> вызывай create_purchase_order.
- Обязательно уточняй название поставщика, точку и список товаров с ценами, если они не указаны.
`
                },
                { role: "user", content: message }
            ],
            tools: [
                
                //////09.01.2026

                {
    type: "function",
    function: {
        name: "create_purchase_order",
        description: "Создание заказа на закупку товаров у поставщика.",
        parameters: {
            type: "object",
            properties: {
                counterparty: { type: "string", description: "Точное название поставщика" },
                point: { type: "string", description: "Точное название точки (склада/магазина)" },
                items: {
                    type: "array",
                    description: "Список товаров в заказе",
                    items: {
                        type: "object",
                        properties: {
                            name: { type: "string", description: "Название товара" },
                            quantity: { type: "number", description: "Количество" },
                            price: { type: "number", description: "Цена закупки (себестоимость)" },
                            price1: { type: "number", description: "Цена продажи (розничная)" }
                        },
                        required: ["name", "quantity", "price"]
                    }
                }
            },
            required: ["counterparty", "point", "items"]
        }
    }
},    

                //////09.01.2026

                {
                    type: "function",
                    function: {
                        name: "analyze_inventory",
                        description: "Анализ остатков на складе.",
                        parameters: {
                            type: "object",
                            properties: {
                                query: { 
                                    type: "string", 
                                    description: "Название товара (необязательно)" 
                                }
                            }
                        }
                    }
                },
                {
                    type: "function",
                    function: {
                        name: "get_sales_analytics",
                        description: "Аналитика продаж за указанный период.",
                        parameters: {
                            type: "object",
                            properties: { 
                                period: { 
                                    type: "string", 
                                    // Добавлены все возможные варианты из промпта
                                    enum: ["today", "week", "month", "half_year", "year"],
                                    description: "Временной интервал"
                                },
                                query: { 
                                    type: "string", 
                                    description: "Название товара (необязательно)" 
                                }
                            },
                            required: ["period"]
                        }
                    }
                }
            ],
            // Явно указываем автоматический выбор инструментов
            tool_choice: "auto" 
        });

        const aiMsg = response.choices[0].message;

        // Если ИИ просто ответил текстом без вызова функций
        if (!aiMsg.tool_calls || aiMsg.tool_calls.length === 0) {
            return res.json({ 
                answer: aiMsg.content,
                dataType: "none" 
            });
        }

        if (aiMsg.tool_calls && aiMsg.tool_calls.length > 0) {
            const toolResponses = [];

            let finalAnswer = "";

            

            for (const toolCall of aiMsg.tool_calls) {
                const functionName = toolCall.function.name;
                let currentResultText = "Нет данных";

               let args = {};
    try {
        args = JSON.parse(toolCall.function.arguments || "{}");
    } catch (e) {
        console.error("Ошибка парсинга аргументов ИИ:", e);
        args = {}; 
    }
    
    const searchQuery = args.query && args.query.trim() !== "" ? args.query.toLowerCase() : null;
                

                // --- ЛОГИКА ОСТАТКОВ (ВОССТАНОВЛЕНА) ---
                /* if (functionName === "analyze_inventory") {
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

                        //////
                        if (searchQuery) {
                            const found = items.filter(i => (i.productname || "").toLowerCase().includes(searchQuery));
                            if (found.length > 0) {
                                finalAnswer = `📦 **Результаты поиска по остаткам ("${args.query}"):**\n\n` +
                                    found.slice(0, 20).map(i => `- **${i.productname}**: ${parseFloat(i.units)} шт. (${i.pointname})`).join("\n");
                            } else {
                                finalAnswer = `На складах сейчас нет товара, похожего на "${args.query}".`;
                            }
                        } else {
                        //////

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
                        finalAnswer =  `На текущий момент ситуация с остатками выглядит следующим образом:\n\n` +
                    `### ⚠️ Дефицит (Топ-30):\n` +
                    problematicItems.filter(i => i.status === "⚠️ Дефицит")
                        .map(i => `- **${i.name} (${i.brand ? i.brand + ' ' : ''})**: ${i.stock} шт. (${i.point})`).join("\n") +
                    `\n\n### 📦 Много (Топ-30):\n` +
                    problematicItems.filter(i => i.status === "📦 Много")
                        .map(i => `- **${i.name} (${i.brand ? i.brand + ' ' : ''})**: ${i.stock} шт. (${i.point})`).join("\n");;
                    }

                  /////
                  }
                  //////

                   
                }
 */

                 if (functionName === "analyze_inventory") {
    const stockRes = await fetch(`${process.env.BACKEND_URL}/api/report/stockbalance/simple`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': authToken || '' },
        body: JSON.stringify({ "barcode": "", "brand": "@", "counterparty": "0", "stockID": "0" })
    });

    if (!stockRes.ok && stockRes.status === 401) {
       // return res.json({ answer: '❌ Сессия истекла. Перезайдите.' });
       return res.json({ answer: t.sessionExpired });
    }

    const data = await stockRes.json();
    let items = Array.isArray(data) ? data : (data.result || data.data || []);

    if (items.length > 0) {
        dataType = "stock";

        // 1. Сначала приводим ВСЕ данные к удобному формату и ставим статусы
        const cleanedData = items.map((item) => {
            const units = parseFloat(item.units) || 0;
            /* let status = "✅ Норма";
            if (units <= 5) status = "⚠️ Дефицит";
            if (units >= 15) status = "📦 Много"; */
            let st = t.status.norm;
                        if (units <= 5) st = t.status.low;
                        if (units >= 15) st = t.status.high;
            return { 
              name: item.productname,
              stock: units,
              status: st,
              point: item.pointname,
              brand: item.brand, 
              price: item.price || 0,
              purchaseprice: item.purchaseprice || 0,
              category: item.category || "",
              };

            /* return {
                brand: item.brand && item.brand !== "No brand" ? item.brand : "",
                name: item.productname || "Товар",
                stock: units,
                price: item.price || 0,
                status: status,
                point: item.pointname || "Склад не указан",
                purchaseprice: item.purchaseprice || 0,
                category: item.category || "",
            }; */
        });

        // 2. Проверяем, есть ли поисковый запрос
        if (searchQuery) {
            // Фильтруем подготовленные данные по названию или бренду
            const found = cleanedData.filter(i => 
                i.name.toLowerCase().includes(searchQuery) || 
                i.brand.toLowerCase().includes(searchQuery)
            );

            if (found.length > 0) {
                // Заполняем problematicItems найденными товарами, чтобы они ушли в таблицу
                problematicItems = found;

                //finalAnswer = `📦 **Результаты поиска по остаткам ("${args.query}"):**\n\n` +
                finalAnswer = `### ${t.searchTitle} ("${args.query}"):\n\n` +
                 found.slice(0, 30).map(i => {
                        return `- **${i.name}**: ${i.stock} — **${i.status}** (${i.point})`;
                    }).join("\n");
                
                //if (found.length > 30) finalAnswer += `\n\n*И еще ${found.length - 30} позиций в таблице ниже...*`;
            } else {
                //finalAnswer = `По запросу "${args.query}" ничего не найдено на складах.`;
                finalAnswer = t.nothingFound.replace("{query}", args.query);
            }
        } else {
            // 3. Если поиска нет — стандартный отчет по отклонениям (Топ-30)
            //const deficitItems = cleanedData.filter(i => i.status === "⚠️ Дефицит").sort((a, b) => a.stock - b.stock).slice(0, 30);
            //const surplusItems = cleanedData.filter(i => i.status === "📦 Много").sort((a, b) => b.stock - a.stock).slice(0, 30);
           
            const deficitItems = cleanedData.filter(i => i.status === t.status.low).sort((a, b) => a.stock - b.stock).slice(0, 30);
            const surplusItems = cleanedData.filter(i => i.status === t.status.high).sort((a, b) => b.stock - a.stock).slice(0, 30);
           
            
            problematicItems = [...deficitItems, ...surplusItems];

            /* finalAnswer = `На текущий момент ситуация с остатками выглядит следующим образом:\n\n` +
                `### ⚠️ Дефицит (Топ-30):\n` +
                deficitItems.map(i => `- **${i.name}**: ${i.stock}  (${i.point})`).join("\n") +
                `\n\n### 📦 Много (Топ-30):\n` + */
                finalAnswer = `### ${t.inventoryIntro}\n\n` +
                `### ${t.deficitTitle}:\n` +
                deficitItems.map(i => `- **${i.name}**: ${i.stock}  (${i.point})`).join("\n") +
                `\n\n### ${t.surplusTitle}:\n` +
                surplusItems.map(i => `- **${i.name}**: ${i.stock}  (${i.point})`).join("\n");
        }
    }
}

                // --- ЛОГИКА ПРОДАЖ ---
               /*  if (functionName === "get_sales_analytics") {
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

           

           // Создаем быструю карту остатков для поиска по коду/имени
            const stockMap = new Map();
            

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
 const avgProfit = totals.profit / items.length;

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
    : "Критичных отклонений нет."; 

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

                            
                            /////

                            finalAnswer = `### Итоги за ${periodNameGlobal}\n` +
                    `**Количество проданных товаров:** ${totals.units.toFixed(0)}\n` +
                    `**Себестоимость:** ${Math.round(totals.cost).toLocaleString()}\n` +
                    `**Сумма реализации:** ${Math.round(totals.sales).toLocaleString()}\n` +
                    `**Прибыль:** ${Math.round(totals.profit).toLocaleString()}\n\n` +
                    `**🔥 Лидеры по продажам:**\n${qtyLeadersText}\n\n` +
                    `**💰 Самые прибыльные товары:**\n${profitLeadersText}\n\n`;

                if (moneyLosers.length > 0) {
                    finalAnswer += `### 🔴 СРОЧНО ПРОВЕРЬТЕ ЦЕНЫ!\n${alertText}\n\n`;
                }

                finalAnswer += `### 🚀 Точки роста (Высокая маржа):\n${starText}\n\n` +
                    `### 📉 Прогноз и закупки:\n${forecastText}`;

               
                
                 finalAnswer += `\n\n### 🔍 АНОМАЛИИ И ОТКЛОНЕНИЯ:\n` +
               `**Всплески:**\n${spikesText}\n\n` +
               `**Странные показатели:**\n${anomaliesText}`;    
                            //////

                            
                        }
                         else {
    // Явно пишем, что данных нет, чтобы ИИ не рисовал нули в шаблоне
    currentResultText = `ИНФОРМАЦИЯ: За выбранный период (${periodNameGlobal}) данных по продажам в системе нет.`;
    finalAnswer=`ИНФОРМАЦИЯ: За выбранный период (${periodNameGlobal}) данных по продажам в системе нет.`;
}

                    } catch (e) { currentResultText = "Ошибка в продажах"; }
                } */

              ///////

            ///////09.01.2026

            if (functionName === "create_purchase_order") {

    try {
        const args = JSON.parse(toolCall.function.arguments || "{}");


        //////

         // Берем из токена авторизации

        // 1. Ищем ID поставщика по названию (используя вашу логику ILIKE)
        const counterparty = await knex('counterparties')
            .where({ 'company': company, 'deleted': 'f' })
            .whereRaw('lower(name) = lower(?)', [args.counterparty.trim()]) // Ищем точное совпадение
            //.orWhereRaw('lower(name) ilike (?)', ['%' + args.counterparty.trim() + '%']) // Или похожее
            .select('id', 'name')
            .first();

        if (!counterparty) {
            finalAnswer = `❌ Поставщик "${args.counterparty}" не найден в базе данных. Пожалуйста, уточните название.`;
            return res.json({ answer: finalAnswer });
        }

        // 2. Ищем ID точки (склада) аналогичным образом

        let p1 = helpers.encrypt(args.point.trim());
        /*
        const point = await knex('points')
            .where({ 'company': company, 'points.status': 'ACTIVE' })
            //.whereRaw('lower(name) = lower(?)', [args.point.trim()])
            .whereRaw('lower(name) = lower(?)', [p1])
            //.whereRaw('lower(name) ilike (?)', ['%' + args.point.trim() + '%'])
            .select('id', 'name')
            .first();
            */

       
       const point = await knex('points')
  .innerJoin('pointset', 'points.id', 'pointset.point')
  .where({
    'points.company': company,
    'points.status': 'ACTIVE'
  })
  .whereRaw('LOWER(points.name) = LOWER(?)', [p1.trim()]) // Безопасная передача параметра
  .select('points.id', 'pointset.stock as stockid', 'points.name')
  .first();

        if (!point) {
            finalAnswer = `❌ Точка/Склад "${args.point}" не найдена.`;
            return res.json({ answer: finalAnswer });
        }


  /////
  
  // Проходимся по списку товаров, присланных ИИ, и ищем их ID в базе
const validatedItems = [];

for (const item of args.items) {
  // Выполняем поиск продукта
  const productResult = await knex.raw(`
    SELECT pr.id, pr.name, pr.code
    FROM products pr
    WHERE pr.name = ? 
      AND pr.company = ?
      AND NOT pr.deleted
      AND pr.category <> -1
    ORDER BY pr.name
    LIMIT 1
  `, [`${item.name}`, company]);

  const product = productResult.rows[0];

  if (!product) {
    // Если один из товаров не найден, прерываем и просим уточнить
    return res.json({ 
      answer: `❌ Товар "${item.name}" не найден в справочнике. Пожалуйста, проверьте название.` 
    });
  }

  // Если нашли, добавляем в список валидных товаров с его реальным ID
  validatedItems.push({
    product: product.id,      // ID из базы
    name: product.name,       // Точное имя из базы
    units: item.quantity,
    price: item.price,        // Цена закупки
    price1: item.price1 || 0  // Цена продажи
  });
}

// Теперь в 'body' для запроса на создание заказа передаем validatedItems
//body.items = validatedItems;
  
  /////


        const workorder = await knex('workorder')
            .whereRaw("workorder_number ~ '^[0-9]+$'") // Берем только строки, состоящие целиком из цифр
            .select(knex.raw("MAX(workorder_number::INTEGER)+1 as max_val"))
            .first();

        const nextNumber = (workorder?.max_val || 0) + 1;

        const body = {
        workorder_number: nextNumber,
        point: point.stockid,
        counterparty: counterparty.id,
         
      };

      //console.log(body);
      const response = await fetch(`${process.env.BACKEND_URL}/api/workorder/manage`, {
      method: 'POST',
     headers: { 'Content-Type': 'application/json', 'Authorization': authToken || '' },
            
      body: JSON.stringify(body),
    });

    //console.log(response);
    // 1. Сначала парсим JSON
const responseData = await response.json();

// 2. Обрабатываем бизнес-логику (структура может быть массивом или объектом)
// Если сервер возвращает массив: [ { workorder_management: {...} } ]
// Если объект: { workorder_management: {...} }
const result = Array.isArray(responseData) ? responseData[0] : responseData;
   if (result?.workorder_management?.code === 'exception') {
    // Формируем понятный ответ для пользователя чата
    finalAnswer = `⚠️ **Внимание:** ${result.workorder_management.text}`;
    
    return res.json({ 
        answer: finalAnswer,
        dataType: "none" 
    });
}

const workorderId = responseData[0]?.workorder_management?.workorder_id;

        //////


    //////
for (const item of validatedItems) {
  const body1 = {
    point: point.stockid,
    counterparty: counterparty.id,
    attributes: 0,
    wholesaleprice: 0,
    workorder_id: workorderId,
    units: item.units,
    product: item.product,
    price: item.price,
    price1: item.price1
  };

  try {
    const responsedetails = await fetch(`${process.env.BACKEND_URL}/api/workorder/details/insert`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': authToken || '' 
      },
      body: JSON.stringify(body1),
    });

    if (!responsedetails.ok) {
        throw new Error(`Server returned status ${responsedetails.status}`);
    }

    const responseData1 = await responsedetails.json();
    const result1 = Array.isArray(responseData1) ? responseData1[0] : responseData1;

    // Проверяем только на негативный сценарий
    const isNotSuccess = result1?.code !== 'success' && result1?.workorder_management?.code !== 'success';

    if (isNotSuccess) {
      const errorText = result1?.text || result1?.workorder_management?.text || JSON.stringify(result1);
      
      // Возвращаем ответ и ВЫХОДИМ из функции, чтобы не продолжать цикл по остальным товарам
      return res.json({ answer: `❌ Ошибка при добавлении товара "${item.name}": ${errorText}` });
    }
    
    // Если всё хорошо, цикл просто идет дальше к следующему товару (item)

  } catch (err) {
    console.error("Fetch error:", err);
    return res.json({ answer: `❌ Техническая ошибка связи с сервером при добавлении товара "${item.name}".` });
  }
}
    ///////

        
        // Формируем тело запроса для вашего API закупки
        // ВАЖНО: На бэкенде вам может понадобиться сопоставить названия (string) с ID
        const orderBody = {
            counterparty_name: args.counterparty,
            point_name: args.point,
            items: args.items.map(item => ({
                product_name: item.name,
                units: item.quantity,
                price: item.price,          // Закупка
                price1: item.price1 || 0    // Продажа
            }))
        };

        finalAnswer = `✅ **Заказ успешно сформирован!**\n\n` +
                          `**Поставщик:** ${args.counterparty}\n` +
                          `**Точка:** ${args.point}\n` +
                          `**Товары:**\n` + 
                          args.items.map(i => `- ${i.name}: ${i.quantity} шт. Закупка по: ${i.price}, Продажа по: ${i.price1}`).join("\n");
        

        /* const orderRes = await fetch(`${process.env.BACKEND_URL}/api/workorder/create-via-chat`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json', 
                'Authorization': authToken || '' 
            },
            body: JSON.stringify(orderBody)
        });

        const resData = await orderRes.json();

        if (orderRes.ok) {
            dataType = "order_created";
            finalAnswer = `✅ **Заказ успешно сформирован!**\n\n` +
                          `**Поставщик:** ${args.counterparty}\n` +
                          `**Точка:** ${args.point}\n` +
                          `**Товары:**\n` + 
                          args.items.map(i => `- ${i.name}: ${i.quantity} шт. по ${i.price}`).join("\n");
        } else {
            finalAnswer = `❌ Ошибка при создании заказа: ${resData.text || "Неизвестная ошибка"}`;
        } */
    } catch (e) {
        console.error("Ошибка создания заказа:", e);
        finalAnswer = "Ошибка при обработке заказа на покупку.";
    }

}

            ///////09.01.2026


              // --- ЛОГИКА ПРОДАЖ ---
if (functionName === "get_sales_analytics") {
    try {
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
        const searchQuery = args.query ? args.query.toLowerCase().trim() : null; // <--- ПОЛУЧАЕМ ЗАПРОС

        // ... (Ваш switch-case для расчета дат остается без изменений) ...
        const dFrom = new Date(now);
        switch (period) {
            case "today": dateFrom = dateTo; break;
            case "week": dFrom.setDate(now.getDate() - 7); dateFrom = getLocalDate(dFrom); break;
            case "month": dFrom.setMonth(now.getMonth() - 1); dateFrom = getLocalDate(dFrom); break;
            default: dFrom.setDate(now.getDate() - 7); dateFrom = getLocalDate(dFrom);
        }
        
         

        // Получаем название периода на нужном языке
        periodNameGlobal = t.periods[period] || t.periods.week;

        //let periodNameRu = period === "today" ? "сегодня" : period === "month" ? "месяц" : "неделю";
        //periodNameGlobal = periodNameRu;

        const salesRes = await fetch(`${process.env.BACKEND_URL}/api/report/grossprofit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': authToken || '' },
            body: JSON.stringify({ "dateFrom": dateFrom, "dateTo": dateTo, "notattr": "0", "point": "0" })
        });

        if (!salesRes.ok && salesRes.status === 401) 
          //return res.json({ answer: '❌ Сессия истекла.' });
        return res.json({ answer: t.sessionExpired });

        const data = await salesRes.json();
        let items = Array.isArray(data) ? data : (data.result || []);

        // --- ЛОГИКА ФИЛЬТРАЦИИ ПО ТОВАРУ ---
        if (searchQuery && items.length > 0) {
            items = items.filter(i => (i.name || "").toLowerCase().includes(searchQuery));
        }

        if (items.length > 0) {
            dataType = "sales";
            
            // Расчет итогов (теперь totals считаются только по отфильтрованным товарам)
            const totals = items.reduce((acc, item) => {
                acc.units += parseFloat(item.units) || 0;
                acc.sales += parseFloat(item.salesamount) || 0;
                acc.profit += parseFloat(item.gross_profit) || 0;
                acc.cost += parseFloat(item.cost) || 0;
                return acc;
            }, { units: 0, sales: 0, profit: 0, cost: 0 });

            // Подгружаем остатки для прогноза (как у вас и было)
            const stockRes = await fetch(`${process.env.BACKEND_URL}/api/report/stockbalance/simple`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': authToken || '' },
                body: JSON.stringify({ "barcode": "", "brand": "@", "counterparty": "0", "stockID": "0" })
            });

            if (!stockRes.ok && stockRes.status === 401) 
          //return res.json({ answer: '❌ Сессия истекла.' });
           return res.json({ answer: t.sessionExpired });

            const stockDataRaw = await stockRes.json();
            const stockItems = Array.isArray(stockDataRaw) ? stockDataRaw : (stockDataRaw.result || []);
            
            const stockMap = new Map();
            stockItems.forEach(s => stockMap.set(s.productname, { units: parseFloat(s.units) || 0, point: s.pointname || "" }));

            const periodDays = period === "today" ? 1 : period === "week" ? 7 : 30;

            // Расширяем данные для прогноза
            const itemsWithForecast = items.map(i => {
                const soldQty = parseFloat(i.units) || 0;
                const stockData = stockMap.get(i.name) || { units: 0, point: "" };
                const ads = soldQty / periodDays;
                const daysLeft = ads > 0 ? Math.floor(stockData.units / ads) : Infinity;
                return { ...i, ads, daysLeft, realStock: stockData.units, point: stockData.point };
            });

            // Формируем прогноз
            const outOfStockSoon = itemsWithForecast
                .filter(i => i.ads > 0 && i.daysLeft <= 14) // Увеличим порог до 14 для поиска
                .sort((a, b) => a.daysLeft - b.daysLeft)
                .slice(0, 5);

            /* const forecastText = outOfStockSoon.length > 0
                ? outOfStockSoon.map(i => `- **${i.name}**: хватит на **${i.daysLeft}** дн. (остаток: ${i.realStock})`).join("\n")
                : "Запасов достаточно."; */
            const forecastText = outOfStockSoon.length > 0
            ? outOfStockSoon.map(i => {
            // Пример RU: - Товар: хватит на 5 дн. (остаток: 10)
            // Пример KK: - Тауар: 5 күнге жеткілікті (қалдық: 10)
            if (lang === 'kk') {
                return `- **${i.name}**: **${i.daysLeft}** ${t.daysShort} ${t.forecastLeft} (${t.stockShort}: ${i.realStock})`;
            }
            return `- **${i.name}**: ${t.forecastLeft} **${i.daysLeft}** ${t.daysShort} (${t.stockShort}: ${i.realStock})`;
            }).join("\n")
            : t.forecastEnough;   

            // Формируем финальный ответ
            if (searchQuery) {
                // ПЕРСОНАЛЬНЫЙ ОТВЕТ ДЛЯ ПОИСКА
                /* finalAnswer = `### 🔍 Результаты по запросу: "${args.query}"\n` +
                    `За период: **${periodNameGlobal}**\n\n` +
                    `📈 **Продано:** ${totals.units.toFixed(0)} \n` +
                    `🚚 **Себестоимость:** ${Math.round(totals.cost).toLocaleString()}\n` +
                    `💰 **Сумма реализации:** ${Math.round(totals.sales).toLocaleString()}\n` +
                    `💵 **Прибыль:** ${Math.round(totals.profit).toLocaleString()}\n\n` +
                    `**📦 Статус остатков:**\n${forecastText}\n\n` +
                    `*Все найденные позиции (${items.length}) добавлены в таблицу.*`; */
                    finalAnswer = `### 🔍 ${t.searchResults}: "${args.query}"\n` +
                        `${t.forPeriod}: **${periodNameGlobal}**\n\n` +
                        `📈 **${t.sold}:** ${totals.units.toFixed(0)} ${t.pcs}\n` +
                        `🚚 **${t.cost}:** ${Math.round(totals.cost).toLocaleString()}\n` +
                        `💰 **${t.revenue}:** ${Math.round(totals.sales).toLocaleString()}\n` +
                        `💵 **${t.profit}:** ${Math.round(totals.profit).toLocaleString()}\n\n` +
                        `**📦 ${t.stockStatus}:**\n${forecastText}\n\n` +
                        `*${t.addedToTable.replace("{count}", items.length)}*`;
            } else {
                // ВАШ СТАНДАРТНЫЙ ОБЩИЙ ОТЧЕТ (Лидеры, Аномалии и т.д.)
                const topByQty = [...items].sort((a, b) => b.units - a.units).slice(0, 3);
                //const qtyLeadersText = topByQty.map(i => `- ${i.name}: ${parseFloat(i.units)} шт.`).join("\n");
                const qtyLeadersText = topByQty.map(i => `- ${i.name}: ${parseFloat(i.units)} ${t.pcs}`).join("\n");
                

                //${t.daysShort}
                //////
                
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
   /*  const alertText = moneyLosers.length > 0 
        ? moneyLosers.map(i => `⚠️ УБЫТОК: ${i.name} (Минус ${Math.abs(Math.round(i.gross_profit)).toLocaleString()})`).join("\n")
        : "Убыточных товаров не обнаружено."; */
        
        const alertText = moneyLosers.length > 0 
        ? moneyLosers.map(i => `⚠️ ${t.loss}: ${i.name} (${t.minus} ${Math.abs(Math.round(i.gross_profit)).toLocaleString()})`).join("\n")
        : t.noLossItems;

        /* const starText = starItems.map(i => `⭐ МАРЖА ${Math.round(i.margin)}%: ${i.name}`).join("\n");
 */
       


        const starText = starItems.map(i => 
         `⭐ ${t.margin} ${Math.round(i.margin)}%: ${i.name}`
        ).join("\n");
        
            const profitLeadersText = topByProfit.map(i => `- ${i.name}: ${Math.round(i.gross_profit).toLocaleString()}`).join("\n");

                
                ///////


                /* finalAnswer = `### Итоги за ${periodNameGlobal}\n` +
                    `📈 **Продано:** ${totals.units.toFixed(0)} \n` +
                    `🚚 **Себестоимость:** ${Math.round(totals.cost).toLocaleString()}\n` +
                    `💰 **Сумма реализации:** ${Math.round(totals.sales).toLocaleString()}\n` +
                    `💵 **Прибыль:** ${Math.round(totals.profit).toLocaleString()}\n\n` +
                    `**🔥 Лидеры по количеству:**\n${qtyLeadersText}\n\n` +

                    `**💰 Лидеры по прибыли:**\n${profitLeadersText}\n\n` +
                    `**⭐ Самые выгодные позиции:**\n${starText}\n\n` +
                    `**📉 Прогноз:**\n${forecastText}`;

                    if (moneyLosers.length > 0) {
                    finalAnswer += `### 🔴 СРОЧНО ПРОВЕРЬТЕ ЦЕНЫ!\n${alertText}\n\n`;
                */ 
                 finalAnswer = `### ${t.salesSummary} ${periodNameGlobal}\n` +
                    `📈 **${t.sold}:** ${totals.units.toFixed(0)} ${t.pcs}\n` +
                    `🚚 **${t.cost}:** ${Math.round(totals.cost).toLocaleString()}\n` +
                    `💰 **${t.revenue}:** ${Math.round(totals.sales).toLocaleString()}\n` +
                    `💵 **${t.profit}:** ${Math.round(totals.profit).toLocaleString()}\n\n` +
                       
                    `**${t.qtyLeaders}**\n${qtyLeadersText}\n\n` +

                    `**${t.profitLeaders}**\n${profitLeadersText}\n\n` +
                    `**${t.starItems}**\n${starText}\n\n` +
                    `**📉 ${t.stockStatus}:**\n${forecastText}\n\n`;

                if (moneyLosers.length > 0) {
                     finalAnswer += `### ${t.urgentPriceCheck}\n${alertText}\n\n`;
                
                }

            }

            // Данные для таблицы на фронте
            salesData = items.map(i => ({
                name: i.name,
                quantity: parseFloat(i.units),
                sum: i.salesamount,
                profit: i.gross_profit,
                cost: i.cost,
                date: `${dateFrom} - ${dateTo}`
            }));

        } else {
            const queryDisplay = args.query || t.generalReport;
            finalAnswer = t.noDataFound
                .replace("{period}", periodNameGlobal)
                .replace("{query}", queryDisplay);
            //finalAnswer = `ИНФОРМАЦИЯ: За период (${periodNameGlobal}) данных по запросу "${args.query || 'общий отчет'}" не найдено.`;
        }
    } catch (e) { 
        console.error(e);
        //finalAnswer = "Ошибка в продажах"; 
        finalAnswer = t.salesError;
    }
}

              ////////

               /*  toolResponses.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: currentResultText
                }); */
            }

            //console.log (toolResponses);

            // Финальный вызов ИИ
            //const finalResponse = await openai.chat.completions.create({
            //    model: "gpt-4o-mini",

           /*  const finalResponse = await groq.chat.completions.create({
            model: "llama-3.3-70b-versatile",
                //model: MODEL_NAME,
                messages: [
                  ///
                
        
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
               - ОБЯЗАТЕЛЬНО добавь блок "### 🔍 Анализ аномалий":
                  Если в данных от инструмента есть раздел "АНОМАЛИИ И ОТКЛОНЕНИЯ", перескажи его подробно. 
                  Если всплесков или убытков нет, так и напиши: "Аномалий в этом периоде не обнаружено".
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

          
                  ///
                    { role: "user", content: message },
                    { role: "assistant", tool_calls: aiMsg.tool_calls },
                    ...toolResponses
                ]
            });
 */
            
            
            return res.json({ 
                //answer: finalResponse.choices[0].message.content,
                answer:finalAnswer,
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



/* router.post("/chat1", async (req, res) => {
    const { message } = req.body;
    const authToken = req.headers['authorization'];
    
    let problematicItems = [];
    let salesData = []; 
    let dataType = "none";
    let periodNameGlobal;

    try {
        // 1. Описываем модель и ИНСТРУМЕНТЫ (Tools) в формате Google
        const model = genAI.getGenerativeModel({ 
            model: "gemini-1.5-flash",
            tools: [{
                functionDeclarations: [
                    {
                        name: "get_sales_analytics",
                        description: "Аналитика продаж за указанный период (сегодня, неделя, месяц)",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                period: { 
                                    type: "STRING", 
                                    enum: ["today", "week", "month"],
                                    description: "Временной интервал" 
                                }
                            },
                            required: ["period"]
                        }
                    },
                    {
                        name: "analyze_inventory",
                        description: "Анализ остатков на складе (дефицит и излишки)",
                    }
                ]
            }]
        });

        // 2. Запускаем чат с системной инструкцией
        const chat = model.startChat();
        
        // Инструкцию для Gemini лучше слать первым сообщением или в параметре systemInstruction
        const prompt = `Сегодня ${new Date().toLocaleDateString('ru-RU')}. Ты помощник по учету. 
        Если спрашивают про продажи — вызывай get_sales_analytics. 
        Если про остатки — analyze_inventory.
        Запрос пользователя: ${message}`;

        const result = await chat.sendMessage(prompt);
        const response = result.response;

        // 3. Проверяем, хочет ли Gemini вызвать функцию
        const calls = response.functionCalls();
        
        if (calls && calls.length > 0) {
            const toolResponses = {}; // Для Google формат ответов отличается

            for (const call of calls) {
                const functionName = call.name;
                const args = call.args;
                let currentResultText = "Нет данных";

                // --- ТУТ ВАША ЛОГИКА (get_sales_analytics / analyze_inventory) ---
                // Скопируйте сюда ваш существующий код обработки (fetch к бэкенду)
                if (functionName === "get_sales_analytics") {
                    // ... (ваш код расчета дат, fetch, расчет аномалий и т.д.) ...
                    // В конце:
                    currentResultText = `Результаты: ...`; 
                }
                
                // Сохраняем ответ для отправки обратно в ИИ
                toolResponses[functionName] = currentResultText;
            }

            // 4. Отправляем результаты функций обратно в Gemini, чтобы она составила финальный текст
            const finalResult = await chat.sendMessage([{
                functionResponse: {
                    name: "get_sales_analytics", // или динамически
                    response: { content: toolResponses["get_sales_analytics"] || toolResponses["analyze_inventory"] }
                }
            }]);

            return res.json({ 
                answer: finalResult.response.text(),
                dataType, 
                stockData: problematicItems, 
                salesData 
            });
        }

        // Если функций не было, просто возвращаем текст
        return res.json({ answer: response.text() });

    } catch (err) {
        console.error("🔥 ОШИБКА:", err);
        res.status(500).json({ error: err.message });
    }
}); */


/* router.post("/chat1", async (req, res) => {
    try {
        const genAI = new GoogleGenerativeAI(OPENAI_KEY);
        const result1 = await genAI.listModels();
console.log(result1);
        // Используем 'gemini-1.5-flash' без лишних путей
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-002" });

        const result = await model.generateContent(req.body.message);
        const response = await result.response;
        const text = response.text();

        res.json({ answer: text });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка при обращении к Gemini" });
    }
}); */



router.post("/chat1", async (req, res) => {
    try {
        const { message } = req.body;

        const response = await groq.chat.completions.create({
            // Рекомендую эту модель: она умная как GPT-4, но бесплатная и быстрая
            model: "llama-3.3-70b-versatile", 
            messages: [
                { role: "system", content: "Ты краткий помощник по аналитике." },
                { role: "user", content: message }
            ],
            // Оставляем пустой массив tools для теста связи
            tools: [
                {
                    type: "function",
                    function: {
                        name: "get_sales",
                        description: "Получить продажи",
                        parameters: { type: "object", properties: {} }
                    }
                }
            ]
        });

        const aiMsg = response.choices[0].message;
        
        // Если ИИ просто ответил текстом:
        res.json({ answer: aiMsg.content || "ИИ вызвал функцию (нужна обработка tool_calls)" });

    } catch (err) {
        console.error("Грок ошибка:", err);
        res.status(500).json({ error: err.message });
    }
});



module.exports = router;