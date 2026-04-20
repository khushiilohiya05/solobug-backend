const BASE_URL = "";

const userData = localStorage.getItem("solobugUser");

if (!userData) {
  window.location.href = "login.html";
}

const currentUser = JSON.parse(userData);
document.getElementById("navUser").textContent = currentUser.name;

const reportRangeFilter = document.getElementById("reportRangeFilter");
const exportReportBtn = document.getElementById("exportReportBtn");
const printReportMetaText = document.getElementById("printReportMetaText");

document.getElementById("logoutBtn").addEventListener("click", function () {
  localStorage.removeItem("solobugUser");
  showToast("success", "Logged out", "You have been signed out successfully.");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 900);
});

/* ================= DATE FIX (SAME AS BUGS.JS) ================= */

function getBugCreatedDateValue(bug) {
  return (
    bug.createdAt ??
    bug.createdOn ??
    bug.createdDate ??
    bug.created_at ??
    bug.dateCreated ??
    bug.creationDate ??
    bug.createdTime ??
    bug.timestamp ??
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

    return new Date(
      year,
      month - 1,
      day,
      hour,
      minute,
      second,
      Math.floor(nano / 1000000)
    );
  }

  if (typeof dateValue === "object") {
    const year = dateValue.year;
    const month = dateValue.monthValue || dateValue.month;
    const day = dateValue.dayOfMonth || dateValue.day;

    if (year && month && day) {
      return new Date(year, month - 1, day);
    }
  }

  return null;
}

/* ================= REPORT LOGIC ================= */

function getRangeLabel(rangeValue) {
  if (rangeValue === "7") return "Last 7 Days";
  if (rangeValue === "30") return "Last 30 Days";
  return "All Time";
}

function updatePrintMeta() {
  const now = new Date();

  const formattedNow = now.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });

  const rangeLabel = getRangeLabel(reportRangeFilter.value);

  printReportMetaText.textContent =
    `Generated for ${currentUser.name} • Range: ${rangeLabel} • Generated on ${formattedNow}`;
}

/* ✅ FIXED FILTER */
function filterBugsByRange(bugs, rangeValue) {
  if (rangeValue === "all") return bugs;

  const days = parseInt(rangeValue, 10);
  const now = new Date();

  return bugs.filter((bug) => {
    const rawDate = getBugCreatedDateValue(bug);
    const parsedDate = normalizeDateInput(rawDate);

    if (!parsedDate) return false;

    const diffTime = now - parsedDate;
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    return diffDays <= days;
  });
}

function setOverviewStats(projects, bugs) {
  const totalProjects = projects.length;
  const totalBugs = bugs.length;
  const openBugs = bugs.filter(b => b.status === "Open").length;
  const resolvedBugs = bugs.filter(b => b.status === "Resolved").length;
  const criticalBugs = bugs.filter(b => b.severity === "Critical").length;

  document.getElementById("reportTotalProjects").textContent = totalProjects;
  document.getElementById("reportTotalBugs").textContent = totalBugs;
  document.getElementById("reportOpenBugs").textContent = openBugs;
  document.getElementById("reportResolvedBugs").textContent = resolvedBugs;
  document.getElementById("reportCriticalBugs").textContent = criticalBugs;

  const completionRate = totalBugs === 0 ? 0 : Math.round((resolvedBugs / totalBugs) * 100);
  document.getElementById("completionRate").textContent = `${completionRate}%`;

  let openPressure = "Low";
  if (openBugs >= 5) openPressure = "High";
  else if (openBugs >= 2) openPressure = "Medium";

  document.getElementById("openPressure").textContent = openPressure;

  let criticalRisk = "Low";
  if (criticalBugs >= 3) criticalRisk = "High";
  else if (criticalBugs >= 1) criticalRisk = "Medium";

  document.getElementById("criticalRisk").textContent = criticalRisk;
}

function renderProjectSummary(projects, bugs) {
  const projectSummaryEmpty = document.getElementById("projectSummaryEmpty");
  const projectSummaryList = document.getElementById("projectSummaryList");

  projectSummaryList.innerHTML = "";

  if (!projects || projects.length === 0) {
    projectSummaryEmpty.style.display = "block";
    projectSummaryList.style.display = "none";
    return;
  }

  projectSummaryEmpty.style.display = "none";
  projectSummaryList.style.display = "flex";

  projects.forEach(project => {
    const projectBugs = bugs.filter(b => b.project && b.project.id === project.id);

    const total = projectBugs.length;
    const open = projectBugs.filter(b => b.status === "Open").length;
    const resolved = projectBugs.filter(b => b.status === "Resolved").length;
    const critical = projectBugs.filter(b => b.severity === "Critical").length;

    const item = document.createElement("div");
    item.className = "project-summary-item";

    item.innerHTML = `
      <h3>${project.title}</h3>
      <div class="project-summary-meta">
        <span class="summary-chip chip-total">Total: ${total}</span>
        <span class="summary-chip chip-open">Open: ${open}</span>
        <span class="summary-chip chip-resolved">Resolved: ${resolved}</span>
        <span class="summary-chip chip-critical">Critical: ${critical}</span>
      </div>
    `;

    projectSummaryList.appendChild(item);
  });
}

async function loadReportData() {
  try {
    const [projectsResponse, bugsResponse] = await Promise.all([
      fetch(`${BASE_URL}/api/projects/user/${currentUser.id}`),
      fetch(`${BASE_URL}/api/bugs/user/${currentUser.id}`)
    ]);

    const projects = await projectsResponse.json();
    const allBugs = await bugsResponse.json();

    if (projectsResponse.ok && bugsResponse.ok) {
      const filteredBugs = filterBugsByRange(allBugs, reportRangeFilter.value);

      setOverviewStats(projects, filteredBugs);
      renderProjectSummary(projects, filteredBugs);
      updatePrintMeta();
    } else {
      showToast("error", "Load failed", "Could not load report data.");
    }
  } catch (error) {
    console.error("Report load error:", error);
    showToast("error", "Load failed", "Something went wrong while loading report data.");
  }
}

reportRangeFilter.addEventListener("change", loadReportData);

exportReportBtn.addEventListener("click", function () {
  updatePrintMeta();
  window.print();
});

loadReportData();