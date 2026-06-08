const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = 3000;

// Middleware
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

app.use('/auth', authRoutes);
app.use('/api/files', filesRoutes);
app.use('/api/jobs', jobsRoutes);

// Health check
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