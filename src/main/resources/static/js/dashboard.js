const BASE_URL = "";

const userData = localStorage.getItem("solobugUser");

if (!userData) {
  window.location.href = "login.html";
}

const currentUser = JSON.parse(userData);

document.getElementById("navUser").textContent = currentUser.name;

document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("solobugUser");

  showToast("success", "Logged out", "You have been signed out successfully.");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 800);
});

function goToProjects() {
  window.location.href = "projects.html";
}

function goToBugs() {
  window.location.href = "bugs.html";
}

function goToReports() {
  window.location.href = "report.html";
}

function getCreatedDateValue(item) {
  return (
    item.createdAt ??
    item.createdOn ??
    item.createdDate ??
    item.created_at ??
    item.dateCreated ??
    item.creationDate ??
    item.createdTime ??
    item.timestamp ??
    null
  );
}

function normalizeDateInput(dateValue) {
  if (!dateValue) return null;

  if (dateValue instanceof Date) {
    return isNaN(dateValue.getTime()) ? null : dateValue;
  }

  if (typeof dateValue === "string" || typeof dateValue === "number") {
    const parsed = new Date(dateValue);
    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (Array.isArray(dateValue)) {
    const [
      year,
      month,
      day,
      hour = 0,
      minute = 0,
      second = 0,
      nano = 0
    ] = dateValue;

    if (!year || !month || !day) return null;

    const parsed = new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      Math.floor(nano / 1000000)
    );

    return isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof dateValue === "object") {
    const year = dateValue.year;
    const month = dateValue.monthValue || dateValue.month;
    const day = dateValue.dayOfMonth || dateValue.day;
    const hour = dateValue.hour || 0;
    const minute = dateValue.minute || 0;
    const second = dateValue.second || 0;
    const nano = dateValue.nano || 0;

    if (year && month && day) {
      const parsed = new Date(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
        Math.floor(nano / 1000000)
      );

      return isNaN(parsed.getTime()) ? null : parsed;
    }
  }

  return null;
}

function formatDate(dateValue) {
  const parsedDate = normalizeDateInput(dateValue);

  if (!parsedDate) {
    return "Date not available";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function renderRecentProjects(projects) {
  const recentProjectsList = document.getElementById("recentProjectsList");
  const recentProjectsEmpty = document.getElementById("recentProjectsEmpty");

  recentProjectsList.innerHTML = "";

  if (!projects || projects.length === 0) {
    recentProjectsEmpty.style.display = "block";
    recentProjectsList.style.display = "none";
    return;
  }

  recentProjectsEmpty.style.display = "none";
  recentProjectsList.style.display = "flex";

  const recentProjects = projects.slice(0, 3);

  recentProjects.forEach((project) => {
    const item = document.createElement("div");
    item.className = "recent-project-item";

    item.innerHTML = `
      <h3>${project.title || ""}</h3>
      <p>${project.description ? project.description : "No description added for this project yet."}</p>
      <div class="recent-project-meta">Created on ${formatDate(getCreatedDateValue(project))}</div>
    `;

    recentProjectsList.appendChild(item);
  });
}

function getSeverityBadgeClass(severity) {
  if (severity === "Low") return "badge-low";
  if (severity === "Medium") return "badge-medium";
  return "badge-critical";
}

function getStatusBadgeClass(status) {
  if (status === "Open") return "badge-open";
  if (status === "In Progress") return "badge-progress";
  return "badge-resolved";
}

function renderRecentBugs(bugs) {
  const recentBugsList = document.getElementById("recentBugsList");
  const recentBugsEmpty = document.getElementById("recentBugsEmpty");

  recentBugsList.innerHTML = "";

  if (!bugs || bugs.length === 0) {
    recentBugsEmpty.style.display = "block";
    recentBugsList.style.display = "none";
    return;
  }

  recentBugsEmpty.style.display = "none";
  recentBugsList.style.display = "flex";

  const recentBugs = bugs.slice(0, 4);

  recentBugs.forEach((bug) => {
    const item = document.createElement("div");
    item.className = "recent-bug-item";

    item.innerHTML = `
      <h3>${bug.title || ""}</h3>
      <div class="recent-bug-meta-row">
        <span class="badge ${getSeverityBadgeClass(bug.severity)}">${bug.severity}</span>
        <span class="badge ${getStatusBadgeClass(bug.status)}">${bug.status}</span>
      </div>
      <p>${bug.description ? bug.description : "No description added for this bug yet."}</p>
      <div class="recent-bug-meta">Created on ${formatDate(getCreatedDateValue(bug))}</div>
    `;

    recentBugsList.appendChild(item);
  });
}

function renderHighestRiskProject(projects, bugs) {
  const emptyState = document.getElementById("highestRiskProjectEmpty");
  const card = document.getElementById("highestRiskProjectCard");

  if (!projects || projects.length === 0 || !bugs || bugs.length === 0) {
    emptyState.style.display = "block";
    card.style.display = "none";
    card.innerHTML = "";
    return;
  }

  let highestRiskProject = null;
  let highestRiskScore = -1;

  projects.forEach((project) => {
    const projectBugs = bugs.filter((bug) => bug.project && bug.project.id === project.id);
    const openCount = projectBugs.filter((bug) => bug.status === "Open").length;
    const criticalCount = projectBugs.filter((bug) => bug.severity === "Critical").length;

    const riskScore = openCount + (criticalCount * 2);

    if (riskScore > highestRiskScore) {
      highestRiskScore = riskScore;
      highestRiskProject = {
        project,
        total: projectBugs.length,
        open: openCount,
        critical: criticalCount
      };
    }
  });

  if (!highestRiskProject || highestRiskScore <= 0) {
    emptyState.style.display = "block";
    card.style.display = "none";
    card.innerHTML = "";
    return;
  }

  emptyState.style.display = "none";
  card.style.display = "block";

  const projectTitle = highestRiskProject.project.title || "Untitled Project";

  card.innerHTML = `
    <div class="risk-card-top">
      <div class="risk-project-title-wrap">
        <span class="risk-label">Needs Attention</span>
        <h3 class="risk-project-title">${projectTitle}</h3>
        <p class="risk-project-description">
          This project currently shows the highest issue pressure based on open and critical bugs.
        </p>
      </div>
    </div>

    <div class="risk-chip-row">
      <span class="risk-chip risk-chip-total">Total: ${highestRiskProject.total}</span>
      <span class="risk-chip risk-chip-open">Open: ${highestRiskProject.open}</span>
      <span class="risk-chip risk-chip-critical">Critical: ${highestRiskProject.critical}</span>
    </div>
  `;
}

async function loadProjectData() {
  const response = await fetch(`${BASE_URL}/api/projects/user/${currentUser.id}`);
  return await response.json();
}

async function loadBugData() {
  const response = await fetch(`${BASE_URL}/api/bugs/user/${currentUser.id}`);
  return await response.json();
}

async function loadBugStats() {
  const response = await fetch(`${BASE_URL}/api/bugs/counts/${currentUser.id}`);
  return await response.json();
}

async function loadDashboardData() {
  try {
    const [projects, bugs, bugStats] = await Promise.all([
      loadProjectData(),
      loadBugData(),
      loadBugStats()
    ]);

    document.getElementById("totalProjects").textContent = projects.length ?? 0;
    document.getElementById("totalBugs").textContent = bugStats.totalBugs ?? 0;
    document.getElementById("openBugs").textContent = bugStats.openBugs ?? 0;
    document.getElementById("resolvedBugs").textContent = bugStats.resolvedBugs ?? 0;
    document.getElementById("criticalBugs").textContent = bugStats.criticalBugs ?? 0;

    renderRecentProjects(projects);
    renderRecentBugs(bugs);
    renderHighestRiskProject(projects, bugs);
  } catch (error) {
    console.error("Dashboard load error:", error);
    showToast("error", "Dashboard error", "Something went wrong while loading dashboard data.");
  }
}

loadDashboardData();