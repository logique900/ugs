#!/bin/bash
sed -i '/async function startServer/i \
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {\n  console.error("Express Global Error:", err);\n  if (req.path.startsWith("/api/")) {\n    res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });\n  } else {\n    next(err);\n  }\n});\n' server.ts
