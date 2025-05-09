import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const port = 3000;

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Set EJS as view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "../views"));

// Serve static files from /public
app.use(express.static(path.join(__dirname, "../public")));
app.use(express.urlencoded({ extended: true }));

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.get("/dashboard", (req, res) => {
  res.render("guest-dashboard");
});

app.get("/add-tournament", (req, res) => {
  res.render("add-tournament");
});

app.get("/add-team", (req, res) => {
  res.render("add-team");
});
app.get("/tournaments", (req, res) => {
    // Mock data for now — replace with DB results later
    const tournaments = [
        { id: 1, name: "KFUPM Men's Football Tournament" },
        { id: 2, name: "KFUPM Women's Tournament" },
        { id: 3, name: "KFUPM Faculty Tournament" }
    ];
    res.render("tournaments.ejs", { tournaments });
});
app.get('/admintournaments', (req, res) => {
    const tournaments = [
        { id: 1, name: "KFUPM Men's Football Tournament" },
        { id: 2, name: "KFUPM Women's Tournament" },
        { id: 3, name: "KFUPM Faculty Tournament" }
    ];
    res.render('adminTournaments', { tournaments: tournaments });
  });
  // DELETE tournament
app.delete('/tournaments/:id', (req, res) => {
    // You would delete from DB here. For now, simulate success:
    console.log(`Deleting tournament ${req.params.id}`);
    res.sendStatus(200);
  });
  
  // GET edit form (dummy page)
  app.get('/tournaments/:id/edit', (req, res) => {
    const tournamentId = req.params.id;
    res.send(`<h1>Edit Tournament ${tournamentId} (To be implemented)</h1>`);
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
  
    res.render('tournamentDetails', { tournament: dummyTournament });
  });
  

  app.get('/teams/:id', (req, res) => {
    const teams = [
      {
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
      }
    ];
  
    const team = teams.find(t => t.id == req.params.id);
    if (!team) return res.status(404).send('Team not found');
  
    res.render('teamDetails', { team });
  });
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
      isUpcoming: false, // change to true if it's upcoming
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
  
    res.render('matchDetails', { match: dummyMatch });
  });
  
// Start the server
app.listen(port, () => {
  console.log(`✅ Server running at http://localhost:${port}`);
});
