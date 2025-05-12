document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const matchesContainer = document.getElementById('matches-container');
    const dateItems = document.querySelectorAll('.date-item');
    const dateList = document.getElementById('date-list');
    const logoutBtn = document.getElementById('logout-btn');
    const addTournamentBtn = document.getElementById('add-tournament-btn');

    // Scroll active date into view
    const activeDate = document.querySelector('.date-item.active');
    if (activeDate) {
        setTimeout(() => {
            activeDate.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'center'
            });
        }, 100);
    }

    // Initialize with current date's matches
    const initialDate = activeDate ? activeDate.getAttribute('data-date') : new Date().toISOString().split('T')[0];
    renderMatches(initialDate);

    // Date scroller functionality
    dateItems.forEach(item => {
        item.addEventListener('click', function() {
            // Remove active class from all dates
            dateItems.forEach(d => d.classList.remove('active'));
            // Add active class to clicked date
            this.classList.add('active');
            
            // Render matches for selected date
            const date = this.getAttribute('data-date');
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
    async function renderMatches(date) {
        try {
            // Fetch matches data from API
            const response = await fetch(`/api/matches/${date}`);
            if (!response.ok) {
                throw new Error('Failed to fetch matches');
            }
            
            const matches = await response.json();
            
            // Clear existing matches
            matchesContainer.innerHTML = '';
            
            const matchContainer = document.createElement('div');
            matchContainer.className = 'match-container';
            
            if (matches && matches.length > 0) {
                matches.forEach(match => {
                    // Determine if match is completed or upcoming
                    const isCompleted = match.results !== null && match.results !== '';
                    
                    // Create match card
                    const matchCard = document.createElement('div');
                    matchCard.className = `match-card ${isCompleted ? 'completed' : ''}`;
                    matchCard.setAttribute('data-match-id', match.match_no);
                    
                    // Create match card content
                    matchCard.innerHTML = `
                        <div class="match-header">${match.tournament_name}</div>
                        <div class="match-content">
                            <div class="team">
                                <img src="/images/teamLogo.png" alt="${match.team1_name}" class="team-logo">
                                <div class="team-name">${match.team1_name}</div>
                            </div>
                            <div class="match-center">
                                ${isCompleted ? 
                                    `<div class="match-score">${match.goal_score}</div>` : 
                                    `<div class="match-time">10:00 PM</div>`}
                                <div class="match-status">${isCompleted ? 'Completed' : 'Upcoming'}</div>
                            </div>
                            <div class="team">
                                <img src="/images/teamLogo.png" alt="${match.team2_name}" class="team-logo">
                                <div class="team-name">${match.team2_name}</div>
                            </div>
                        </div>
                    `;
                    
                    // Add click event listener to navigate to match details
                    matchCard.addEventListener('click', () => {
                        window.location.href = `/matches/${match.match_no}`;
                    });
                    
                    matchContainer.appendChild(matchCard);
                });
            } else {
                matchContainer.innerHTML = '<div class="no-matches">No matches scheduled for this date.</div>';
            }
            
            matchesContainer.appendChild(matchContainer);
        } catch (error) {
            console.error('Error rendering matches:', error);
            matchesContainer.innerHTML = '<div class="no-matches">Error loading matches. Please try again later.</div>';
        }
    }
});