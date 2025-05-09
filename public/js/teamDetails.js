document.addEventListener("DOMContentLoaded", () => {
    const tabs = document.querySelectorAll(".teamTab");
    const tabContents = document.querySelectorAll(".teamTabContent");
  
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
  
        const targetId = tab.dataset.target;
        tabContents.forEach(tc => tc.style.display = "none");
        const targetTab = document.getElementById(targetId);
        targetTab.style.display = "block";
  
        if (targetId === "matchesTab") {
          const container = targetTab.querySelector(".fixturesContainer");
          if (container) container.style.display = "block";
          scrollToUpcomingMatch();
        }
      });
    });
  
    const active = document.querySelector(".teamTab.active");
    if (active) {
      const targetId = active.dataset.target;
      document.getElementById(targetId).style.display = "block";
      if (targetId === "matchesTab") scrollToUpcomingMatch();
    }
  
    document.getElementById("sortOrder")?.addEventListener("change", sortFixturesByDate);
  });
  
  function toggleRedCardDetails(row) {
    const detailRow = row.nextElementSibling;
    detailRow.style.display = detailRow.style.display === 'table-row' ? 'none' : 'table-row';
  }
  
  function scrollToUpcomingMatch() {
    const container = document.querySelector("#matchesTab .fixturesContainer");
    const upcoming = container?.querySelector(".status-upcoming");
    if (upcoming) {
      const group = upcoming.closest(".fixtureGroup");
      if (group) container.scrollTop = group.offsetTop - container.offsetTop;
    }
  }
  
  function sortFixturesByDate() {
    const sortOrder = document.getElementById("sortOrder").value;
    const container = document.querySelector("#matchesTab .fixturesContainer");
    const groups = Array.from(container.querySelectorAll(".fixtureGroup"));
  
    groups.sort((a, b) => new Date(a.dataset.date) - new Date(b.dataset.date));
    if (sortOrder === "desc") groups.reverse();
    groups.forEach(group => container.appendChild(group));
  }
  