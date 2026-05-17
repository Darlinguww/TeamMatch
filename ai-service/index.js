// ARCHIVO DE PRUEBA. BORRAR.
import express from 'express';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8000; // Usamos el 3001 para no chocar con el backend

app.use(express.json());

// Prueba rápida de que el servicio está vivo
app.get('/health', (req, res) => {
    res.json({ status: 'AI Service is running' });
});

app.listen(PORT, () => {
    console.log(`🧠 AI Service escuchando en el puerto ${PORT}`);
    console.log('Listo para procesar matchmaking con Gemini y Neo4j');
});