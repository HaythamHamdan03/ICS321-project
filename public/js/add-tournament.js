document.addEventListener('DOMContentLoaded', function() {
    const tournamentForm = document.getElementById('tournamentForm');

    tournamentForm.addEventListener('submit', async function(e) {
        e.preventDefault();

        const tournamentData = {
            name: document.getElementById('tournamentName').value,
            startDate: document.getElementById('startDate').value,
            endDate: document.getElementById('endDate').value
        };

        try {
            const response = await fetch('/add-tournament', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(tournamentData)
            });

            if (response.ok) {
                alert('Tournament created successfully!');
                window.location.href = '/';
            } else {
                const error = await response.text();
                alert('Failed to create tournament: ' + error);
            }
        } catch (err) {
            console.error('Request error:', err);
            alert('Something went wrong');
        }
    });
});
