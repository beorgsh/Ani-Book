import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { createApiApp } from "./src/apiServer.js";

async function startServer() {
  const app = createApiApp();
  const PORT = 3000;

  // Vite middleware setup for local & container development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[SERVER] Running at http://0.0.0.0:${PORT} under NODE_ENV=${process.env.NODE_ENV || "development"}`);
  });
}

startServer();
