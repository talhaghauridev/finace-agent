import Groq from "groq-sdk";
import readline from "readline/promises";
import type { ChatCompletionMessageParam } from "groq-sdk/resources/chat.mjs";

type ExpenseDBType = { name: string; amount: number };

const expenseDB: ExpenseDBType[] = [];
const incomeDB: ExpenseDBType[] = [];

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function callAgent() {
  const rl = await readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  const messages: ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `You are Talha Chatbot, a personal finance assistant. Your task is to assist user with their expenses, balances and financial planning.
            current datetime: ${new Date().toUTCString()}`,
    },
  ];
  while (true) {
    const message = await rl.question("User: ");
    if (!message || message === "bye") {
      break;
    }
    messages.push({
      role: "user",
      content: message,
    });

    while (true) {
      const completion = await groq.chat.completions.create({
        messages: messages,
        model: "llama-3.3-70b-versatile",
        tools: [
          {
            type: "function",
            function: {
              name: "getTotalExpense",
              description: "Get total expense to date to date.",
              parameters: {
                type: "object",
                from: {
                  type: "string",
                  description: "From date to get the expense.",
                },
                to: {
                  type: "string",
                  description: "To date to get the expense.",
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "addExpense",
              description: "Add new expense entry into the database.",
              parameters: {
                type: "object",
                name: {
                  type: "string",
                  description: "Name of the expense. e.g., Brought phone etc.",
                },
                amount: {
                  type: "string",
                  description: "Amount of the expense.",
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "addIncome",
              description: "Add new income entry to income database",
              parameters: {
                type: "object",
                name: {
                  type: "string",
                  description: "Name of the income. e.g., Got salary",
                },
                amount: {
                  type: "string",
                  description: "Amount of the income.",
                },
              },
            },
          },
          {
            type: "function",
            function: {
              name: "getMoneyBalance",
              description: "Get remaining money balance from database.",
            },
          },
        ],
      });

      if (completion.choices[0]?.message) {
        messages.push(completion.choices[0].message);
      }

      const toolCalls = completion.choices[0]?.message.tool_calls;

      if (!toolCalls) {
        console.log(`Assistant: ${completion.choices[0]?.message.content}`);
        break;
      }

      if (toolCalls) {
        for (const tool of toolCalls) {
          const functionName = tool.function.name;
          const functionArgs = tool.function.arguments;
          let result = "";

          if (functionName === "getTotalExpense") {
            result = getTotalExpense(JSON.parse(functionArgs));
          } else if (functionName === "addExpense") {
            result = addExpense(JSON.parse(functionArgs));
          } else if (functionName === "getMoneyBalance") {
            result = getMoneyBalance();
          } else if (functionName === "addIncome") {
            result = addExpense(JSON.parse(functionArgs));
          }

          console.log({ result });
          messages.push({
            role: "tool",
            content: result,
            tool_call_id: tool.id,
          });
        }
      }
    }
  }
  rl.close();
}

callAgent();

const getTotalExpense = ({ from, to }: { from: string; to: string }) => {
  console.log("Get Total Expense tool call");
  const expense = expenseDB.reduce((acc, item) => acc + item.amount, 0);
  return `${expense} INR`;
};

function addExpense({ name, amount }: { name: string; amount: number }) {
  console.log("Add Expense tool call");
  expenseDB.push({ name, amount });
  return "Added to the database.";
}

function addIncome({ name, amount }: { name: string; amount: number }) {
  console.log("Add income tool call");
  incomeDB.push({ name, amount });
}

function getMoneyBalance() {
  const totalIncome = incomeDB.reduce((acc, item) => acc + item.amount, 0);
  const totalExpense = expenseDB.reduce((acc, item) => acc + item.amount, 0);

  return `${totalIncome - totalExpense} INR`;
}
