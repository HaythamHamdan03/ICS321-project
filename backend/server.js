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
app.use(express.json());
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
import cron from 'node-cron';
import nodemailer from 'nodemailer';

// Set up the mail transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: '3zizo3.ah@gmail.com',
    pass: 'kptwfwonxsxlbkmo'
  }
});

// Main logic in a function so you can re-use it
async function sendMatchReminders() {
  console.log('Running match reminder task...');
  try {
    const today = new Date().toISOString().split('T')[0];

    const matchQuery = await db.query(`
      SELECT 
        m.match_no, m.play_date, m.team_id1, m.team_id2,
        t1.team_name AS team1, t2.team_name AS team2
      FROM MATCH_PLAYED m
      JOIN TEAM t1 ON m.team_id1 = t1.team_id
      JOIN TEAM t2 ON m.team_id2 = t2.team_id
      WHERE m.play_date = $1
    `, [today]);

    for (const match of matchQuery.rows) {
      const { team_id1, team_id2, team1, team2, play_date } = match;

      const emailsRes = await db.query(`
        SELECT DISTINCT p.email
        FROM TEAM_PLAYER tp
        JOIN PERSON p ON tp.player_id = p.kfupm_id
        WHERE tp.team_id IN ($1, $2)
      `, [team_id1, team_id2]);

      const emails = emailsRes.rows.map(row => row.email).filter(Boolean);

      if (emails.length > 0) {
        await transporter.sendMail({
          from: '3zizo3.ah@gmail.com',
          to: emails,
          subject: `Match Reminder: ${team1} vs ${team2} Today`,
          html: `
            <h3>Don't forget!</h3>
            <p>You have a match scheduled today:</p>
            <p><strong>${team1}</strong> vs <strong>${team2}</strong></p>
            <p>Match Date: ${play_date}</p>
            <p>Good luck!</p>
          `
        });

        console.log(`📧 Sent match reminder to ${emails.length} players`);
      }
    }
  } catch (err) {
    console.error("Failed to send reminder emails:", err);
  }
}

// Schedule it daily at 8 AM
cron.schedule('0 8 * * *', sendMatchReminders);

// ✅ Call manually now for testing
// sendMatchReminders();


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

// Updated route for index page
app.get("/index", async (req, res) => {
    try {
        // Get current date
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        // Generate dates for scrolling (20 days before and 20 days after today)
        const dates = [];
        for (let i = -20; i <= 20; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const day = date.getDate();
            const month = date.toLocaleString('default', { month: 'short' });
            const weekday = date.toLocaleString('default', { weekday: 'short' });
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format for DB query
            
            dates.push({
                display: `${weekday} ${day}`,
                month: month,
                full: formattedDate,
                isToday: i === 0
            });
        }
        
        // Get matches for today from database
        const matchesQuery = `
            SELECT 
                mp.match_no, 
                mp.play_date, 
                mp.goal_score, 
                mp.audience,
                mp.decided_by,
                mp.results,
                t1.team_id as team_id1, 
                t1.team_name as team1_name, 
                t2.team_id as team_id2, 
                t2.team_name as team2_name,
                tr.tr_name as tournament_name,
                v.venue_name
            FROM 
                MATCH_PLAYED mp
                JOIN TEAM t1 ON mp.team_id1 = t1.team_id
                JOIN TEAM t2 ON mp.team_id2 = t2.team_id
                JOIN VENUE v ON mp.venue_id = v.venue_id
                JOIN TOURNAMENT_TEAM tt1 ON (t1.team_id = tt1.team_id)
                JOIN TOURNAMENT_TEAM tt2 ON (t2.team_id = tt2.team_id AND tt1.tr_id = tt2.tr_id)
                JOIN TOURNAMENT tr ON tt1.tr_id = tr.tr_id
            WHERE 
                mp.play_date = $1
            ORDER BY 
                mp.match_no`;
        
        const result = await db.query(matchesQuery, [formattedToday]);
        
        res.render("index", { 
            user: req.session.user,
            dates: dates,
            matches: result.rows,
            selectedDate: formattedToday
        });
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).send("Error fetching match data");
    }
});
app.get("/api/matches/:date", async (req, res) => {
    const selectedDate = req.params.date;
  
    try {
      const matchesQuery = `
        SELECT 
            mp.match_no, 
            mp.play_date, 
            mp.goal_score, 
            mp.audience,
            mp.decided_by,
            mp.results,
            t1.team_id as team_id1, 
            t1.team_name as team1_name, 
            t2.team_id as team_id2, 
            t2.team_name as team2_name,
            tr.tr_name as tournament_name,
            v.venue_name
        FROM 
            MATCH_PLAYED mp
            JOIN TEAM t1 ON mp.team_id1 = t1.team_id
            JOIN TEAM t2 ON mp.team_id2 = t2.team_id
            JOIN VENUE v ON mp.venue_id = v.venue_id
            JOIN TOURNAMENT_TEAM tt1 ON (t1.team_id = tt1.team_id)
            JOIN TOURNAMENT_TEAM tt2 ON (t2.team_id = tt2.team_id AND tt1.tr_id = tt2.tr_id)
            JOIN TOURNAMENT tr ON tt1.tr_id = tr.tr_id
        WHERE 
            mp.play_date = $1
        ORDER BY 
            mp.match_no
      `;
  
      const result = await db.query(matchesQuery, [selectedDate]);
      res.json(result.rows);
    } catch (err) {
      console.error("Error fetching matches by date:", err);
      res.status(500).json({ error: "Failed to fetch matches." });
    }
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
app.get("/dashboard", async(req, res) => {
    try {
        // Get current date
        const today = new Date();
        const formattedToday = today.toISOString().split('T')[0]; // Format as YYYY-MM-DD
        
        // Generate dates for scrolling (20 days before and 20 days after today)
        const dates = [];
        for (let i = -20; i <= 20; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            
            const day = date.getDate();
            const month = date.toLocaleString('default', { month: 'short' });
            const weekday = date.toLocaleString('default', { weekday: 'short' });
            const formattedDate = date.toISOString().split('T')[0]; // YYYY-MM-DD format for DB query
            
            dates.push({
                display: `${weekday} ${day}`,
                month: month,
                full: formattedDate,
                isToday: i === 0
            });
        }
        
        // Get matches for today from database
        const matchesQuery = `
            SELECT 
                mp.match_no, 
                mp.play_date, 
                mp.goal_score, 
                mp.audience,
                mp.decided_by,
                mp.results,
                t1.team_id as team_id1, 
                t1.team_name as team1_name, 
                t2.team_id as team_id2, 
                t2.team_name as team2_name,
                tr.tr_name as tournament_name,
                v.venue_name
            FROM 
                MATCH_PLAYED mp
                JOIN TEAM t1 ON mp.team_id1 = t1.team_id
                JOIN TEAM t2 ON mp.team_id2 = t2.team_id
                JOIN VENUE v ON mp.venue_id = v.venue_id
                JOIN TOURNAMENT_TEAM tt1 ON (t1.team_id = tt1.team_id)
                JOIN TOURNAMENT_TEAM tt2 ON (t2.team_id = tt2.team_id AND tt1.tr_id = tt2.tr_id)
                JOIN TOURNAMENT tr ON tt1.tr_id = tr.tr_id
            WHERE 
                mp.play_date = $1
            ORDER BY 
                mp.match_no`;
        
        const result = await db.query(matchesQuery, [formattedToday]);
        
        res.render("guest-dashboard", { 
            user: req.session.user,
            dates: dates,
            matches: result.rows,
            selectedDate: formattedToday
        });
    } catch (error) {
        console.error("Error fetching matches:", error);
        res.status(500).send("Error fetching match data");
    }
});


app.get("/add-tournament", (req, res) => {
    res.render("add-tournament", { user: req.session.user });
});
app.post("/add-tournament", async (req, res) => {
    const { name, startDate, endDate } = req.body;

    try {
        // Generate new unique tournament ID
        const maxIdRes = await db.query(`SELECT MAX(tr_id) AS max FROM TOURNAMENT`);
        const newId = (Number(maxIdRes.rows[0].max) || 0) + 1;

        await db.query(`
            INSERT INTO TOURNAMENT (tr_id, tr_name, start_date, end_date)
            VALUES ($1, $2, $3, $4)
        `, [newId, name, startDate, endDate]);

        res.status(200).send("Tournament created");
    } catch (error) {
        console.error("Failed to add tournament:", error);
        res.status(500).send("Error saving tournament to database");
    }
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
app.delete('/admintournaments/:id', async (req, res) => {
    const tournamentId = req.params.id;
  
    try {
      // Delete from dependent tables first
      await db.query(`DELETE FROM TEAM_SUPPORT WHERE tr_id = $1`, [tournamentId]);
      await db.query(`DELETE FROM TEAM_PLAYER WHERE tr_id = $1`, [tournamentId]);
      await db.query(`DELETE FROM TOURNAMENT_TEAM WHERE tr_id = $1`, [tournamentId]);
  
      // Then delete the tournament
      await db.query(`DELETE FROM TOURNAMENT WHERE tr_id = $1`, [tournamentId]);
  
      res.status(200).json({ message: 'Tournament deleted', redirect: '/admintournaments' });
    } catch (error) {
      console.error('Error deleting tournament:', error);
      res.status(500).send('Server error');
    }
  });
  
  

  app.get('/admintournaments/:id/add-team', (req, res) => {

    res.render("add-team", { tournamentId: req.params.id, user: req.session.user });
});

// Route to handle the form submission
app.post('/admintournaments/:id/add-team', async (req, res) => {
    try {
        const tournamentId = req.params.id;
        
        // 1. Generate a new team ID (you might want to use a better method in production)
        const newTeamId = Date.now() % 10000;
        
        // 2. Insert the new team into TEAM table
        await db.query(
            'INSERT INTO TEAM (team_id, team_name) VALUES ($1, $2)',
            [newTeamId, req.body.teamName]
        );
        
        // 3. Insert into TOURNAMENT_TEAM table with initial stats
        await db.query(
            'INSERT INTO TOURNAMENT_TEAM (team_id, tr_id, team_group, match_played, won, draw, lost, goal_for, goal_against, goal_diff, points, group_position) VALUES ($1, $2, $3, 0, 0, 0, 0, 0, 0, 0, 0, 1)',
            [newTeamId, tournamentId, req.body.teamGroup] // Using the selected team group
        );
        
        // 4. Process manager and captain as PERSON and then connect to TEAM_SUPPORT
        // Process manager
        const managerId = Date.now() % 10000 + 1;
        await db.query(
            'INSERT INTO PERSON (kfupm_id, name, date_of_birth) VALUES ($1, $2, CURRENT_DATE)',
            [managerId, req.body.managerName]
        );
        
        // Add manager as coach
        await db.query(
            'INSERT INTO TEAM_SUPPORT (support_id, team_id, tr_id, support_type) VALUES ($1, $2, $3, $4)',
            [managerId, newTeamId, tournamentId, 'CH']
        );
        
        // Process captain
        const captainId = Date.now() % 10000 + 2;
        await db.query(
            'INSERT INTO PERSON (kfupm_id, name, date_of_birth) VALUES ($1, $2, CURRENT_DATE)',
            [captainId, req.body.captainName]
        );
        
        // 5. Process players by position
        // Get all positions (goalkeepers, defenders, midfielders, forwards)
        const positions = [
            { position: 'GK', players: req.body.goalkeepers, jerseys: req.body.goalkeeperJerseys },
            { position: 'DF', players: req.body.defenders, jerseys: req.body.defenderJerseys },
            { position: 'MF', players: req.body.midfielders, jerseys: req.body.midfielderJerseys },
            { position: 'FD', players: req.body.forwards, jerseys: req.body.forwardJerseys }
        ];
        
        // Process each position and player
        for (const pos of positions) {
            if (Array.isArray(pos.players)) {
                for (let i = 0; i < pos.players.length; i++) {
                    const playerId = Date.now() % 10000 + 3 + i + Math.floor(Math.random() * 1000);
                    const jerseyNo = pos.jerseys[i];
                    
                    // Add player to PERSON table
                    await db.query(
                        'INSERT INTO PERSON (kfupm_id, name, date_of_birth) VALUES ($1, $2, CURRENT_DATE)',
                        [playerId, pos.players[i]]
                    );
                    
                    // Add player to PLAYER table
                    await db.query(
                        'INSERT INTO PLAYER (player_id, jersey_no, position_to_play) VALUES ($1, $2, $3)',
                        [playerId, jerseyNo, pos.position]
                    );
                    
                    // Connect player to team and tournament
                    await db.query(
                        'INSERT INTO TEAM_PLAYER (player_id, team_id, tr_id) VALUES ($1, $2, $3)',
                        [playerId, newTeamId, tournamentId]
                    );
                }
            }
        }
        
        // Redirect to tournament details page
        res.json({ success: true, redirect: `/tournamnetDetails-admin/${tournamentId}` });
        
    } catch (error) {
        console.error('Error adding team:', error);
        res.status(500).json({ error: 'Failed to add team', details: error.message });
    }
});
app.get('/admintournaments/:id/create-match', async (req, res) => {
    const tournamentId = req.params.id;
  
    try {
      const teamsRes = await db.query(`
        SELECT t.team_id, t.team_name
        FROM TEAM t
        JOIN TOURNAMENT_TEAM tt ON t.team_id = tt.team_id
        WHERE tt.tr_id = $1
      `, [tournamentId]);
  
      const venuesRes = await db.query(`SELECT * FROM VENUE WHERE venue_status = 'Y'`);
  
      res.render('create-match', {
        user: req.session.user,
        tournamentId,
        teams: teamsRes.rows,
        venues: venuesRes.rows
      });
    } catch (error) {
      console.error('Error rendering match form:', error);
      res.status(500).send("Error loading match creation form");
    }
  });
  app.post('/admintournaments/:id/create-match', async (req, res) => {
    const trId = req.params.id;
    const {
      play_date,
      team1_id,
      team2_id,
      venue_id,
      captain1_id,
      captain2_id,
      player_of_match,
      audience,
      stop1_sec,
      stop2_sec,
      goal_score,
      results,
      decided_by
    } = req.body;
  
    try {
      const maxMatch = await db.query('SELECT MAX(match_no) as max FROM MATCH_PLAYED');
      const newMatchNo = Number((maxMatch.rows[0].max || 0)) + 1;
  
      // 1. Insert match
      await db.query(`
        INSERT INTO MATCH_PLAYED (
          match_no, play_stage, play_date, team_id1, team_id2, results, decided_by,
          goal_score, venue_id, audience, player_of_match, stop1_sec, stop2_sec
        ) VALUES ($1, 'G', $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      `, [
        newMatchNo,
        play_date,
        team1_id,
        team2_id,
        results,
        decided_by,
        goal_score,
        venue_id,
        audience,
        player_of_match,
        stop1_sec,
        stop2_sec
      ]);
  
      // 2. Insert match captains
      await db.query(`INSERT INTO MATCH_CAPTAIN (match_no, team_id, player_captain) VALUES ($1, $2, $3)`,
        [newMatchNo, team1_id, captain1_id]);
      await db.query(`INSERT INTO MATCH_CAPTAIN (match_no, team_id, player_captain) VALUES ($1, $2, $3)`,
        [newMatchNo, team2_id, captain2_id]);
  
      // 3. Parse score (e.g. "2-1")
      const [score1, score2] = goal_score.split('-').map(Number);
  
      // 4. Update team 1 stats
      let win1 = 0, draw1 = 0, loss1 = 0, pts1 = 0;
      if (results === 'WIN') {
        win1 = 1; pts1 = 3;
      } else if (results === 'DRAW') {
        draw1 = 1; pts1 = 1;
      } else {
        loss1 = 1;
      }
  
      await db.query(`
        UPDATE TOURNAMENT_TEAM
        SET 
          match_played = match_played + 1,
          won = won + $1,
          draw = draw + $2,
          lost = lost + $3,
          goal_for = goal_for + $4,
          goal_against = goal_against + $5,
          goal_diff = goal_for + $4 - (goal_against + $5),
          points = points + $6
        WHERE team_id = $7 AND tr_id = $8
      `, [win1, draw1, loss1, score1, score2, pts1, team1_id, trId]);
  
      // 5. Update team 2 stats (inverse)
      let win2 = 0, draw2 = 0, loss2 = 0, pts2 = 0;
      if (results === 'LOSS') {
        win2 = 1; pts2 = 3;
      } else if (results === 'DRAW') {
        draw2 = 1; pts2 = 1;
      } else {
        loss2 = 1;
      }
  
      await db.query(`
        UPDATE TOURNAMENT_TEAM
        SET 
          match_played = match_played + 1,
          won = won + $1,
          draw = draw + $2,
          lost = lost + $3,
          goal_for = goal_for + $4,
          goal_against = goal_against + $5,
          goal_diff = goal_for + $4 - (goal_against + $5),
          points = points + $6
        WHERE team_id = $7 AND tr_id = $8
      `, [win2, draw2, loss2, score2, score1, pts2, team2_id, trId]);
  
      res.redirect(`/tournamnetDetails-admin/${trId}`);
    } catch (err) {
      console.error("Error creating match:", err);
      res.status(500).send("Failed to create match");
    }
  });
  
  
  // PLAYER API
  app.get('/api/players/:teamId', async (req, res) => {
    try {
      const { teamId } = req.params;
      const result = await db.query(`
        SELECT p.player_id, per.name
        FROM PLAYER p
        JOIN PERSON per ON p.player_id = per.kfupm_id
        JOIN TEAM_PLAYER tp ON tp.player_id = p.player_id
        WHERE tp.team_id = $1
      `, [teamId]);
  
      res.json(result.rows);
    } catch (err) {
      console.error("Failed to fetch players:", err);
      res.status(500).json({ error: "Could not load players" });
    }
  });
  
  // Route to render the join team form
// GET join team form
app.get('/join-team', async (req, res) => {
    
    const playerName = req.session.user.fullname;
    
    try {
      // Get all tournaments based on your database schema
      const tournamentsRes = await db.query(`
        SELECT tr_id, tr_name 
        FROM TOURNAMENT
        ORDER BY tr_name
      `);
      
      // Get player's existing requests based on your PLAYER_REQUEST table
      const requestsRes = await db.query(`
        SELECT 
          pr.request_id,
          pr.tr_id,
          tr.tr_name,
          pr.team_id,
          t.team_name,
          pr.jersey_no,
          pr.position_to_play,
          pr.request_status
        FROM PLAYER_REQUEST pr
        JOIN TEAM t ON pr.team_id = t.team_id
        JOIN TOURNAMENT tr ON pr.tr_id = tr.tr_id
        WHERE pr.player_name = $1
        ORDER BY pr.request_id DESC
      `, [playerName]);
    
      res.render('join-team', {
        user: req.session.user,
        tournaments: tournamentsRes.rows,
        requests: requestsRes.rows
      });
    } catch (err) {
      console.error("Failed to load join form:", err);
      res.status(500).send("Failed to load form");
    }
  });
  
  // POST join team form - Updated to handle JSON requests
  app.post('/join-team', async (req, res) => {
    // Check if user is logged in
    if (!req.session.user) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const { tr_id, team_id, jersey_no, position_to_play } = req.body;
    const player_name = req.session.user.fullname;
    
    // Validate input
    if (!tr_id || !team_id || !jersey_no || !position_to_play) {
      return res.status(400).json({ message: "All fields are required" });
    }
    
    // Validate jersey number
    if (isNaN(jersey_no) || jersey_no < 1 || jersey_no > 99) {
      return res.status(400).json({ message: "Jersey number must be between 1 and 99" });
    }
    
    // Validate position based on your PLAYING_POSITION table
    const validPositions = ['GK', 'DF', 'MF', 'FD'];
    if (!validPositions.includes(position_to_play)) {
      return res.status(400).json({ message: "Invalid position" });
    }
    
    try {
      // Verify tournament exists
      const tournamentCheck = await db.query(`
        SELECT tr_id FROM TOURNAMENT WHERE tr_id = $1
      `, [tr_id]);
      
      if (tournamentCheck.rows.length === 0) {
        return res.status(400).json({ message: "Tournament not found" });
      }
      
      // Verify team exists and is part of the tournament
      const teamCheck = await db.query(`
        SELECT tt.team_id 
        FROM TOURNAMENT_TEAM tt
        WHERE tt.team_id = $1 AND tt.tr_id = $2
      `, [team_id, tr_id]);
      
      if (teamCheck.rows.length === 0) {
        return res.status(400).json({ message: "Team not found in this tournament" });
      }
      
      // Check if player already has a request for this team in this tournament
      const existingRequest = await db.query(`
        SELECT * FROM PLAYER_REQUEST
        WHERE player_name = $1 AND team_id = $2 AND tr_id = $3
      `, [player_name, team_id, tr_id]);
      
      if (existingRequest.rows.length > 0) {
        return res.status(400).json({ 
          message: "You already have a request for this team in this tournament" 
        });
      }
      
      // Insert the request using your PLAYER_REQUEST table structure
      await db.query(`
        INSERT INTO PLAYER_REQUEST 
          (player_name, jersey_no, position_to_play, team_id, tr_id, request_status)
        VALUES ($1, $2, $3, $4, $5, 'PENDING')
      `, [player_name, jersey_no, position_to_play, team_id, tr_id]);
      
      // Return success response for API
      return res.status(201).json({ message: "Join request submitted successfully" });
    } catch (err) {
      console.error("Failed to submit join request:", err);
      return res.status(500).json({ message: "Failed to submit join request" });
    }
  });
  
  // API endpoint to get teams for a tournament based on your database schema
  app.get('/api/teams/:trId', async (req, res) => {
    try {
      const { trId } = req.params;
      
      // Validate tournament ID
      if (!trId || isNaN(parseInt(trId))) {
        return res.status(400).json({ error: "Invalid tournament ID" });
      }
      
      // Get teams for the tournament using TOURNAMENT_TEAM table
      const teamsRes = await db.query(`
        SELECT t.team_id, t.team_name
        FROM TEAM t
        JOIN TOURNAMENT_TEAM tt ON t.team_id = tt.team_id
        WHERE tt.tr_id = $1
        ORDER BY t.team_name
      `, [trId]);
      
      res.json(teamsRes.rows);
    } catch (err) {
      console.error("Failed to fetch teams:", err);
      res.status(500).json({ error: "Failed to fetch teams" });
    }
  });
  
  // ROUTE LOGIC FOR /admin-requests
app.get('/admin-requests', async (req, res) => {
    try {
      // Check if user is logged in and is an admin
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.redirect('/login');
      }
  
      const pendingRes = await db.query(`
        SELECT 
          pr.request_id, pr.player_name, pr.jersey_no, pr.position_to_play, pr.tr_id, pr.team_id,
          pr.request_status, t.team_name, tr.tr_name
        FROM PLAYER_REQUEST pr
        JOIN TEAM t ON pr.team_id = t.team_id
        JOIN TOURNAMENT tr ON pr.tr_id = tr.tr_id
        WHERE pr.request_status = 'PENDING'
        ORDER BY pr.request_id DESC
      `);
  
      res.render('admin-requests', {
        user: req.session.user,
        requests: pendingRes.rows
      });
    } catch (err) {
      console.error("Failed to load admin requests page:", err);
      res.status(500).send("Error loading requests");
    }
  });
  
  // Handle approval
  app.post('/admin-requests/:requestId/approve', async (req, res) => {
    try {
      const { requestId } = req.params;
      
      // Check if user is logged in and is an admin
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send("Unauthorized");
      }
  
      // Update the request status
      await db.query(`
        UPDATE PLAYER_REQUEST SET request_status = 'APPROVED' WHERE request_id = $1
      `, [requestId]);
      
      // Get request details
      const requestDetails = await db.query(`
        SELECT * FROM PLAYER_REQUEST WHERE request_id = $1
      `, [requestId]);
      
      const { player_name, jersey_no, position_to_play, team_id, tr_id } = requestDetails.rows[0];
  
      // Generate a new KFUPM ID for the PERSON table
      const newKfupmIdRes = await db.query(`SELECT MAX(kfupm_id) + 2 AS new_id FROM PERSON`);
      const new_kfupm_id = newKfupmIdRes.rows[0].new_id || 1031;
  
      // Insert into PERSON table first (required as foreign key for PLAYER)
      await db.query(`
        INSERT INTO PERSON (kfupm_id, name, date_of_birth)
        VALUES ($1, $2, '2000-01-01')
      `, [new_kfupm_id, player_name]);
  
      // Insert into PLAYER table
      await db.query(`
        INSERT INTO PLAYER (player_id, jersey_no, position_to_play)
        VALUES ($1, $2, $3)
      `, [new_kfupm_id, jersey_no, position_to_play]);
  
      // Insert into TEAM_PLAYER table
      await db.query(`
        INSERT INTO TEAM_PLAYER (player_id, team_id, tr_id)
        VALUES ($1, $2, $3)
      `, [new_kfupm_id, team_id, tr_id]);
  
      res.redirect('/admin-requests');
    } catch (err) {
      console.error("Error approving join request:", err);
      res.status(500).send("Failed to approve request");
    }
  });
  
  // Handle rejection
  app.post('/admin-requests/:requestId/reject', async (req, res) => {
    try {
      const { requestId } = req.params;
      
      // Check if user is logged in and is an admin
      if (!req.session.user || req.session.user.role !== 'admin') {
        return res.status(403).send("Unauthorized");
      }
  
      // Update the request status
      await db.query(`
        UPDATE PLAYER_REQUEST SET request_status = 'REJECTED' WHERE request_id = $1
      `, [requestId]);
  
      res.redirect('/admin-requests');
    } catch (err) {
      console.error("Error rejecting join request:", err);
      res.status(500).send("Failed to reject request");
    }
  });

app.post('/teams', (req, res) => {
    console.log(req.body);
    res.redirect(`/tournaments/${req.body.tournamentId}`);
});

app.get('/tournaments/:id', async (req, res) => {
    const tournamentId = req.params.id;

    try {
        // Tournament Info
        const tournamentRes = await db.query(`
        SELECT tr_id, tr_name, start_date, end_date
        FROM TOURNAMENT
        WHERE tr_id = $1
      `, [tournamentId]);

        const tournamentInfo = tournamentRes.rows[0];

        // Standings
        const standingsRes = await db.query(`
        SELECT 
          t.team_id,
          t.team_name AS "Team",
          tt.match_played AS "PL",
          tt.won AS "W",
          tt.draw AS "D",
          tt.lost AS "L",
          tt.points AS "PTS",
          tt.goal_diff
        FROM TOURNAMENT_TEAM tt
        JOIN TEAM t ON tt.team_id = t.team_id
        WHERE tt.tr_id = $1
        ORDER BY tt.points DESC, tt.goal_diff DESC
      `, [tournamentId]);

        const standings = standingsRes.rows.map((row, index) => ({
            "#": index + 1,
            team_id: row.team_id,
            Team: row.Team,
            PL: row.PL,
            W: row.W,
            D: row.D,
            L: row.L,
            PTS: row.PTS
        }));

        // Fixtures
        const fixturesRes = await db.query(`
        SELECT 
          mp.match_no AS id,
          mp.play_date,
          t1.team_name AS team1,
          t2.team_name AS team2,
          mp.goal_score,
          mp.play_date > CURRENT_DATE AS upcoming
        FROM MATCH_PLAYED mp
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        WHERE mp.team_id1 IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        ) OR mp.team_id2 IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        )
        ORDER BY mp.play_date
      `, [tournamentId]);

        const fixtures = fixturesRes.rows.map(match => ({
            id: match.id,
            date: match.play_date,
            team1: match.team1,
            team2: match.team2,
            score: match.upcoming ? null : match.goal_score,
            status: match.upcoming ? 'Upcoming' : 'FT'
        }));

        // Top Scorers
        const scorersRes = await db.query(`
        SELECT 
          p.name AS player,
          t.team_id,
          t.team_name AS team,
          COUNT(*) AS goals
        FROM GOAL_DETAILS g
        JOIN PLAYER pl ON g.player_id = pl.player_id
        JOIN PERSON p ON pl.player_id = p.kfupm_id
        JOIN TEAM t ON g.team_id = t.team_id
        WHERE g.team_id IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        )
        GROUP BY p.name, t.team_name, t.team_id
        ORDER BY goals DESC
        LIMIT 3
      `, [tournamentId]);

        const topScorers = scorersRes.rows.map((row, index) => ({
            "#": index + 1,
            player: row.player,
            team: row.team,
            team_id: row.team_id,
            goals: parseInt(row.goals)
        }));

        // Top Assists
        const assistsRes = await db.query(`
        SELECT 
          p.name AS player,
          t.team_id,
          t.team_name AS team,
          COUNT(*) AS assists
        FROM ASSIST_DETAILS a
        JOIN PLAYER pl ON a.assister_id = pl.player_id
        JOIN PERSON p ON pl.player_id = p.kfupm_id
        JOIN TEAM t ON a.team_id = t.team_id
        WHERE a.team_id IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        )
        GROUP BY p.name, t.team_name, t.team_id
        ORDER BY assists DESC
        LIMIT 3
      `, [tournamentId]);

        const topAssists = assistsRes.rows.map((row, index) => ({
            "#": index + 1,
            player: row.player,
            team: row.team,
            team_id: row.team_id,
            assists: parseInt(row.assists)
        }));

        res.render('tournamentDetails', {
            tournamentInfo,
            standings,
            fixtures,
            topScorers,
            topAssists,
            user: req.session.user
        });
    } catch (error) {
        console.error("Error fetching tournament data:", error);
        res.status(500).send("Internal Server Error");
    }
});


// Admin Tournament Details
app.get('/tournamnetDetails-admin/:id', async (req, res) => {
    const tournamentId = req.params.id;

    try {
        // Tournament Info
        const tournamentRes = await db.query(`
        SELECT tr_id, tr_name, start_date, end_date
        FROM TOURNAMENT
        WHERE tr_id = $1
      `, [tournamentId]);

        const tournamentInfo = tournamentRes.rows[0];

        // Standings
        const standingsRes = await db.query(`
        SELECT 
          t.team_id,
          t.team_name AS "Team",
          tt.match_played AS "PL",
          tt.won AS "W",
          tt.draw AS "D",
          tt.lost AS "L",
          tt.points AS "PTS",
          tt.goal_diff
        FROM TOURNAMENT_TEAM tt
        JOIN TEAM t ON tt.team_id = t.team_id
        WHERE tt.tr_id = $1
        ORDER BY tt.points DESC, tt.goal_diff DESC
      `, [tournamentId]);

        const standings = standingsRes.rows.map((row, index) => ({
            "#": index + 1,
            team_id: row.team_id,
            Team: row.Team,
            PL: row.PL,
            W: row.W,
            D: row.D,
            L: row.L,
            PTS: row.PTS
        }));

        // Fixtures
        const fixturesRes = await db.query(`
        SELECT 
          mp.match_no AS id,
          mp.play_date,
          t1.team_name AS team1,
          t2.team_name AS team2,
          mp.goal_score,
          mp.play_date > CURRENT_DATE AS upcoming
        FROM MATCH_PLAYED mp
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        WHERE mp.team_id1 IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        ) OR mp.team_id2 IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        )
        ORDER BY mp.play_date
      `, [tournamentId]);

        const fixtures = fixturesRes.rows.map(match => ({
            id: match.id,
            date: match.play_date,
            team1: match.team1,
            team2: match.team2,
            score: match.upcoming ? null : match.goal_score,
            status: match.upcoming ? 'Upcoming' : 'FT'
        }));

        // Top Scorers
        const scorersRes = await db.query(`
        SELECT 
          p.name AS player,
          t.team_id,
          t.team_name AS team,
          COUNT(*) AS goals
        FROM GOAL_DETAILS g
        JOIN PLAYER pl ON g.player_id = pl.player_id
        JOIN PERSON p ON pl.player_id = p.kfupm_id
        JOIN TEAM t ON g.team_id = t.team_id
        WHERE g.team_id IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        )
        GROUP BY p.name, t.team_name, t.team_id
        ORDER BY goals DESC
        LIMIT 3
      `, [tournamentId]);

        const topScorers = scorersRes.rows.map((row, index) => ({
            "#": index + 1,
            player: row.player,
            team: row.team,
            team_id: row.team_id,
            goals: parseInt(row.goals)
        }));

        // Top Assists
        const assistsRes = await db.query(`
        SELECT 
          p.name AS player,
          t.team_id,
          t.team_name AS team,
          COUNT(*) AS assists
        FROM ASSIST_DETAILS a
        JOIN PLAYER pl ON a.assister_id = pl.player_id
        JOIN PERSON p ON pl.player_id = p.kfupm_id
        JOIN TEAM t ON a.team_id = t.team_id
        WHERE a.team_id IN (
          SELECT team_id FROM TOURNAMENT_TEAM WHERE tr_id = $1
        )
        GROUP BY p.name, t.team_name, t.team_id
        ORDER BY assists DESC
        LIMIT 3
      `, [tournamentId]);

        const topAssists = assistsRes.rows.map((row, index) => ({
            "#": index + 1,
            player: row.player,
            team: row.team,
            team_id: row.team_id,
            assists: parseInt(row.assists)
        }));

        res.render('tournamentDetails-admin', {
            tournamentInfo,
            standings,
            fixtures,
            topScorers,
            topAssists,
            user: req.session.user
        });
    } catch (err) {
        console.error('Error in admin tournament details:', err);
        res.status(500).send("Internal Server Error");
    }
});

// Team Routes
app.get('/teams/:id', async (req, res) => {
    const teamId = req.params.id;

    try {
        const teamNameRes = await db.query(`SELECT team_name FROM TEAM WHERE team_id = $1`, [teamId]);
        const teamName = teamNameRes.rows[0]?.team_name || 'Unknown';

        // Get Manager (support_type = 'AC')
        const managerRes = await db.query(`
        SELECT p.name AS manager
        FROM TEAM_SUPPORT ts
        JOIN PERSON p ON ts.support_id = p.kfupm_id
        WHERE ts.team_id = $1 AND ts.support_type = 'AC'
        LIMIT 1
      `, [teamId]);

        // Get Coach (support_type = 'CH')
        const coachRes = await db.query(`
        SELECT p.name AS coach
        FROM TEAM_SUPPORT ts
        JOIN PERSON p ON ts.support_id = p.kfupm_id
        WHERE ts.team_id = $1 AND ts.support_type = 'CH'
        LIMIT 1
      `, [teamId]);

        // Get Captain
        const captainRes = await db.query(`
        SELECT per.name AS captain
        FROM MATCH_CAPTAIN mc
        JOIN PLAYER pl ON mc.player_captain = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        WHERE mc.team_id = $1
        ORDER BY mc.match_no DESC
        LIMIT 1
      `, [teamId]);

        const teamOverview = {
            team_id: teamId,
            manager: managerRes.rows[0]?.manager || 'N/A',
            coach: coachRes.rows[0]?.coach || 'N/A',
            captain: captainRes.rows[0]?.captain || 'N/A'
        };
        const [goalkeepers, defenders, midfielders, forwards] = await Promise.all([
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'GK'
      `, [teamId]),
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'DF'`, [teamId]),
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'MF'`, [teamId]),
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'FD'`, [teamId])
        ]);
        const [participatingTournaments, topGoals, topAssists, yellows, reds, matchRaw] = await Promise.all([
            db.query(`
        SELECT t.tr_id, t.tr_name, t.start_date, t.end_date
        FROM TOURNAMENT_TEAM tt
        JOIN TOURNAMENT t ON tt.tr_id = t.tr_id
        WHERE tt.team_id = $1
        ORDER BY t.start_date DESC`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          p.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(g.goal_id) AS goals
        FROM GOAL_DETAILS g
        JOIN PLAYER pl ON g.player_id = pl.player_id
        JOIN PERSON p ON p.kfupm_id = pl.player_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        WHERE g.team_id = $1
        GROUP BY pl.player_id, p.name, pos.position_desc, pl.jersey_no
        ORDER BY goals DESC, p.name`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          per.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(a.assist_id) AS assists
        FROM assist_details a
        JOIN PLAYER pl ON a.assister_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        WHERE a.team_id = $1
        GROUP BY pl.player_id, per.name, pos.position_desc, pl.jersey_no
        ORDER BY assists DESC, per.name`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          per.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(*) AS yellow
        FROM PLAYER_BOOKED pb
        JOIN PLAYER pl ON pb.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        WHERE pb.team_id = $1 AND pb.sent_off = 'N'
        GROUP BY pl.player_id, per.name, pos.position_desc, pl.jersey_no
        ORDER BY yellow DESC, per.name`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          per.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(*) AS total_red_cards,
          json_agg(json_build_object(
            'date', mp.play_date,
            'opponent', 
              CASE 
                WHEN mp.team_id1 = $1 THEN t2.team_name
                ELSE t1.team_name
              END,
            'competition', tr.tr_name
          ) ORDER BY mp.play_date DESC) AS match_details
        FROM PLAYER_BOOKED pb
        JOIN PLAYER pl ON pb.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        JOIN MATCH_PLAYED mp ON mp.match_no = pb.match_no
        JOIN TOURNAMENT_TEAM tt1 ON tt1.team_id = mp.team_id1 OR tt1.team_id = mp.team_id2
        JOIN TOURNAMENT tr ON tr.tr_id = tt1.tr_id
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        WHERE pb.team_id = $1 AND pb.sent_off = 'Y'
          AND (tt1.team_id = mp.team_id1 OR tt1.team_id = mp.team_id2)
        GROUP BY pl.player_id, per.name, pos.position_desc, pl.jersey_no
        ORDER BY total_red_cards DESC`, [teamId]),
            db.query(`SELECT 
          mp.match_no,
          mp.play_date,
          to_char(mp.play_date, 'Day, DD Mon') AS formatted_date,
          tr.tr_name AS tournament,
          t1.team_name AS team1,
          t2.team_name AS team2,
          mp.goal_score,
          mp.play_stage,
          CASE 
            WHEN mp.play_date < CURRENT_DATE THEN 'FT'
            ELSE 'Upcoming'
          END AS status
        FROM MATCH_PLAYED mp
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        JOIN TOURNAMENT_TEAM tt ON tt.team_id = $1
        JOIN TOURNAMENT tr ON tt.tr_id = tr.tr_id
        WHERE mp.team_id1 = $1 OR mp.team_id2 = $1
        ORDER BY mp.play_date`, [teamId])
        ]);
        const matches = matchRaw.rows.map(row => {
            const date = new Date(row.play_date);
            return {
                id: row.match_no,
                dateISO: date.toISOString().split('T')[0],
                dateReadable: date.toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long',year: 'numeric'
                }),
                tournament: row.tournament,
                team1: row.team1,
                team2: row.team2,
                score: row.status === 'FT' ? row.goal_score : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                statusText: row.status,
                statusClass: row.status === 'FT' ? 'statusFinal' : 'statusUpcoming'
            };
        });
        res.render('teamDetails', {
            user: req.session.user,
            team: {
                id: teamId,
                name: teamName,
                manager: teamOverview.manager,
                coach: teamOverview.coach,
                captain: teamOverview.captain,
                players: {
                    Goalkeepers: goalkeepers.rows.map(p => ({
                      name: p.player,          // from SELECT ... AS player
                      jersey: p.jersey_no,     // from SELECT ... AS jersey_no
                      role: p.role             // already labeled as role
                    })),
                    Defenders: defenders.rows.map(p => ({
                      name: p.player,
                      jersey: p.jersey_no,
                      role: p.role
                    })),
                    Midfielders: midfielders.rows.map(p => ({
                      name: p.player,
                      jersey: p.jersey_no,
                      role: p.role
                    })),
                    Forwards: forwards.rows.map(p => ({
                      name: p.player,
                      jersey: p.jersey_no,
                      role: p.role
                    }))
                  },
                  tournaments: participatingTournaments.rows.map(t => ({
                    id: t.tr_id,
                    name: t.tr_name
                  })),
                stats: {
                    goals: topGoals.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.goals
                    })),
                    assists: topAssists.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.assists
                    })),
                    yellow: yellows.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.yellow
                    })),
                    red: reds.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.total_red_cards,
                        details: (p.match_details || []).map(d => ({
                            date: d.date,
                            opp: d.opponent,
                            comp: d.competition
                        }))
                    }))
                },
                matches
            }
        });

    } catch (error) {
        console.error('Error fetching team overview:', error);
        res.status(500).send('Server error');
    }
});
// Admin Team Details
app.get('/teams-admin/:id', async(req, res) => {
    const teamId = req.params.id;

    try {
        const teamNameRes = await db.query(`SELECT team_name FROM TEAM WHERE team_id = $1`, [teamId]);
        const teamName = teamNameRes.rows[0]?.team_name || 'Unknown';

        // Get Manager (support_type = 'AC')
        const managerRes = await db.query(`
        SELECT p.name AS manager
        FROM TEAM_SUPPORT ts
        JOIN PERSON p ON ts.support_id = p.kfupm_id
        WHERE ts.team_id = $1 AND ts.support_type = 'AC'
        LIMIT 1
      `, [teamId]);

        // Get Coach (support_type = 'CH')
        const coachRes = await db.query(`
        SELECT p.name AS coach
        FROM TEAM_SUPPORT ts
        JOIN PERSON p ON ts.support_id = p.kfupm_id
        WHERE ts.team_id = $1 AND ts.support_type = 'CH'
        LIMIT 1
      `, [teamId]);

        // Get Captain
        const captainRes = await db.query(`
        SELECT per.name AS captain
        FROM MATCH_CAPTAIN mc
        JOIN PLAYER pl ON mc.player_captain = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        WHERE mc.team_id = $1
        ORDER BY mc.match_no DESC
        LIMIT 1
      `, [teamId]);

        const teamOverview = {
            team_id: teamId,
            manager: managerRes.rows[0]?.manager || 'N/A',
            coach: coachRes.rows[0]?.coach || 'N/A',
            captain: captainRes.rows[0]?.captain || 'N/A'
        };
        const [goalkeepers, defenders, midfielders, forwards] = await Promise.all([
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'GK'
      `, [teamId]),
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'DF'`, [teamId]),
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'MF'`, [teamId]),
            db.query(`
        SELECT DISTINCT ON (pl.player_id)
          pl.player_id,
          per.name AS player,
          pl.jersey_no,
          CASE 
            WHEN cap.player_captain = pl.player_id THEN 'Captain'
            ELSE 'Player'
          END AS role
        FROM TEAM_PLAYER tp
        JOIN PLAYER pl ON tp.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        LEFT JOIN (
          SELECT DISTINCT player_captain, team_id
          FROM MATCH_CAPTAIN
        ) cap ON cap.team_id = tp.team_id AND cap.player_captain = pl.player_id
        WHERE tp.team_id = $1 AND pl.position_to_play = 'FD'`, [teamId])
        ]);
        const [participatingTournaments, topGoals, topAssists, yellows, reds, matchRaw] = await Promise.all([
            db.query(`
        SELECT t.tr_id, t.tr_name, t.start_date, t.end_date
        FROM TOURNAMENT_TEAM tt
        JOIN TOURNAMENT t ON tt.tr_id = t.tr_id
        WHERE tt.team_id = $1
        ORDER BY t.start_date DESC`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          p.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(g.goal_id) AS goals
        FROM GOAL_DETAILS g
        JOIN PLAYER pl ON g.player_id = pl.player_id
        JOIN PERSON p ON p.kfupm_id = pl.player_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        WHERE g.team_id = $1
        GROUP BY pl.player_id, p.name, pos.position_desc, pl.jersey_no
        ORDER BY goals DESC, p.name`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          per.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(a.assist_id) AS assists
        FROM assist_details a
        JOIN PLAYER pl ON a.assister_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        WHERE a.team_id = $1
        GROUP BY pl.player_id, per.name, pos.position_desc, pl.jersey_no
        ORDER BY assists DESC, per.name`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          per.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(*) AS yellow
        FROM PLAYER_BOOKED pb
        JOIN PLAYER pl ON pb.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        WHERE pb.team_id = $1 AND pb.sent_off = 'N'
        GROUP BY pl.player_id, per.name, pos.position_desc, pl.jersey_no
        ORDER BY yellow DESC, per.name`, [teamId]),
            db.query(`
        SELECT 
          pl.player_id,
          per.name AS player,
          pos.position_desc AS position,
          pl.jersey_no,
          COUNT(*) AS total_red_cards,
          json_agg(json_build_object(
            'date', mp.play_date,
            'opponent', 
              CASE 
                WHEN mp.team_id1 = $1 THEN t2.team_name
                ELSE t1.team_name
              END,
            'competition', tr.tr_name
          ) ORDER BY mp.play_date DESC) AS match_details
        FROM PLAYER_BOOKED pb
        JOIN PLAYER pl ON pb.player_id = pl.player_id
        JOIN PERSON per ON pl.player_id = per.kfupm_id
        JOIN PLAYING_POSITION pos ON pl.position_to_play = pos.position_id
        JOIN MATCH_PLAYED mp ON mp.match_no = pb.match_no
        JOIN TOURNAMENT_TEAM tt1 ON tt1.team_id = mp.team_id1 OR tt1.team_id = mp.team_id2
        JOIN TOURNAMENT tr ON tr.tr_id = tt1.tr_id
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        WHERE pb.team_id = $1 AND pb.sent_off = 'Y'
          AND (tt1.team_id = mp.team_id1 OR tt1.team_id = mp.team_id2)
        GROUP BY pl.player_id, per.name, pos.position_desc, pl.jersey_no
        ORDER BY total_red_cards DESC`, [teamId]),
            db.query(`SELECT 
          mp.match_no,
          mp.play_date,
          to_char(mp.play_date, 'Day, DD Mon') AS formatted_date,
          tr.tr_name AS tournament,
          t1.team_name AS team1,
          t2.team_name AS team2,
          mp.goal_score,
          mp.play_stage,
          CASE 
            WHEN mp.play_date < CURRENT_DATE THEN 'FT'
            ELSE 'Upcoming'
          END AS status
        FROM MATCH_PLAYED mp
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        JOIN TOURNAMENT_TEAM tt ON tt.team_id = $1
        JOIN TOURNAMENT tr ON tt.tr_id = tr.tr_id
        WHERE mp.team_id1 = $1 OR mp.team_id2 = $1
        ORDER BY mp.play_date`, [teamId])
        ]);
        const matches = matchRaw.rows.map(row => {
            const date = new Date(row.play_date);
            return {
                id: row.match_no,
                dateISO: date.toISOString().split('T')[0],
                dateReadable: date.toLocaleDateString('en-GB', {
                    weekday: 'long', day: 'numeric', month: 'long',year: 'numeric'
                }),
                tournament: row.tournament,
                team1: row.team1,
                team2: row.team2,
                score: row.status === 'FT' ? row.goal_score : date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                statusText: row.status,
                statusClass: row.status === 'FT' ? 'statusFinal' : 'statusUpcoming'
            };
        });
        res.render('teamDetails-admin', {
            user: req.session.user,
            team: {
                id: teamId,
                name: teamName,
                manager: teamOverview.manager,
                coach: teamOverview.coach,
                captain: teamOverview.captain,
                players: {
                    Goalkeepers: goalkeepers.rows.map(p => ({
                      name: p.player,          // from SELECT ... AS player
                      jersey: p.jersey_no,     // from SELECT ... AS jersey_no
                      role: p.role             // already labeled as role
                    })),
                    Defenders: defenders.rows.map(p => ({
                      name: p.player,
                      jersey: p.jersey_no,
                      role: p.role
                    })),
                    Midfielders: midfielders.rows.map(p => ({
                      name: p.player,
                      jersey: p.jersey_no,
                      role: p.role
                    })),
                    Forwards: forwards.rows.map(p => ({
                      name: p.player,
                      jersey: p.jersey_no,
                      role: p.role
                    }))
                  },
                  tournaments: participatingTournaments.rows.map(t => ({
                    id: t.tr_id,
                    name: t.tr_name
                  })),
                stats: {
                    goals: topGoals.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.goals
                    })),
                    assists: topAssists.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.assists
                    })),
                    yellow: yellows.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.yellow
                    })),
                    red: reds.rows.map(p => ({
                        id: p.player_id,
                        name: p.player,
                        pos: p.position,
                        jersey: p.jersey_no,
                        value: p.total_red_cards,
                        details: (p.match_details || []).map(d => ({
                            date: d.date,
                            opp: d.opponent,
                            comp: d.competition
                        }))
                    }))
                },
                matches
            }
        });

    } catch (error) {
        console.error('Error fetching team overview:', error);
        res.status(500).send('Server error');
    }
});

// Match Route
app.get('/matches/:id', async (req, res) => {
    const matchId = req.params.id;
  
    try {
      const matchRes = await db.query(`
        SELECT 
          mp.match_no,
          mp.play_stage,
          mp.play_date,
          mp.goal_score,
          mp.decided_by,
          mp.audience,
          mp.stop1_sec,
          mp.stop2_sec,
          v.venue_name,
          t1.team_id AS team1_id,
          t2.team_id AS team2_id,
          t1.team_name AS team1_name,
          t2.team_name AS team2_name,
          tr.tr_name AS tournament,
          per.name AS motm,
          mp.player_of_match
        FROM MATCH_PLAYED mp
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        JOIN TOURNAMENT_TEAM tt ON tt.team_id = t1.team_id OR tt.team_id = t2.team_id
        JOIN TOURNAMENT tr ON tt.tr_id = tr.tr_id
        JOIN VENUE v ON v.venue_id = mp.venue_id
        JOIN PLAYER pl ON mp.player_of_match = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE mp.match_no = $1
        LIMIT 1
      `, [matchId]);
  
      const m = matchRes.rows[0];
      const dateObj = new Date(m.play_date);
      const date = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isUpcoming = dateObj > new Date();
  
      const captainsRes = await db.query(`
        SELECT mc.team_id, per.name AS captain
        FROM MATCH_CAPTAIN mc
        JOIN PLAYER pl ON mc.player_captain = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE mc.match_no = $1
      `, [matchId]);
  
      const captains = {};
      captainsRes.rows.forEach(row => {
        captains[row.team_id] = row.captain;
      });
  
      const gkRes = await db.query(`
        SELECT md.team_id, per.name AS goalkeeper
        FROM match_details md
        JOIN PLAYER pl ON md.player_gk = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE md.match_no = $1
      `, [matchId]);
  
      const gks = {};
      gkRes.rows.forEach(row => {
        gks[row.team_id] = row.goalkeeper;
      });
  
      const goalsRes = await db.query(`
        SELECT gd.team_id, gd.goal_time, per.name AS scorer
        FROM GOAL_DETAILS gd
        JOIN PLAYER pl ON gd.player_id = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE gd.match_no = $1
        ORDER BY gd.goal_time
      `, [matchId]);
  
      const goals = {};
      goalsRes.rows.forEach(row => {
        if (!goals[row.team_id]) goals[row.team_id] = [];
        goals[row.team_id].push(`⚽ ${row.goal_time}' ${row.scorer}`);
      });
  
      const bookingsRes = await db.query(`
        SELECT pb.team_id, pb.booking_time, pb.sent_off, per.name AS player
        FROM PLAYER_BOOKED pb
        JOIN PLAYER pl ON pb.player_id = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE pb.match_no = $1
        ORDER BY pb.booking_time
      `, [matchId]);
  
      const bookings = {};
      bookingsRes.rows.forEach(b => {
        if (!bookings[b.team_id]) bookings[b.team_id] = [];
        const icon = b.sent_off === 'Y' ? '🟥' : '🟨';
        const status = b.sent_off === 'Y' ? 'Sent Off' : 'Not Sent Off';
        bookings[b.team_id].push(`${b.booking_time}' ${icon} ${b.player} — ${status}`);
      });
  
      const subsRes = await db.query(`
        SELECT team_id, time_in_out, in_out, per.name AS player
        FROM PLAYER_IN_OUT pi
        JOIN PLAYER pl ON pi.player_id = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE match_no = $1
        ORDER BY time_in_out
      `, [matchId]);
  
      const subs = {};
      const lastSeenOut = {};
      for (let s of subsRes.rows) {
        const team = s.team_id;
        if (!subs[team]) subs[team] = [];
        if (!lastSeenOut[team]) lastSeenOut[team] = {};
  
        if (s.in_out === 'O') {
          lastSeenOut[team].out = s.player;
        } else if (s.in_out === 'I') {
          subs[team].push({
            in: s.player,
            out: lastSeenOut[team].out || 'Unknown',
            time: `${s.time_in_out}'`
          });
        }
      }
  
      const match = {
        id: matchId,
        team1: {
          name: m.team1_name,
          captain: captains[m.team1_id] || 'N/A',
          goalkeeper: gks[m.team1_id] || 'N/A'
        },
        team2: {
          name: m.team2_name,
          captain: captains[m.team2_id] || 'N/A',
          goalkeeper: gks[m.team2_id] || 'N/A'
        },
        tournament: m.tournament,
        stage: m.play_stage,
        date,
        time,
        isUpcoming,
        venue: m.venue_name,
        score: m.goal_score,
        resultMeta: {
          status: isUpcoming ? 'Upcoming' : 'FT',
          method: m.decided_by === 'N' ? 'Normal' : 'Penalties',
          motm: `${m.motm} (${m.player_of_match})`,
          audience: m.audience,
          stoppage: [
            m.stop1_sec != null ? `1st – ${m.stop1_sec}s` : '1st – N/A',
            m.stop2_sec != null ? `2nd – ${m.stop2_sec}s` : '2nd – N/A'
          ]
        },
        goals: {
          team1: goals[m.team1_id] || [],
          team2: goals[m.team2_id] || []
        },
        bookings: {
          team1: bookings[m.team1_id] || [],
          team2: bookings[m.team2_id] || []
        },
        subs: {
          team1: subs[m.team1_id] || [],
          team2: subs[m.team2_id] || []
        }
      };
  
      res.render('matchDetails', { match, user: req.session.user });
  
    } catch (err) {
      console.error('Error loading match details:', err);
      res.status(500).send('Server error');
    }
  });
app.get('/matches-admin/:id', async (req,res)=>{
    const matchId = req.params.id;
  
    try {
      const matchRes = await db.query(`
        SELECT 
          mp.match_no,
          mp.play_stage,
          mp.play_date,
          mp.goal_score,
          mp.decided_by,
          mp.audience,
          mp.stop1_sec,
          mp.stop2_sec,
          v.venue_name,
          t1.team_id AS team1_id,
          t2.team_id AS team2_id,
          t1.team_name AS team1_name,
          t2.team_name AS team2_name,
          tr.tr_name AS tournament,
          per.name AS motm,
          mp.player_of_match
        FROM MATCH_PLAYED mp
        JOIN TEAM t1 ON mp.team_id1 = t1.team_id
        JOIN TEAM t2 ON mp.team_id2 = t2.team_id
        JOIN TOURNAMENT_TEAM tt ON tt.team_id = t1.team_id OR tt.team_id = t2.team_id
        JOIN TOURNAMENT tr ON tt.tr_id = tr.tr_id
        JOIN VENUE v ON v.venue_id = mp.venue_id
        JOIN PLAYER pl ON mp.player_of_match = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE mp.match_no = $1
        LIMIT 1
      `, [matchId]);
  
      const m = matchRes.rows[0];
      const dateObj = new Date(m.play_date);
      const date = dateObj.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const time = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const isUpcoming = dateObj > new Date();
  
      const captainsRes = await db.query(`
        SELECT mc.team_id, per.name AS captain
        FROM MATCH_CAPTAIN mc
        JOIN PLAYER pl ON mc.player_captain = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE mc.match_no = $1
      `, [matchId]);
  
      const captains = {};
      captainsRes.rows.forEach(row => {
        captains[row.team_id] = row.captain;
      });
  
      const gkRes = await db.query(`
        SELECT md.team_id, per.name AS goalkeeper
        FROM match_details md
        JOIN PLAYER pl ON md.player_gk = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE md.match_no = $1
      `, [matchId]);
  
      const gks = {};
      gkRes.rows.forEach(row => {
        gks[row.team_id] = row.goalkeeper;
      });
  
      const goalsRes = await db.query(`
        SELECT gd.team_id, gd.goal_time, per.name AS scorer
        FROM GOAL_DETAILS gd
        JOIN PLAYER pl ON gd.player_id = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE gd.match_no = $1
        ORDER BY gd.goal_time
      `, [matchId]);
  
      const goals = {};
      goalsRes.rows.forEach(row => {
        if (!goals[row.team_id]) goals[row.team_id] = [];
        goals[row.team_id].push(`⚽ ${row.goal_time}' ${row.scorer}`);
      });
  
      const bookingsRes = await db.query(`
        SELECT pb.team_id, pb.booking_time, pb.sent_off, per.name AS player
        FROM PLAYER_BOOKED pb
        JOIN PLAYER pl ON pb.player_id = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE pb.match_no = $1
        ORDER BY pb.booking_time
      `, [matchId]);
  
      const bookings = {};
      bookingsRes.rows.forEach(b => {
        if (!bookings[b.team_id]) bookings[b.team_id] = [];
        const icon = b.sent_off === 'Y' ? '🟥' : '🟨';
        const status = b.sent_off === 'Y' ? 'Sent Off' : 'Not Sent Off';
        bookings[b.team_id].push(`${b.booking_time}' ${icon} ${b.player} — ${status}`);
      });
  
      const subsRes = await db.query(`
        SELECT team_id, time_in_out, in_out, per.name AS player
        FROM PLAYER_IN_OUT pi
        JOIN PLAYER pl ON pi.player_id = pl.player_id
        JOIN PERSON per ON per.kfupm_id = pl.player_id
        WHERE match_no = $1
        ORDER BY time_in_out
      `, [matchId]);
  
      const subs = {};
      const lastSeenOut = {};
      for (let s of subsRes.rows) {
        const team = s.team_id;
        if (!subs[team]) subs[team] = [];
        if (!lastSeenOut[team]) lastSeenOut[team] = {};
  
        if (s.in_out === 'O') {
          lastSeenOut[team].out = s.player;
        } else if (s.in_out === 'I') {
          subs[team].push({
            in: s.player,
            out: lastSeenOut[team].out || 'Unknown',
            time: `${s.time_in_out}'`
          });
        }
      }
  
      const match = {
        id: matchId,
        team1: {
          name: m.team1_name,
          captain: captains[m.team1_id] || 'N/A',
          goalkeeper: gks[m.team1_id] || 'N/A'
        },
        team2: {
          name: m.team2_name,
          captain: captains[m.team2_id] || 'N/A',
          goalkeeper: gks[m.team2_id] || 'N/A'
        },
        tournament: m.tournament,
        stage: m.play_stage,
        date,
        time,
        isUpcoming,
        venue: m.venue_name,
        score: m.goal_score,
        resultMeta: {
          status: isUpcoming ? 'Upcoming' : 'FT',
          method: m.decided_by === 'N' ? 'Normal' : 'Penalties',
          motm: `${m.motm} (${m.player_of_match})`,
          audience: m.audience,
          stoppage: [
            m.stop1_sec != null ? `1st – ${m.stop1_sec}s` : '1st – N/A',
            m.stop2_sec != null ? `2nd – ${m.stop2_sec}s` : '2nd – N/A'
          ]
        },
        goals: {
          team1: goals[m.team1_id] || [],
          team2: goals[m.team2_id] || []
        },
        bookings: {
          team1: bookings[m.team1_id] || [],
          team2: bookings[m.team2_id] || []
        },
        subs: {
          team1: subs[m.team1_id] || [],
          team2: subs[m.team2_id] || []
        }
      };
  
      res.render('matchDetails-admin', { match, user: req.session.user });
  
    } catch (err) {
      console.error('Error loading match details:', err);
      res.status(500).send('Server error');
    }
});

// Start the server
app.listen(port, () => {
    console.log(`✅ Server running at http://localhost:${port}`);
});