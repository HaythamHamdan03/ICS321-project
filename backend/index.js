document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const matchesCard = document.querySelector('.matches-card');
    const dateItems = document.querySelectorAll('.date-item');
    const logoutBtn = document.getElementById('logout-btn');
    const addTournamentBtn = document.getElementById('add-tournament-btn');

    // Sample data - in a real app, this would come from an API
    const matchesData = {
        "Wed 17": [
            {
                tournament: "KFUPM Men's Football Tournament",
                team1: {
                    name: "Falcons FC",
                    logo: "/public/images/teamLogo.png"
                },
                team2: {
                    name: "Last Dance",
                    logo: "/public/images/teamLogo.png"
                },
                time: "10:00 PM",
                status: "Upcoming"
            },
            {
                tournament: "KFUPM Women's Tournament",
                team1: {
                    name: "BTS FC",
                    logo: "/public/images/teamLogo.png"
                },
                team2: {
                    name: "Cooking",
                    logo: "/public/images/teamLogo.png"
                },
                time: "10:00 PM",
                status: "Upcoming"
            }
        ],
        "Tue 16": [
            {
                tournament: "KFUPM Faculty Tournament",
                team1: {
                    name: "Chen rings",
                    logo: "/public/images/teamLogo.png"
                },
                team2: {
                    name: "ELD",
                    logo: "/public/images/teamLogo.png"
                },
                score: "2-1",
                status: "Completed"
            },
            {
                tournament: "KFUPM Global Students Tournament",
                team1: {
                    name: "Syrians",
                    logo: "/public/images/teamLogo.png"
                },
                team2: {
                    name: "USA",
                    logo: "/public/images/teamLogo.png"
                },
                score: "3-2",
                status: "Completed"
            },
            
        ]
    };

    // Initialize with today's matches
    renderMatches("Wed 17");

    // Date scroller functionality
    dateItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all dates
            dateItems.forEach(d => d.classList.remove('active'));
            // Add active class to clicked date
            this.classList.add('active');
            
            // Render matches for selected date
            const date = this.textContent;
            renderMatches(date);
        });
    });

    // Button event listeners
    logoutBtn.addEventListener('click', () => {
        window.location.href = '/logout';
    });

    addTournamentBtn.addEventListener('click', () => {
        window.location.href = '/add-tournament';
    });

    // Function to render matches
    function renderMatches(date) {
        matchesCard.innerHTML = '';
        
        const matchContainer = document.createElement('div');
        matchContainer.className = 'match-container';
        
        if (matchesData[date] && matchesData[date].length > 0) {
            matchesData[date].forEach(match => {
                const matchCard = document.createElement('div');
                matchCard.className = `match-card ${match.status === 'Completed' ? 'completed' : ''}`;
                
                matchCard.innerHTML = `
                    <div class="match-header">${match.tournament}</div>
                    <div class="match-content">
                        <div class="team">
                            <img src="${match.team1.logo}" alt="${match.team1.name}" class="team-logo">
                            <div class="team-name">${match.team1.name}</div>
                        </div>
                        <div class="match-center">
                            ${match.status === 'Completed' ? 
                                `<div class="match-score">${match.score}</div>` : 
                                `<div class="match-time">${match.time}</div>`}
                            <div class="match-status">${match.status}</div>
                        </div>
                        <div class="team">
                            <img src="${match.team2.logo}" alt="${match.team2.name}" class="team-logo">
                            <div class="team-name">${match.team2.name}</div>
                        </div>
                    </div>
                `;
                
                matchContainer.appendChild(matchCard);
            });
        } else {
            matchContainer.innerHTML = '<div class="match-card">No matches scheduled for this date.</div>';
        }
        
        matchesCard.appendChild(matchContainer);
    }
});