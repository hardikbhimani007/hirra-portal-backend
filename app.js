const express = require('express');
require('dotenv').config();
const cors = require('cors');
const path = require('path');
const http = require("http");
const { initSocket } = require("./socket");

const app = express();
const server = http.createServer(app);

const io = initSocket(server);

app.use(cors({
    origin: '*',
    credentials: true
}));

app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
    setHeaders: (res, filePath) => {
        res.set('Access-Control-Allow-Origin', '*');
        res.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.set('Access-Control-Allow-Headers', 'Content-Type');
        res.set('Cross-Origin-Resource-Policy', 'cross-origin');
        res.set('Cross-Origin-Embedder-Policy', 'unsafe-none');
    }
}));
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

app.use(express.json());

//routes
const userRoutes = require('./Routes/user');
const Jobs = require('./Routes/jobs');
const Jobs_Saved = require('./Routes/jobsSaved');
const applications = require('./Routes/applications');
const jobAbuseReports = require('./Routes/jobAbuseReports');
const UserAbuseReport = require('./Routes/UserAbuseReport');
const adminReport = require('./Routes/admin');
const Categories = require('./Routes/categories');

app.use("/api/users", userRoutes)
app.use("/api/jobs", Jobs)
app.use("/api/jobs/saved", Jobs_Saved)
app.use("/api/jobs/applications", applications)
app.use("/api/jobs/abusereport", jobAbuseReports)
app.use("/api/users/abusereport", UserAbuseReport)
app.use("/api/admin", adminReport)
app.use("/api/admin/categories", Categories)
//

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
