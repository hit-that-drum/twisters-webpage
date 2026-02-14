import app from './app.js';

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`\n✅ Server is live at http://localhost:${PORT}`);
});
