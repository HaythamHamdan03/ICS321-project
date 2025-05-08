document.addEventListener('DOMContentLoaded', function() {
    const tournamentForm = document.getElementById('tournamentForm');
    
    tournamentForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const tournamentData = {
            name: document.getElementById('tournamentName').value,
            sportType: document.getElementById('sportType').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value,
            location: document.getElementById('location').value
        };
        
        // Here you would typically send to your backend
        console.log('Tournament Data:', tournamentData);
        alert('Tournament created successfully!');
        
        // Add the new tournament to your matchesData object
        const startDate = new Date(tournamentData.startDate);
        const dateKey = startDate.toLocaleDateString('en-US', { 
            weekday: 'short', 
            day: 'numeric' 
        });
        
        if (!matchesData[dateKey]) {
            matchesData[dateKey] = [];
        }
        
        // Redirect back to dashboard
        window.location.href = '/dashboard';
    });
});