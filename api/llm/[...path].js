// Vercel Serverless Function —— LLM 透明流式代理
// 前端调用同源 /api/llm/v1/chat/completions,本函数注入服务器端 LLM_API_KEY 转发到上游。
// key 仅存在于 Vercel 环境变量,不进源码、不下发给浏览器。

// 禁用 body 解析,保留原始流式请求体
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};

export default async function handler(req, res) {
  try {
    const rawUpstreamBase = process.env.LLM_UPSTREAM_BASE_URL || "https://api.ant-ling.com";
    const upstreamBase = rawUpstreamBase.replace(/\/+$/, "").replace(/\/v1$/i, "");
    const incomingUrl = req.url || "/api/llm/v1/chat/completions";
    const upstreamPath = incomingUrl.replace(/^\/api\/llm/, "") || "/v1/chat/completions";
    const upstreamUrl = `${upstreamBase}${upstreamPath}`;

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
    if (req.method !== "GET" && req.method !== "HEAD" && req.body) {
      init.body = req.body;
      init.duplex = "half";
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
