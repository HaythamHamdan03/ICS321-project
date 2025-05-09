document.addEventListener('DOMContentLoaded', function() {
    const teamForm = document.getElementById('teamForm');
    const logoInput = document.getElementById('teamLogo');
    const logoPreview = document.getElementById('logoPreview');
    const fileNameDisplay = document.getElementById('fileName');

    // Handle logo selection and preview
    logoInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (file) {
            // Show file name
            fileNameDisplay.textContent = file.name;
            
            // Validate image file
            if (!file.type.match('image.*')) {
                alert('Please select an image file (JPEG, PNG, etc.)');
                return;
            }

            // Create preview
            const reader = new FileReader();
            reader.onload = function(event) {
                logoPreview.src = event.target.result;
                logoPreview.style.display = 'block';
                
                // Adjust for different image aspect ratios
                logoPreview.onload = function() {
                    if (this.width > this.height) {
                        this.style.width = 'auto';
                        this.style.height = '100%';
                    } else {
                        this.style.width = '100%';
                        this.style.height = 'auto';
                    }
                };
            };
            reader.readAsDataURL(file);
        } else {
            fileNameDisplay.textContent = 'No file selected';
            logoPreview.style.display = 'none';
        }
    });

    // Handle form submission
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
        teamForm.reset();
        fileNameDisplay.textContent = 'No file selected';
        logoPreview.style.display = 'none';
        // window.location.href = '/dashboard'; // Uncomment to redirect
    });
});