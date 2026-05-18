import express from 'express';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'AI Service is running' });
});

app.listen(PORT, () => {
  console.log(`AI Service listening on port ${PORT}`);
});
