// Vercel Serverless Function —— LLM 透明流式代理
// 文件路径直接对应前端调用 URL:/api/llm/v1/chat/completions
// 注入服务器端 LLM_API_KEY 转发到上游,key 不进源码、不下发浏览器。

export const config = {
  api: {
    responseLimit: false,
  },
};

function toBody(body) {
  // Vercel 可能把 req.body 解析成普通 Object;直接交给 fetch 会变成 "[object Object]"。
  // 在转发前统一序列化:string/Buffer 直传,对象转 JSON。
  if (body == null) return undefined;
  if (typeof body === "string") return body;
  if (typeof Buffer !== "undefined" && Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return body;
  return JSON.stringify(body);
}

export default async function handler(req, res) {
  try {
    const rawUpstreamBase = process.env.LLM_UPSTREAM_BASE_URL || "https://api.ant-ling.com";
    const upstreamBase = rawUpstreamBase.replace(/\/+$/, "").replace(/\/v1$/i, "");
    const upstreamUrl = `${upstreamBase}/v1/chat/completions`;

    const upstreamApiKey = process.env.LLM_API_KEY || process.env.ANT_LING_API_KEY;
    const headers = {
      "content-type": req.headers["content-type"] || "application/json",
      accept: req.headers["accept"] || "text/event-stream",
    };
    if (upstreamApiKey) {
      headers.authorization = `Bearer ${upstreamApiKey}`;
    } else if (req.headers.authorization) {
      // 兜底:服务器无 key 时回退用请求自带(仅 dev/自填场景)
      headers.authorization = req.headers.authorization;
    }

    const init = {
      method: req.method,
      headers,
    };
    if (req.method !== "GET" && req.method !== "HEAD") {
      const body = toBody(req.body);
      if (body != null) init.body = body;
    }

    const upstream = await fetch(upstreamUrl, init);

    res.status(upstream.status);
    const contentType = upstream.headers.get("content-type");
    if (contentType) res.setHeader("content-type", contentType);

    // 透传 stream,不缓冲整包,保证前端逐字流式体验
    if (upstream.body) {
      const reader = upstream.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        res.write(value);
      }
      res.end();
    } else {
      res.end();
    }
  } catch (error) {
    res.status(500).json({
      error: "LLM proxy failed",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}