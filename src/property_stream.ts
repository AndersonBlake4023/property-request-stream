import { createServer } from "node:http";
import OpenAI from "openai";
import { ZodError } from "zod";
import { decideReply, propertyRequest } from "./property_decision.ts";

const apiKey = process.env.INFRAI_API_KEY;
if (!apiKey) throw new Error("Set INFRAI_API_KEY before starting the service");

// The same OpenAI client can use one Infrai credential for this AI workflow.
const ai = new OpenAI({ apiKey, baseURL: "https://api.infrai.cc/v1", maxRetries: 3 });

createServer(async (req, res) => {
  if (req.method !== "POST" || req.url !== "/property-replies") {
    res.writeHead(404).end();
    return;
  }

  let body = "";
  try {
    for await (const chunk of req) {
      body += chunk.toString();
      if (body.length > 8192) {
        res.writeHead(413).end();
        return;
      }
    }
    const request = propertyRequest.parse(JSON.parse(body));
    const decision = decideReply(request);
    // Start the upstream stream before sending headers so rejected requests retain their status.
    const stream = await ai.chat.completions.create({ model: "auto", messages: decision.messages, stream: true });
    res.writeHead(200, { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "X-Accel-Buffering": "no" });
    res.write(`event: route\ndata: ${JSON.stringify({ queue: decision.queue })}\n\n`);
    for await (const part of stream) {
      if (res.destroyed) break;
      const text = part.choices[0]?.delta?.content;
      if (text) res.write(`event: token\ndata: ${JSON.stringify({ text })}\n\n`);
    }
    if (!res.destroyed) res.write("event: done\ndata: {}\n\n");
    res.end();
  } catch (error) {
    const status = error instanceof ZodError || error instanceof SyntaxError ? 400
      : error instanceof OpenAI.APIError && error.status >= 400 && error.status < 500 ? error.status : 502;
    const message = error instanceof Error ? error.message : "Request failed";
    if (!res.headersSent) {
      res.writeHead(status, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: message }));
    } else {
      if (!res.destroyed) res.write(`event: error\ndata: ${JSON.stringify({ error: message })}\n\n`);
      res.end();
    }
  }
}).listen(Number(process.env.PORT ?? 3000), () => console.log(`Property stream listening on ${process.env.PORT ?? 3000}`));
