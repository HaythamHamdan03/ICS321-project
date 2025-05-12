document.addEventListener('DOMContentLoaded', function() {
    const logoutBtn = document.getElementById('logout-btn');
    const addTournamentBtn = document.getElementById('add-tournament-btn');
    const userManagementBtn = document.getElementById('user-management-btn');
    logoutBtn.addEventListener('click', () => {
        window.location.href = '/logout';
    });

    addTournamentBtn.addEventListener('click', () => {
        window.location.href = '/add-tournament';
    });
    userManagementBtn.addEventListener('click', () => {
        window.location.href = "/admin/users" ;
    });
});