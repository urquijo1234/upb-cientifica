const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const { authRequired } = require('./middleware/auth');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, '..', 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Rutas sin auth
const authRoutes = require('./routes/auth');
app.use('/auth', authRoutes);

// Rutas con auth
const filesRoutes    = require('./routes/files');
const jobsRoutes     = require('./routes/jobs');
const photosRoutes   = require('./routes/photos');
const streamingRoutes = require('./routes/streaming');
const backupsRoutes  = require('./routes/backups');

app.use('/api/files',     authRequired, filesRoutes);
app.use('/api/jobs',      authRequired, jobsRoutes);
app.use('/api/photos',    authRequired, photosRoutes);
app.use('/api/streaming', authRequired, streamingRoutes);
app.use('/api/backups',   authRequired, backupsRoutes);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'web-node' }));

// Páginas
app.get('/',          (req, res) => res.render('login'));
app.get('/dashboard', (req, res) => res.render('dashboard'));
app.get('/files',     (req, res) => res.render('files'));
app.get('/photos',    (req, res) => res.render('photos'));
app.get('/streaming', (req, res) => res.render('streaming'));
app.get('/backups', (req, res) => res.render('backups'));
app.get('/jobs',      (req, res) => res.render('jobs'));

app.listen(PORT, () => {
    console.log(`Web Server corriendo en http://localhost:${PORT}`);
});