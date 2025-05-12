document.addEventListener('DOMContentLoaded', function() {
    // Player addition functionality
    document.querySelectorAll('.add-player-btn').forEach(button => {
        button.addEventListener('click', function() {
            const position = this.getAttribute('data-position');
            const container = document.getElementById(`${position}-container`);
            
            const playerDiv = document.createElement('div');
            playerDiv.className = 'player-input';
            playerDiv.innerHTML = `
                <input type="text" name="${position}[]" placeholder="Player name" required>
                <input type="text" name="${position}Jerseys[]" placeholder="Jersey number" required>
                <button type="button" class="remove-player-btn">×</button>
            `;
            
            container.appendChild(playerDiv);
            
            // Add event listener to new remove button
            playerDiv.querySelector('.remove-player-btn').addEventListener('click', function() {
                container.removeChild(playerDiv);
            });
        });
    });

    // Form submission
    const teamForm = document.getElementById('teamForm');
    teamForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(teamForm);
        const tournamentId = formData.get('tournamentId');
        
        // Convert FormData to a plain object for JSON submission
        const formDataObj = {};
        formData.forEach((value, key) => {
            // Handle array inputs like goalkeepers[]
            if (key.endsWith('[]')) {
                const cleanKey = key.slice(0, -2);
                if (!formDataObj[cleanKey]) {
                    formDataObj[cleanKey] = [];
                }
                formDataObj[cleanKey].push(value);
            } else {
                formDataObj[key] = value;
            }
        });
        
        // Send the data to the server
        fetch(`/admintournaments/${tournamentId}/add-team`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formDataObj)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Server error: ' + response.status);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                alert('Team added successfully!');
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    window.location.href = `/admintournaments`;
                }
            } else {
                alert('Error: ' + (data.error || 'Unknown error'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Error submitting form: ' + error.message);
        });
    });
});