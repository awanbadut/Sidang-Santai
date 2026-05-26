import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 8080;

// Dynamic configuration endpoint to serve keys to client securely at runtime
app.get('/config.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  const keys = process.env.GEMINI_KEYS || process.env.VITE_GEMINI_KEYS || '';
  res.send(`window.ENV_GEMINI_KEYS = ${JSON.stringify(keys)};`);
});

// Serve static files from the build output directory (dist)
app.use(express.static(path.join(__dirname, 'dist')));

// Fallback all other requests to index.html for client-side routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server is running on port ${PORT}`);
});
