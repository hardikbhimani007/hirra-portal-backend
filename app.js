const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const http = require('http');
const { initSocket } = require('./socket');

const app = express();

// If behind a proxy (cPanel/Apache/Nginx), trust it for correct protocol/IP
app.set('trust proxy', 1);

// ✅ CORS: explicitly allow your web app origin
app.use(cors({
  origin: "*", 
  credentials: false,
}));

// Static uploads (add CORS headers if you really need cross-origin file loads)
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  setHeaders: (res) => {
    res.set('Access-Control-Allow-Origin', 'https://hirra.remotedev.pro');
    res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Cross-Origin-Resource-Policy', 'cross-origin');
    res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
  }
}));

app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// routes
app.use('/api/users', require('./Routes/user'));
app.use('/api/jobs', require('./Routes/jobs'));
app.use('/api/jobs/saved', require('./Routes/jobsSaved'));
app.use('/api/jobs/applications', require('./Routes/applications'));
app.use('/api/jobs/abusereport', require('./Routes/jobAbuseReports'));
app.use('/api/users/abusereport', require('./Routes/UserAbuseReport'));
app.use('/api/admin', require('./Routes/admin'));
app.use('/api/admin/categories', require('./Routes/categories'));
app.use('/api/messages', require('./Routes/messages'));

// simple health endpoint (handy for proxy checks)
app.get('/healthz', (req, res) => res.json({ ok: true }));

// ✅ Create ONE server and attach Socket.IO to it
const server = http.createServer(app);
initSocket(server); // ensure your init sets path/cors on the IO instance

const PORT = process.env.PORT || 5001;
const HOST = '0.0.0.0';

// ❗ Start the *same* server that IO is attached to
server.listen(PORT, HOST, () => {
  console.log(`HTTP & Socket.IO listening on http://${HOST}:${PORT}`);
});
