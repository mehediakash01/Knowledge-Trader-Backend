import { z } from "zod";
import config from "../../../config";
import {
  TAIGatewayResponse,
  TAIProviderName,
  TAIStructuredSchema,
} from "./ai.interface";

type TProviderConfig = {
  name: Exclude<TAIProviderName, "mock">;
  apiKey?: string;
  call: (prompt: string, signal: AbortSignal) => Promise<string>;
};

export class AIGateway {
  private providers: TProviderConfig[];

  constructor() {
    this.providers = [
      {
        name: "gemini",
        apiKey: config.ai.geminiApiKey,
        call: this.callGemini.bind(this),
      },
      {
        name: "groq",
        apiKey: config.ai.groqApiKey,
        call: this.callGroq.bind(this),
      },
      {
        name: "openrouter",
        apiKey: config.ai.openRouterApiKey,
        call: this.callOpenRouter.bind(this),
      },
    ];
  }

  async generateStructured<T>(
    prompt: string,
    schema: TAIStructuredSchema<T>,
    fallbackData: T,
  ): Promise<TAIGatewayResponse<T>> {
    for (const provider of this.providers) {
      if (!provider.apiKey) {
        continue;
      }

      try {
        const responseText = await this.withTimeout((signal) =>
          provider.call(this.buildJsonPrompt(prompt), signal),
        );
        const parsed = this.safeJsonParse(responseText);
        const data = schema.parse(parsed);

        return {
          success: true,
          provider: provider.name,
          data,
        };
      } catch {
        continue;
      }
    }

    return {
      success: true,
      provider: "mock",
      data: fallbackData,
    };
  }

  private buildJsonPrompt(prompt: string) {
    return [
      prompt,
      "Return only valid JSON. Do not include markdown, prose, or code fences.",
    ].join("\n\n");
  }

  private async withTimeout<T>(
    operation: (signal: AbortSignal) => Promise<T>,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.ai.timeoutMs);

    try {
      return await operation(controller.signal);
    } finally {
      clearTimeout(timeout);
    }
  }

  private safeJsonParse(response: string) {
    // 1. Locate the first '{' or '['
    const objStart = response.indexOf("{");
    const arrStart = response.indexOf("[");
    const start = objStart !== -1 && arrStart !== -1 
      ? Math.min(objStart, arrStart) 
      : Math.max(objStart, arrStart);

    if (start === -1) {
      throw new Error("AI response contained no valid JSON structure");
    }

    // 2. Extract from start to the end of the string
    let rawJson = response.slice(start);

    // 3. Clean up trailing markdown or text
    const objEnd = rawJson.lastIndexOf("}");
    const arrEnd = rawJson.lastIndexOf("]");
    const end = Math.max(objEnd, arrEnd);
    
    if (end !== -1) {
       rawJson = rawJson.slice(0, end + 1);
    }

    let cleaned = rawJson
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/gi, "")
      .replace(/```$/gi, "")
      .trim();

    try {
      return JSON.parse(cleaned);
    } catch (error) {
      // 4. Handle partial JSON (cut off mid-sentence)
      try {
        // Auto-close string if open
        const quoteCount = (cleaned.match(/"/g) || []).length;
        let patched = cleaned;
        if (quoteCount % 2 !== 0) patched += '"';
        
        // Auto-close brackets/braces based on what's open
        let openBraces = 0;
        let openBrackets = 0;
        for (let i = 0; i < patched.length; i++) {
          if (patched[i] === '{' && patched[i-1] !== '\\') openBraces++;
          if (patched[i] === '}' && patched[i-1] !== '\\') openBraces--;
          if (patched[i] === '[' && patched[i-1] !== '\\') openBrackets++;
          if (patched[i] === ']' && patched[i-1] !== '\\') openBrackets--;
        }
        
        while (openBrackets > 0) { patched += ']'; openBrackets--; }
        while (openBraces > 0) { patched += '}'; openBraces--; }
        
        const escaped = patched.replace(/\n/g, "\\n").replace(/\r/g, "\\r");
        return JSON.parse(escaped);
      } catch (finalError) {
        throw new Error(`AI response JSON parsing failed completely: ${finalError}`);
      }
    }
  }

  private async callGemini(prompt: string, signal: AbortSignal) {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${config.ai.geminiApiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" },
        }),
        signal,
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini failed with ${response.status}`);
    }

    const json = (await response.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };

    return json.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }

  private async callGroq(prompt: string, signal: AbortSignal) {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ai.groqApiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Groq failed with ${response.status}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return json.choices?.[0]?.message?.content || "";
  }

  private async callOpenRouter(prompt: string, signal: AbortSignal) {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ai.openRouterApiKey}`,
      },
      body: JSON.stringify({
        model: "meta-llama/llama-3.1-8b-instruct:free",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`OpenRouter failed with ${response.status}`);
    }

    const json = (await response.json()) as {
      choices?: { message?: { content?: string } }[];
    };

    return json.choices?.[0]?.message?.content || "";
  }
}

export const aiGateway = new AIGateway();
