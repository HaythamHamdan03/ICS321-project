import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import session from "express-session";
import bodyParser from "body-parser";
import fs from 'fs';
import { promises as fsPromises } from 'fs';
import pg from "pg";


const app = express();
const port = 3000;

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Middleware
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'sport-sphere-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

const db = new pg.Client({
    user: "azizhamad",
    host: "localhost",
    database: "azizhamad",
    password: "Yaryar2003",
    port: 5433,
});
db.connect();
// User storage file path
const usersFilePath = path.join(__dirname, 'users.json');

// Helper functions for user persistence
const readUsers = async () => {
    try {
        const data = await fsPromises.readFile(usersFilePath, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        console.error('Error reading users file:', err);
        // If file doesn't exist, create it with default users
        const defaultUsers = [
            { username: 'admin', password: 'admin', fullname: 'Admin', email: 'admin@sportsphere.com', role: 'admin' },
            { username: 'haitham', password: 'haitham2003', fullname: 'Haitham', email: 'haitham@example.com', role: 'user' }
        ];
        await writeUsers(defaultUsers);
        return defaultUsers;
    }
};

const writeUsers = async (users) => {
    try {
        await fsPromises.writeFile(usersFilePath, JSON.stringify(users, null, 2));
    } catch (err) {
        console.error('Error writing users file:', err);
    }
};

// Authentication middleware
const checkAuth = (req, res, next) => {
    if (req.session.user || req.path === '/login' || req.path === '/signup') {
        next();
    } else {
        res.redirect('/login');
    }
};

// Apply auth middleware to all routes except login/signup
app.use(checkAuth);

// Routes
app.get("/", (req, res) => {
    if (req.session.user?.role === 'admin') {
        res.redirect('/index');
    } else {
        res.redirect('/dashboard');
    }
});

// Auth Routes
app.get("/login", (req, res) => {
    res.render("login", { error: req.query.error });
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;
    const users = await readUsers();
    const user = users.find(u => u.username === username && u.password === password);

    if (user) {
        req.session.user = user;
        if (user.role === 'admin') {
            res.redirect('/index');
        } else {
            res.redirect('/dashboard');
        }
    } else {
        res.render('login', { error: 'Invalid username or password' });
    }
});

app.get("/index", (req, res) => {
    res.render("index", { user: req.session.user });
});

app.get("/signup", (req, res) => {
    res.render("signup", { error: req.query.error });
});

app.post("/signup", async (req, res) => {
    const { fullname, email, username, password, 'confirm-password': confirmPassword } = req.body;

    if (password !== confirmPassword) {
        return res.render('signup', { error: 'Passwords do not match' });
    }

    const users = await readUsers();
    
    if (users.some(u => u.username === username)) {
        return res.render('signup', { error: 'Username already exists' });
    }

    const newUser = {
        username,
        password,
        fullname,
        email,
        role: 'user'
    };
    
    users.push(newUser);
    await writeUsers(users);

    req.session.user = newUser;
    res.redirect('/dashboard');
});

app.get("/logout", (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

// Admin User Management Routes
app.get("/admin/users", async (req, res) => {
    if (req.session.user?.role !== 'admin') {
        return res.redirect('/dashboard');
    }
    
    const users = await readUsers();
    res.render('adminUsers', { users, user: req.session.user });
});

app.post("/admin/promote", async (req, res) => {
    if (req.session.user?.role !== 'admin') {
        return res.sendStatus(403);
    }
    
    const { username } = req.body;
    const users = await readUsers();
    const userIndex = users.findIndex(u => u.username === username);
    
    if (userIndex !== -1) {
        users[userIndex].role = 'admin';
        await writeUsers(users);
        res.sendStatus(200);
    } else {
        res.sendStatus(404);
    }
});

// Protected Routes
app.get("/dashboard", (req, res) => {
    res.render("guest-dashboard", { user: req.session.user });
});

app.get("/add-tournament", (req, res) => {
    res.render("add-tournament", { user: req.session.user });
});

app.get("/add-team", (req, res) => {
    res.render("add-team", { user: req.session.user });
});

app.get("/tournaments", async (req, res) => {
    try {
      const result = await db.query("SELECT tr_id AS id, tr_name AS name FROM tournament");
      console.log("✅ Tournament data:", result.rows);
      res.render("tournaments", { tournaments: result.rows, user: req.session.user });
    } catch (err) {
      console.error("❌ DB error:", err.message);
      res.status(500).send("Database error");
    }
  });
  
  

app.get('/admintournaments', async (req, res) => {
    try {
        const result = await db.query("SELECT tr_id AS id, tr_name AS name FROM tournament ORDER BY tr_id");
        res.render('adminTournaments', { tournaments: result.rows, user: req.session.user });
    } catch (err) {
        console.error("❌ DB error (adminTournaments):", err.message);
        res.status(500).send("Database error");
    }
});


// Tournament Routes
app.delete('/tournaments/:id', (req, res) => {
    console.log(`Deleting tournament ${req.params.id}`);
    res.sendStatus(200);
});

app.get('/tournaments/:id/edit', (req, res) => {
    res.render("add-team", { tournamentId: req.params.id, user: req.session.user });
});

app.post('/teams', (req, res) => {
    console.log(req.body);
    res.redirect(`/tournaments/${req.body.tournamentId}`);
});

app.get('/tournaments/:id', (req, res) => {
    const dummyTournament = {
        name: 'Champions League',
        standings: [
            { id: 1, name: 'Liverpool', pl: 8, w: 7, d: 0, l: 1, pts: 21 },
            { id: 2, name: 'Barcelona', pl: 8, w: 6, d: 1, l: 1, pts: 19 },
            { id: 3, name: 'Arsenal', pl: 8, w: 6, d: 1, l: 1, pts: 19 },
            { id: 4, name: 'Inter Milan', pl: 8, w: 6, d: 1, l: 1, pts: 19 },
            { id: 5, name: 'Atletico Madrid', pl: 8, w: 6, d: 0, l: 2, pts: 18 },
        ],
        fixtures: [
            {
                dateISO: '2025-05-01',
                dateReadable: 'Thursday, 1 May',
                matches: [
                    { id: 101, team1: 'Lazio', team2: 'Roma', score: '2 - 1', statusClass: 'status-ft', statusText: 'FT' },
                ]
            },
            {
                dateISO: '2025-05-02',
                dateReadable: 'Friday, 2 May',
                matches: [
                    { id: 102, team1: 'Leeds', team2: 'Derby', score: '1 - 0', statusClass: 'status-ft', statusText: 'FT' },
                ]
            },
            {
                dateISO: '2025-05-07',
                dateReadable: 'Wednesday, 7 May',
                matches: [
                    { id: 103, team1: 'Juventus', team2: 'Napoli', score: '5:00 PM', statusClass: 'status-upcoming', statusText: 'Upcoming' },
                ]
            }
        ],
        topScorers: [
            { name: 'Mohamed Salah', team: 'Liverpool', teamId: 1, goals: 8 },
            { name: 'Erling Haaland', team: 'Man City', teamId: 2, goals: 7 },
            { name: 'Robert Lewandowski', team: 'Barcelona', teamId: 3, goals: 6 },
        ],
        topAssists: [
            { name: 'Kevin De Bruyne', team: 'Man City', teamId: 2, assists: 9 },
            { name: 'Bruno Fernandes', team: 'Man United', teamId: 4, assists: 7 },
            { name: 'Trent Alexander-Arnold', team: 'Liverpool', teamId: 1, assists: 6 },
        ]
    };
    res.render('tournamentDetails', { tournament: dummyTournament, user: req.session.user });
});


// Admin Tournament Details
app.get('/tournamnetDetails-admin/:id', (req, res) => {
    const dummyTournament = {
        name: 'Champions League',
        standings: [
            { id: 1, name: 'Liverpool', pl: 8, w: 7, d: 0, l: 1, pts: 21 },
            { id: 2, name: 'Barcelona', pl: 8, w: 6, d: 1, l: 1, pts: 19 },
            { id: 3, name: 'Arsenal', pl: 8, w: 6, d: 1, l: 1, pts: 19 },
            { id: 4, name: 'Inter Milan', pl: 8, w: 6, d: 1, l: 1, pts: 19 },
            { id: 5, name: 'Atletico Madrid', pl: 8, w: 6, d: 0, l: 2, pts: 18 },
        ],
        fixtures: [
            {
                dateISO: '2025-05-01',
                dateReadable: 'Thursday, 1 May',
                matches: [
                    { id: 101, team1: 'Lazio', team2: 'Roma', score: '2 - 1', statusClass: 'status-ft', statusText: 'FT' },
                ]
            },
            {
                dateISO: '2025-05-02',
                dateReadable: 'Friday, 2 May',
                matches: [
                    { id: 102, team1: 'Leeds', team2: 'Derby', score: '1 - 0', statusClass: 'status-ft', statusText: 'FT' },
                ]
            },
            {
                dateISO: '2025-05-07',
                dateReadable: 'Wednesday, 7 May',
                matches: [
                    { id: 103, team1: 'Juventus', team2: 'Napoli', score: '5:00 PM', statusClass: 'status-upcoming', statusText: 'Upcoming' },
                ]
            }
        ],
        topScorers: [
            { name: 'Mohamed Salah', team: 'Liverpool', teamId: 1, goals: 8 },
            { name: 'Erling Haaland', team: 'Man City', teamId: 2, goals: 7 },
            { name: 'Robert Lewandowski', team: 'Barcelona', teamId: 3, goals: 6 },
        ],
        topAssists: [
            { name: 'Kevin De Bruyne', team: 'Man City', teamId: 2, assists: 9 },
            { name: 'Bruno Fernandes', team: 'Man United', teamId: 4, assists: 7 },
            { name: 'Trent Alexander-Arnold', team: 'Liverpool', teamId: 1, assists: 6 },
        ]
    };
    res.render('tournamentDetails-admin', { tournament: dummyTournament, user: req.session.user });
});

// Team Routes
app.get('/teams/:id', (req, res) => {
    const team = {
        id: 1,
        name: 'Liverpool FC',
        manager: 'Jürgen Klopp',
        coach: 'Pep Lijnders',
        captain: 'Virgil van Dijk',
        tournaments: ['Champions League', 'FA Cup'],
        players: {
            Goalkeepers: [{ name: 'Alisson Becker', jersey: 1, role: 'Player' }],
            Defenders: [{ name: 'Virgil van Dijk', jersey: 4, role: 'Captain' }],
            Midfielders: [{ name: 'Fabinho', jersey: 3, role: 'Player' }],
            Forwards: [{ name: 'Mohamed Salah', jersey: 11, role: 'Player' }]
        },
        stats: {
            goals: [
                { name: 'Mohamed Salah', pos: 'Forward', jersey: 11, value: 8 },
                { name: 'Fabinho', pos: 'Midfielder', jersey: 3, value: 1 }
            ],
            assists: [
                { name: 'Mohamed Salah', pos: 'Forward', jersey: 11, value: 5 },
                { name: 'Fabinho', pos: 'Midfielder', jersey: 3, value: 3 }
            ],
            yellow: [
                { name: 'Mohamed Salah', pos: 'Forward', jersey: 11, value: 1 },
                { name: 'Fabinho', pos: 'Midfielder', jersey: 3, value: 3 }
            ],
            red: [
                {
                    name: 'Fabinho',
                    pos: 'Midfielder',
                    jersey: 3,
                    value: 2,
                    details: [
                        { date: '2025-04-20', opp: 'Barcelona', comp: 'Champions League' },
                        { date: '2025-03-15', opp: 'Real Madrid', comp: 'La Liga' }
                    ]
                },
                {
                    name: 'Andy Robertson',
                    pos: 'Defender',
                    jersey: 26,
                    value: 1,
                    details: [
                        { date: '2025-02-10', opp: 'Man United', comp: 'FA Cup' }
                    ]
                }
            ]
        },
        matches: [
            {
                id: 101,
                dateISO: '2025-05-01',
                dateReadable: 'Thursday, 1 May',
                tournament: 'Premier League',
                team1: 'Liverpool',
                team2: 'Arsenal',
                score: '2 - 1',
                statusClass: 'status-ft',
                statusText: 'FT'
            },
            {
                id: 102,
                dateISO: '2025-05-06',
                dateReadable: 'Tuesday, 6 May',
                tournament: 'Champions League',
                team1: 'Liverpool',
                team2: 'Inter Milan',
                score: '5:00 PM',
                statusClass: 'status-upcoming',
                statusText: 'Upcoming'
            }
        ]
    };
    res.render('teamDetails', { team, user: req.session.user });
});

// Admin Team Details
app.get('/teamsDetails/:id', (req, res) => {
    const team = {
        id: 1,
        name: 'Liverpool FC',
        manager: 'Jürgen Klopp',
        coach: 'Pep Lijnders',
        captain: 'Virgil van Dijk',
        tournaments: ['Champions League', 'FA Cup'],
        players: {
            Goalkeepers: [{ name: 'Alisson Becker', jersey: 1, role: 'Player' }],
            Defenders: [{ name: 'Virgil van Dijk', jersey: 4, role: 'Captain' }],
            Midfielders: [{ name: 'Fabinho', jersey: 3, role: 'Player' }],
            Forwards: [{ name: 'Mohamed Salah', jersey: 11, role: 'Player' }]
        },
        stats: {
            goals: [
                { name: 'Mohamed Salah', pos: 'Forward', jersey: 11, value: 8 },
                { name: 'Fabinho', pos: 'Midfielder', jersey: 3, value: 1 }
            ],
            assists: [
                { name: 'Mohamed Salah', pos: 'Forward', jersey: 11, value: 5 },
                { name: 'Fabinho', pos: 'Midfielder', jersey: 3, value: 3 }
            ],
            yellow: [
                { name: 'Mohamed Salah', pos: 'Forward', jersey: 11, value: 1 },
                { name: 'Fabinho', pos: 'Midfielder', jersey: 3, value: 3 }
            ],
            red: [
                {
                    name: 'Fabinho',
                    pos: 'Midfielder',
                    jersey: 3,
                    value: 2,
                    details: [
                        { date: '2025-04-20', opp: 'Barcelona', comp: 'Champions League' },
                        { date: '2025-03-15', opp: 'Real Madrid', comp: 'La Liga' }
                    ]
                },
                {
                    name: 'Andy Robertson',
                    pos: 'Defender',
                    jersey: 26,
                    value: 1,
                    details: [
                        { date: '2025-02-10', opp: 'Man United', comp: 'FA Cup' }
                    ]
                }
            ]
        },
        matches: [
            {
                id: 101,
                dateISO: '2025-05-01',
                dateReadable: 'Thursday, 1 May',
                tournament: 'Premier League',
                team1: 'Liverpool',
                team2: 'Arsenal',
                score: '2 - 1',
                statusClass: 'status-ft',
                statusText: 'FT'
            },
            {
                id: 102,
                dateISO: '2025-05-06',
                dateReadable: 'Tuesday, 6 May',
                tournament: 'Champions League',
                team1: 'Liverpool',
                team2: 'Inter Milan',
                score: '5:00 PM',
                statusClass: 'status-upcoming',
                statusText: 'Upcoming'
            }
        ]
    };
    res.render('teamDetails-admin', { team, user: req.session.user });
});

// Match Route
app.get('/matches/:id', (req, res) => {
    const dummyMatch = {
        id: req.params.id,
        team1: { name: 'CCM', captain: 'Majid', goalkeeper: 'Ahmed' },
        team2: { name: 'KBS', captain: 'Saeed', goalkeeper: 'Saeed' },
        tournament: 'Faculty Tournament',
        stage: 'Group Stage',
        date: 'May 14, 2025',
        venue: 'Main Stadium',
        time: '5:00 PM',
        isUpcoming: false,
        score: '2 - 1',
        resultMeta: {
            status: 'FT',
            method: 'Normal',
            motm: 'Ahmed (1007)',
            audience: 5113,
            stoppage: ['1st – 131s', '2nd – 242s']
        },
        goals: {
            team1: ["⚽ 72' Ahmed", "⚽ 92' Ahmed"],
            team2: ["⚽ 77' Vinícius"]
        },
        bookings: {
            team1: ["76' 🟥 Majid — Sent Off"],
            team2: ["36' 🟨 Saeed — Not Sent Off"]
        },
        subs: {
            team1: [{ in: 'Andre Schuerrle', out: 'Eden Hazard', time: "90'" }],
            team2: [{ in: 'Thomas Müller', out: 'Mario Götze', time: "75'" }]
        }
    };
    res.render('matchDetails', { match: dummyMatch, user: req.session.user });
});

// Start the server
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});