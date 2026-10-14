const path = require('path');
const fs = require('fs');
const express = require('express');

const app = express();

// Angular build output (dist/frontend/browser)
const distDir = path.join(__dirname, 'dist', 'frontend', 'browser');

app.use(express.static(distDir));

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