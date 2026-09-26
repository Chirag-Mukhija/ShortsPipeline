// Server entry point: starts the API, media file server and job runner.
import { startServer } from "./app";

const { port } = await startServer();
console.log(`ClipForge server listening on http://localhost:${port}`);
