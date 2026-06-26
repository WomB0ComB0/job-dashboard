import index from "./index.html";
import { app } from "./src/server/app";

const port = Number(process.env.PORT) || 3000;

Bun.serve({
  port,
  routes: {
    "/": index,
  },
  async fetch(req) {
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) {
      return app.handle(req);
    }
    
    // Serve static files
    const file = Bun.file("." + url.pathname);
    if (await file.exists()) {
      return new Response(file);
    }

    return new Response("Not Found", { status: 404 });
  },
  development: true,
});

console.log(`Server running on http://localhost:${port}`);
