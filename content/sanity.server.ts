import { Elysia } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import { extname } from "path";

const types: Record<string, string> = {
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".css": "text/css",
  ".html": "text/html",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

const app = new Elysia()
  // раздаём текущую папку
  .use(staticPlugin({ assets: ".", prefix: "/" }))

  // SPA fallback: если файл реально не существует
  .get("*", async (c) => {
    const path = `.${new URL(c.request.url).pathname}`;
    const file = Bun.file(path);

    if (await file.exists()) {
      // выставляем MIME по расширению
      const type = types[extname(path)] ?? "application/octet-stream";
      return new Response(file, { headers: { "Content-Type": type } });
    }

    // fallback для SPA
    return new Response(Bun.file("./index.html"), {
      headers: { "Content-Type": "text/html" },
    });
  });

app.listen(3333);

console.log("http://localhost:3333");