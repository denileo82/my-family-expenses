const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();

// Angular build output (dist/frontend/browser)
const distDir = path.join(__dirname, 'dist', 'frontend', 'browser');

// index.html sempre sem cache para evitar versão antiga após deploy
app.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(distDir, 'index.html'));
});

app.use(express.static(distDir, {
  index: false,
  setHeaders(res, filePath) {
    if (filePath.endsWith('index.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  },
}));

// SPA fallback: serve index.html for any route not found
app.use((req, res) => {
  const indexFile = path.join(distDir, 'index.html');
  if (fs.existsSync(indexFile)) {
    res.sendFile(indexFile);
  } else {
    res.status(404).send('Build not found. Run "npm run build" first.');
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});