document.addEventListener("DOMContentLoaded", function () {
    const tabs = document.querySelectorAll(".tab");
    const tableSection = document.getElementById("tableSection");
    const fixturesSection = document.getElementById("fixturesSection");
    const statsSection = document.getElementById("statsSection");
  
    tabs.forEach(tab => {
      tab.addEventListener("click", () => {
        tabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
  
        tableSection.style.display = (tab.textContent === "Table") ? "table" : "none";
        fixturesSection.style.display = (tab.textContent === "Fixtures") ? "block" : "none";
        statsSection.style.display = (tab.textContent === "Stats") ? "block" : "none";
  
        if (tab.textContent === "Fixtures") scrollToUpcoming();
      });
    });
  
    function sortFixturesByDate() {
      const sortOrder = document.getElementById("sortOrder").value;
      const container = document.getElementById("fixturesSection");
      const groups = Array.from(container.querySelectorAll(".fixtureGroup"));
  
      const sortedGroups = groups.sort((a, b) => {
        const dateA = new Date(a.dataset.date);
        const dateB = new Date(b.dataset.date);
        return sortOrder === "asc" ? dateA - dateB : dateB - dateA;
      });
  
      sortedGroups.forEach(group => container.appendChild(group));
    }
  
    function scrollToUpcoming() {
      const container = document.getElementById("fixturesSection");
      const upcoming = container.querySelector(".status-upcoming");
      if (upcoming) {
        const group = upcoming.closest(".fixtureGroup");
        if (group) {
          container.scrollTop = group.offsetTop - container.offsetTop;
        }
      }
    }
  
    const innerTabs = document.querySelectorAll(".innerTab");
    innerTabs.forEach(tab => {
      tab.addEventListener("click", () => {
        innerTabs.forEach(t => t.classList.remove("active"));
        tab.classList.add("active");
  
        document.querySelectorAll(".statsTable").forEach(table => {
          table.style.display = "none";
        });
  
        const target = tab.dataset.target;
        document.getElementById(target).style.display = "table";
      });
    });
  
    // On initial load
    const activeTab = document.querySelector(".tab.active");
    if (activeTab && activeTab.textContent === "Fixtures") {
      fixturesSection.style.display = "block";
      scrollToUpcoming();
    }
    document.getElementById("sortOrder").addEventListener("change", sortFixturesByDate);

  });
  