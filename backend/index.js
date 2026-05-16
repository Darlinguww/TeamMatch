// ESTO ES SIMPLEMENTE UN ARCHIVO DE PRUEBA. BORRAR DESPUÉS 
import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Ruta de prueba para confirmar que Nginx está redirigiendo bien
app.get('/api/test', (req, res) => {
    res.json({ 
        status: 'success', 
        message: '¡El Backend de TeamMatch está conectado a Nginx correctamente!' 
    });
});

app.listen(PORT, () => {
    console.log(`🚀 Backend corriendo en el puerto ${PORT}`);
});