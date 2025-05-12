let selectedId = null;

function deleteTournament(id) {
  selectedId = id;
  document.getElementById("confirmText").innerText =
    "Are you sure you want to delete tournament " + id + "?";
  document.getElementById("confirmModal").style.display = "flex";
}

function confirmDelete() {
  if (!selectedId) return;

  fetch(`/admintournaments/${selectedId}`, {
    method: 'DELETE'
  })
    .then(response => response.json())
    .then(data => {
      if (data.redirect) {
        window.location.href = data.redirect;
      } else {
        alert("Tournament deleted.");
        window.location.reload();
      }
    })
    .catch(err => alert("Error: " + err))
    .finally(() => closeModal());
}

function closeModal() {
  document.getElementById("confirmModal").style.display = "none";
  selectedId = null;
}

function editTournament(id) {
  // Changed to redirect to add-team page instead of edit page
  window.location.href = `/admintournaments/${id}/add-team`;
}

// Function to add team to tournament
function addTeamToTournament(id) {
  window.location.href = `/admintournaments/${id}/add-team`;
}