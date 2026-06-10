const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { authRequired } = require('./middleware/auth');  // ← NUEVO

const app = express();
const PORT = 3000;

// Middleware básico
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

// Template engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- Rutas ---
const authRoutes = require('./routes/auth');
const filesRoutes = require('./routes/files');
const jobsRoutes = require('./routes/jobs');

// /auth NO requiere JWT (es donde se obtiene)
app.use('/auth', authRoutes);

// El resto SÍ requiere JWT válido
app.use('/api/files', authRequired, filesRoutes);
app.use('/api/jobs', authRequired, jobsRoutes);

// Health check sin auth
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'web-node' });
});

// Páginas del frontend
app.get('/', (req, res) => res.render('login'));
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/files', (req, res) => res.render('files'));
app.get('/photos', (req, res) => res.render('photos'));
app.get('/jobs', (req, res) => res.render('jobs'));

app.listen(PORT, () => {
    console.log(`Web Server corriendo en http://localhost:${PORT}`);
});