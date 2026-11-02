// Filtro temporaneo: Claude Code -> :4142 (questo) -> :4141 (copilot-api)
// Rimuove i messaggi "assistant" finali (prefill) dalle richieste /v1/messages.
import http from "node:http";

const UPSTREAM = "http://localhost:4141";
const PORT = 4142;

http.createServer(async (req, res) => {
  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    let body = Buffer.concat(chunks);

    if (req.method === "POST" && req.url.startsWith("/v1/messages") && body.length) {
      const json = JSON.parse(body.toString("utf8"));
      let removed = 0;
      // Claude Code invia messaggi role="system" dentro messages: copilot-api li tratta come
      // "assistant" (=> prefill). Li uniamo come testo al messaggio user precedente.
      let merged = 0;
      const out = [];
      const toBlocks = (c) => (typeof c === "string" ? [{ type: "text", text: c }] : c);
      for (const m of json.messages ?? []) {
        if (m.role === "system") {
          const blocks = toBlocks(m.content).map((b) => ({ type: "text", text: b.text ?? "" }));
          const prev = out.at(-1);
          if (prev && prev.role === "user") prev.content = [...toBlocks(prev.content), ...blocks];
          else out.push({ role: "user", content: blocks });
          merged++;
        } else out.push(m);
      }
      if (json.messages) json.messages = out;
      // Nomi Anthropic (claude-opus-5-5, claude-sonnet-5-20260101) -> nomi Copilot (claude-opus-5.5, claude-sonnet-5)
      if (typeof json.model === "string") {
        json.model = json.model
          .replace(/\[.*\]$/, "")
          .replace(/-\d{8}$/, "")
          .replace(/^(claude-(?:opus|sonnet|haiku))-(\d+)-(\d+)$/, "$1-$2.$3");
      }
      while (json.messages?.length > 1 && json.messages.at(-1).role === "assistant") {
        json.messages.pop();
        removed++;
      }
      console.log(`${new Date().toISOString()} ${req.url} model=${json.model}${removed ? ` prefill rimosso (${removed})` : ""}${merged ? ` system unito (${merged})` : ""}`);
      body = Buffer.from(JSON.stringify(json));
    }

    const headers = { ...req.headers };
    delete headers.host;
    delete headers["content-length"];

    const up = await fetch(UPSTREAM + req.url, {
      method: req.method,
      headers,
      body: ["GET", "HEAD"].includes(req.method) ? undefined : body,
    });

    const outHeaders = Object.fromEntries(up.headers);
    delete outHeaders["content-encoding"];
    delete outHeaders["content-length"];
    res.writeHead(up.status, outHeaders);
    if (up.body) for await (const c of up.body) res.write(c);
    res.end();
  } catch (e) {
    console.error("errore:", e.message);
    if (!res.headersSent) res.writeHead(502, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "shim: " + e.message } }));
  }
}).listen(PORT, "127.0.0.1", () => console.log(`shim su http://127.0.0.1:${PORT} -> ${UPSTREAM}`));
