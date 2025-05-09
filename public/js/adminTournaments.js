let selectedId = null;

function deleteTournament(id) {
  selectedId = id;
  document.getElementById("confirmText").innerText =
    "Are you sure you want to delete tournament " + id + "?";
  document.getElementById("confirmModal").style.display = "flex";
}

function confirmDelete() {
  fetch(`/tournaments/${selectedId}`, {
    method: 'DELETE'
  })
    .then(response => {
      if (response.ok) {
        alert("Tournament deleted.");
        window.location.reload();
      } else {
        alert("Failed to delete tournament.");
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
  window.location.href = `/tournaments/${id}/edit`;
}
