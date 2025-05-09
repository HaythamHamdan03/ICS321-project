document.addEventListener('DOMContentLoaded', function() {
    // File upload handling
    const logoInput = document.getElementById('teamLogo');
    const logoPreview = document.getElementById('logoPreview');
    const fileNameDisplay = document.getElementById('fileName');

    logoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            fileNameDisplay.textContent = file.name;
            
            if (!file.type.match('image.*')) {
                alert('Please select an image file (JPEG, PNG, etc.)');
                return;
            }

            const reader = new FileReader();
            reader.onload = function(event) {
                logoPreview.src = event.target.result;
                logoPreview.style.display = 'block';
                
                logoPreview.onload = function() {
                    this.style.width = this.width > this.height ? 'auto' : '100%';
                    this.style.height = this.width > this.height ? '100%' : 'auto';
                };
            };
            reader.readAsDataURL(file);
        } else {
            fileNameDisplay.textContent = 'No file selected';
            logoPreview.style.display = 'none';
        }
    });

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
        
        if (!logoInput.files[0]) {
            alert('Please select a team logo');
            return;
        }

        const formData = new FormData(teamForm);
        
        // Here you would typically send to your backend
        console.log('Form data:', Object.fromEntries(formData));
        
        // Simulate successful submission
        alert('Team added successfully!');
        window.location.href = `/tournaments/${formData.get('tournamentId')}`;
    });
});