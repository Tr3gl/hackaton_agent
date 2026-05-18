import { tools, executeTool, summarizeTool } from "./tools";
import type { ToolCallLog } from "./types";

export async function runAgentLoop(query: string, toolLogs: ToolCallLog[]): Promise<any> {
  if (process.env.USE_LOCAL_MODEL === "true") {
    return runLocalAgentLoop(query, toolLogs);
  }
  return runGeminiAgentLoop(query, toolLogs);
}

async function runLocalAgentLoop(query: string, toolLogs: ToolCallLog[]): Promise<any> {
  const url = process.env.LOCAL_LLM_URL || "http://127.0.0.1:8000/v1";
  
  const openAiTools = tools.map(t => ({
    type: "function",
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters
    }
  }));

  const messages: any[] = [{ role: "user", content: query }];
  
  for (let i = 0; i < 6; i++) {
    const response = await fetch(`${url}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        tools: openAiTools,
        temperature: 0.1,
      }),
    });

    if (!response.ok) throw new Error(`Local LLM loop error: ${response.status}`);
    const data = await response.json();
    const message = data.choices?.[0]?.message;

    if (!message) break;
    messages.push(message);

    const toolCalls = message.tool_calls || [];
    if (toolCalls.length === 0) {
      return message.content;
    }

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      
      const fnName = call.function.name;
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch (e) { /* ignore parse error */ }
      
      toolLogs.push({ tool: fnName, status: 'running', summary: 'Executing...' });
      const result = await executeTool(fnName, args);
      
      toolLogs[toolLogs.length - 1].status = 'done';
      toolLogs[toolLogs.length - 1].summary = summarizeTool(fnName, result);
      toolLogs[toolLogs.length - 1].result = result;

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result)
      });
    }
  }
  return null;
}

async function runGeminiAgentLoop(query: string, toolLogs: ToolCallLog[]): Promise<any> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Missing GEMINI_API_KEY");
  const model = process.env.GEMINI_MODEL || "gemini-3.1-flash-lite";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const messages: any[] = [{ role: "user", parts: [{ text: query }] }];
  
  for (let i = 0; i < 6; i++) {
    const response = await fetch(`${endpoint}?key=${encodeURIComponent(apiKey)}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: messages,
        tools: [{ functionDeclarations: tools }],
        generationConfig: { temperature: 0.1 },
      }),
    });

    if (!response.ok) throw new Error(`Gemini loop error: ${response.status}`);
    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate?.content) break;

    const parts = candidate.content.parts || [];
    const functionCalls = parts.filter((p: any) => p.functionCall);

    if (functionCalls.length === 0) {
      return parts.map((p: any) => p.text).join(" ");
    }

    for (const call of functionCalls) {
      const fnName = call.functionCall.name;
      const args = call.functionCall.args || {};
      
      toolLogs.push({ tool: fnName, status: 'running', summary: 'Executing...' });
      const result = await executeTool(fnName, args);
      
      toolLogs[toolLogs.length - 1].status = 'done';
      toolLogs[toolLogs.length - 1].summary = summarizeTool(fnName, result);
      toolLogs[toolLogs.length - 1].result = result;

      messages.push({ role: "model", parts: [call] });
      messages.push({
        role: "user",
        parts: [{
          functionResponse: {
            name: fnName,
            response: { result }
          }
        }]
      });
    }
  }
  return null;
}
