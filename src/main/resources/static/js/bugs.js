const BASE_URL = "";

const userData = localStorage.getItem("solobugUser");
if (!userData) {
  window.location.href = "login.html";
}

const currentUser = JSON.parse(userData);
document.getElementById("navUser").textContent = currentUser.name;

const logoutBtn = document.getElementById("logoutBtn");
const projectFilter = document.getElementById("projectFilter");
const bugProject = document.getElementById("bugProject");
const openBugModalBtn = document.getElementById("openBugModalBtn");
const closeBugModalBtn = document.getElementById("closeBugModalBtn");
const cancelBugBtn = document.getElementById("cancelBugBtn");
const bugModal = document.getElementById("bugModal");
const bugForm = document.getElementById("bugForm");
const bugsList = document.getElementById("bugsList");
const bugsEmptyState = document.getElementById("bugsEmptyState");
const severityFilter = document.getElementById("severityFilter");
const statusFilter = document.getElementById("statusFilter");
const searchBug = document.getElementById("searchBug");
const smartBugInsight = document.getElementById("smartBugInsight");

const bugDetailModal = document.getElementById("bugDetailModal");
const closeBugDetailModalBtn = document.getElementById("closeBugDetailModalBtn");
const bugDetailContent = document.getElementById("bugDetailContent");

const editBugModal = document.getElementById("editBugModal");
const closeEditBugModalBtn = document.getElementById("closeEditBugModalBtn");
const cancelEditBugBtn = document.getElementById("cancelEditBugBtn");
const editBugForm = document.getElementById("editBugForm");

const deleteBugModal = document.getElementById("deleteBugModal");
const closeDeleteBugModalBtn = document.getElementById("closeDeleteBugModalBtn");
const cancelDeleteBugBtn = document.getElementById("cancelDeleteBugBtn");
const confirmDeleteBugBtn = document.getElementById("confirmDeleteBugBtn");
const deleteBugText = document.getElementById("deleteBugText");

let allProjects = [];
let currentBugs = [];
let pendingDeleteBugId = null;
let pendingDeleteBugTitle = "";

logoutBtn.addEventListener("click", function () {
  localStorage.removeItem("solobugUser");
  showToast("success", "Logged out", "You have been signed out successfully.");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 900);
});

function escapeHtml(value) {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function openBugModal() {
  if (allProjects.length === 0) {
    showToast("info", "No projects found", "Create a project first before adding bugs.");
    return;
  }

  const selectedProjectId = projectFilter.value;
  if (selectedProjectId) {
    bugProject.value = selectedProjectId;
  }

  smartBugInsight.style.display = "none";
  smartBugInsight.innerHTML = "";
  bugModal.classList.add("active");
}

function closeBugModal() {
  bugModal.classList.remove("active");
  bugForm.reset();
  smartBugInsight.style.display = "none";
  smartBugInsight.innerHTML = "";
}

function openBugDetailModal() {
  bugDetailModal.classList.add("active");
}

function closeBugDetailModal() {
  bugDetailModal.classList.remove("active");
  bugDetailContent.innerHTML = "";
}

function openEditBugModal() {
  editBugModal.classList.add("active");
}

function closeEditBugModal() {
  editBugModal.classList.remove("active");
  editBugForm.reset();
}

function openDeleteBugModal(bugId, bugTitle) {
  pendingDeleteBugId = bugId;
  pendingDeleteBugTitle = bugTitle;
  deleteBugText.innerHTML = `You are about to delete <strong>${escapeHtml(bugTitle)}</strong>. This action cannot be undone.`;
  deleteBugModal.classList.add("active");
}

function closeDeleteBugModal() {
  deleteBugModal.classList.remove("active");
  pendingDeleteBugId = null;
  pendingDeleteBugTitle = "";
  deleteBugText.innerHTML = "";
}

openBugModalBtn.addEventListener("click", openBugModal);
closeBugModalBtn.addEventListener("click", closeBugModal);
cancelBugBtn.addEventListener("click", closeBugModal);

closeBugDetailModalBtn.addEventListener("click", closeBugDetailModal);

closeEditBugModalBtn.addEventListener("click", closeEditBugModal);
cancelEditBugBtn.addEventListener("click", closeEditBugModal);

closeDeleteBugModalBtn.addEventListener("click", closeDeleteBugModal);
cancelDeleteBugBtn.addEventListener("click", closeDeleteBugModal);

bugModal.addEventListener("click", function (e) {
  if (e.target === bugModal) {
    closeBugModal();
  }
});

bugDetailModal.addEventListener("click", function (e) {
  if (e.target === bugDetailModal) {
    closeBugDetailModal();
  }
});

editBugModal.addEventListener("click", function (e) {
  if (e.target === editBugModal) {
    closeEditBugModal();
  }
});

deleteBugModal.addEventListener("click", function (e) {
  if (e.target === deleteBugModal) {
    closeDeleteBugModal();
  }
});

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

function formatDateTime(dateValue) {
  const parsedDate = normalizeDateInput(dateValue);

  if (!parsedDate) {
    return "Time unavailable";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
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

function renderProjectsInDropdown(projects) {
  projectFilter.innerHTML = `<option value="">Select Project</option>`;
  bugProject.innerHTML = `<option value="">Select Project</option>`;

  projects.forEach((project) => {
    const option1 = document.createElement("option");
    option1.value = project.id;
    option1.textContent = project.title;
    projectFilter.appendChild(option1);

    const option2 = document.createElement("option");
    option2.value = project.id;
    option2.textContent = project.title;
    bugProject.appendChild(option2);
  });
}

function getScreenshotUrl(filePath) {
  return `${BASE_URL}/uploads/${filePath}`;
}

function renderBugs(bugs) {
  bugsList.innerHTML = "";

  if (!bugs || bugs.length === 0) {
    bugsEmptyState.style.display = "block";
    bugsList.style.display = "none";
    return;
  }

  bugsEmptyState.style.display = "none";
  bugsList.style.display = "flex";

  bugs.forEach((bug) => {
    const screenshotHtml =
      bug.attachments && bug.attachments.length > 0
        ? `
          <div class="bug-screenshot">
            <img src="${getScreenshotUrl(bug.attachments[0].filePath)}" alt="Bug Screenshot" />
          </div>
        `
        : "";

    const analysis = bug.analysis;

    const analysisPreview = analysis
      ? `
        <div class="bug-ai-preview">
          <div class="bug-ai-preview-title">⚡ AI Insight</div>
          <div><strong>Issue:</strong> ${escapeHtml(analysis.detectedIssue || "N/A")}</div>
          <div><strong>Confidence:</strong> ${escapeHtml(analysis.confidence || "N/A")}</div>
        </div>
      `
      : "";

    const createdDateValue = getBugCreatedDateValue(bug);

    const bugCard = document.createElement("div");
    bugCard.className = "bug-card";

    bugCard.innerHTML = `
      <div class="bug-top-row">
        <div>
          <div class="bug-title">${escapeHtml(bug.title)}</div>
          <div class="bug-meta-row">
            <span class="badge ${getSeverityBadgeClass(bug.severity)}">${escapeHtml(bug.severity)}</span>
            <span class="badge ${getStatusBadgeClass(bug.status)}">${escapeHtml(bug.status)}</span>
          </div>
        </div>
        <div class="bug-date">Created on ${formatDate(createdDateValue)}</div>
      </div>

      ${analysisPreview}

      <div class="bug-description">
        <span class="bug-section-title">Description:</span>
        ${bug.description ? escapeHtml(bug.description) : "No description added."}
      </div>

      <div class="bug-steps">
        <span class="bug-section-title">Steps:</span>
        ${bug.stepsToReproduce ? escapeHtml(bug.stepsToReproduce) : "No reproduction steps added."}
      </div>

      ${screenshotHtml}

      <div class="bug-bottom-row">
        <div class="status-update-group">
          <label for="status-${bug.id}">Update Status</label>
          <select class="status-update-select" id="status-${bug.id}" data-bug-id="${bug.id}">
            <option value="Open" ${bug.status === "Open" ? "selected" : ""}>Open</option>
            <option value="In Progress" ${bug.status === "In Progress" ? "selected" : ""}>In Progress</option>
            <option value="Resolved" ${bug.status === "Resolved" ? "selected" : ""}>Resolved</option>
          </select>
        </div>

        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="detail-view-btn" data-bug-detail-id="${bug.id}">View Details</button>
          <button class="detail-view-btn bug-edit-btn" data-bug-edit-id="${bug.id}">Edit</button>
          <button class="delete-btn" data-bug-id="${bug.id}" data-bug-title="${escapeHtml(bug.title)}">Delete</button>
        </div>
      </div>
    `;

    bugsList.appendChild(bugCard);
  });

  attachStatusUpdateListeners();
  attachBugDeleteListeners();
  attachBugDetailListeners();
  attachBugEditListeners();
}

function applyFilters() {
  const searchValue = searchBug.value.trim().toLowerCase();
  const severityValue = severityFilter.value;
  const statusValue = statusFilter.value;

  const filteredBugs = currentBugs.filter((bug) => {
    const matchesSearch = (bug.title || "").toLowerCase().includes(searchValue);
    const matchesSeverity = severityValue === "" || bug.severity === severityValue;
    const matchesStatus = statusValue === "" || bug.status === statusValue;

    return matchesSearch && matchesSeverity && matchesStatus;
  });

  renderBugs(filteredBugs);
}

function attachStatusUpdateListeners() {
  document.querySelectorAll(".status-update-select").forEach((select) => {
    select.addEventListener("change", async function () {
      const bugId = this.getAttribute("data-bug-id");
      const newStatus = this.value;
      const selectedProjectId = projectFilter.value;

      try {
        const response = await fetch(
          `${BASE_URL}/api/bugs/${bugId}/status?status=${encodeURIComponent(newStatus)}`,
          { method: "PUT" }
        );

        const message = await response.text();

        if (response.ok) {
          showToast("success", "Status updated", message);
          await loadBugsByProject(selectedProjectId);
        } else {
          showToast("error", "Update failed", message);
        }
      } catch (error) {
        console.error("Status update error:", error);
        showToast("error", "Update failed", "Something went wrong while updating bug status.");
      }
    });
  });
}

function attachBugDeleteListeners() {
  document.querySelectorAll(".delete-btn").forEach((button) => {
    button.addEventListener("click", function () {
      const bugId = this.getAttribute("data-bug-id");
      const bugTitle = this.getAttribute("data-bug-title");
      openDeleteBugModal(bugId, bugTitle);
    });
  });
}

confirmDeleteBugBtn.addEventListener("click", async function () {
  if (!pendingDeleteBugId) return;

  const selectedProjectId = projectFilter.value;

  try {
    const response = await fetch(`${BASE_URL}/api/bugs/${pendingDeleteBugId}`, {
      method: "DELETE"
    });

    const message = await response.text();

    if (response.ok) {
      closeDeleteBugModal();
      showToast("success", "Bug deleted", message);
      await loadBugsByProject(selectedProjectId);
    } else {
      showToast("error", "Delete failed", message);
    }
  } catch (error) {
    console.error("Delete bug error:", error);
    showToast("error", "Delete failed", "Something went wrong while deleting the bug.");
  }
});

function attachBugDetailListeners() {
  document.querySelectorAll("[data-bug-detail-id]").forEach((button) => {
    button.addEventListener("click", async function () {
      const bugId = this.getAttribute("data-bug-detail-id");
      await loadBugDetails(bugId);
    });
  });
}

function attachBugEditListeners() {
  document.querySelectorAll("[data-bug-edit-id]").forEach((button) => {
    button.addEventListener("click", async function () {
      const bugId = this.getAttribute("data-bug-edit-id");
      await loadBugForEdit(bugId);
    });
  });
}

async function loadBugDetails(bugId) {
  try {
    const [bugResponse, logsResponse] = await Promise.all([
      fetch(`${BASE_URL}/api/bugs/${bugId}`),
      fetch(`${BASE_URL}/api/bugs/${bugId}/status-logs`)
    ]);

    const bug = await bugResponse.json();
    const logs = await logsResponse.json();

    if (!bugResponse.ok || !logsResponse.ok) {
      showToast("error", "Load failed", "Could not load bug details.");
      return;
    }

    const screenshotHtml =
      bug.attachments && bug.attachments.length > 0
        ? `<img src="${getScreenshotUrl(bug.attachments[0].filePath)}" alt="Bug Screenshot" style="width:100%; max-width:420px; border-radius:16px; border:1px solid #e5e7eb;" />`
        : `<p>No screenshot uploaded.</p>`;

    const codeSnippetHtml = bug.codeSnippet
      ? `<pre style="white-space:pre-wrap; font-size:13px; line-height:1.7; color:#334155;">${escapeHtml(bug.codeSnippet)}</pre>`
      : `<p>No code snippet added.</p>`;

    const improvedCodeHtml =
      bug.analysis && bug.analysis.improvedCode && bug.analysis.improvedCode !== "No code snippet provided."
        ? `<pre style="white-space:pre-wrap; font-size:13px; line-height:1.7; color:#334155;">${escapeHtml(bug.analysis.improvedCode)}</pre>`
        : `<p>No improved code available.</p>`;

    const logsHtml = logs.length
      ? logs
          .map((log) => {
            const statusText = log.oldStatus
              ? `${escapeHtml(log.oldStatus)} → ${escapeHtml(log.newStatus)}`
              : `Created as ${escapeHtml(log.newStatus)}`;

            return `
              <div class="status-history-item">
                <strong>${statusText}</strong>
                <span>${formatDateTime(log.changedAt)}</span>
              </div>
            `;
          })
          .join("")
      : `<p>No status history found.</p>`;

    bugDetailContent.innerHTML = `
      <div class="bug-top-row" style="margin-bottom: 18px;">
        <div>
          <div class="bug-title">${escapeHtml(bug.title)}</div>
          <div class="bug-meta-row">
            <span class="badge ${getSeverityBadgeClass(bug.severity)}">${escapeHtml(bug.severity)}</span>
            <span class="badge ${getStatusBadgeClass(bug.status)}">${escapeHtml(bug.status)}</span>
          </div>
        </div>
        <div class="bug-date">Created on ${formatDate(getBugCreatedDateValue(bug))}</div>
      </div>

      <div class="bug-detail-grid">
        <div class="bug-detail-box full-width">
          <h4>Description</h4>
          <p>${bug.description ? escapeHtml(bug.description) : "No description added."}</p>
        </div>

        <div class="bug-detail-box full-width">
          <h4>Steps to Reproduce</h4>
          <p>${bug.stepsToReproduce ? escapeHtml(bug.stepsToReproduce) : "No reproduction steps added."}</p>
        </div>

        <div class="bug-detail-box full-width">
          <h4>Error / Terminal Message</h4>
          <p>${bug.terminalMessage ? escapeHtml(bug.terminalMessage) : "No terminal message added."}</p>
        </div>

        <div class="bug-detail-box full-width">
          <h4>Code Snippet</h4>
          ${codeSnippetHtml}
        </div>

        <div class="bug-detail-box">
          <h4>Project</h4>
          <p>${bug.project ? escapeHtml(bug.project.title) : "N/A"}</p>
        </div>

        <div class="bug-detail-box">
          <h4>Screenshot</h4>
          ${screenshotHtml}
        </div>

        <div class="bug-detail-box full-width">
          <h4>Smart Analysis</h4>
          <div class="analysis-grid">
            <div class="analysis-item">
              <span>Detected Issue</span>
              <strong>${bug.analysis?.detectedIssue ? escapeHtml(bug.analysis.detectedIssue) : "Not available"}</strong>
            </div>
            <div class="analysis-item">
              <span>Confidence</span>
              <strong>${bug.analysis?.confidence ? escapeHtml(bug.analysis.confidence) : "Not available"}</strong>
            </div>
            <div class="analysis-item full-width">
              <span>Probable Cause</span>
              <strong>${bug.analysis?.probableCause ? escapeHtml(bug.analysis.probableCause) : "Not available"}</strong>
            </div>
            <div class="analysis-item full-width">
              <span>Fix Suggestion</span>
              <strong>${bug.analysis?.fixSuggestion ? escapeHtml(bug.analysis.fixSuggestion) : "Not available"}</strong>
            </div>
            <div class="analysis-item full-width">
              <span>Screenshot Context</span>
              <strong>${bug.analysis?.screenshotContext ? escapeHtml(bug.analysis.screenshotContext) : "Not available"}</strong>
            </div>
          </div>
        </div>

        <div class="bug-detail-box full-width">
          <h4>Improved Code</h4>
          ${improvedCodeHtml}
        </div>

        <div class="bug-detail-box full-width">
          <h4>Status History</h4>
          <div class="status-history-list">
            ${logsHtml}
          </div>
        </div>
      </div>
    `;

    openBugDetailModal();
  } catch (error) {
    console.error("Load bug detail error:", error);
    showToast("error", "Load failed", "Something went wrong while loading bug details.");
  }
}

async function loadBugForEdit(bugId) {
  try {
    const response = await fetch(`${BASE_URL}/api/bugs/${bugId}`);
    const bug = await response.json();

    if (!response.ok) {
      showToast("error", "Load failed", "Could not load bug for editing.");
      return;
    }

    document.getElementById("editBugId").value = bug.id;
    document.getElementById("editBugTitle").value = bug.title || "";
    document.getElementById("editBugDescription").value = bug.description || "";
    document.getElementById("editBugSteps").value = bug.stepsToReproduce || "";
    document.getElementById("editBugSeverity").value = bug.severity || "Low";
    document.getElementById("editBugCodeSnippet").value = bug.codeSnippet || "";
    document.getElementById("editBugTerminalMessage").value = bug.terminalMessage || "";
    document.getElementById("editBugScreenshot").value = "";
    document.getElementById("removeBugScreenshot").checked = false;

    openEditBugModal();
  } catch (error) {
    console.error("Load bug edit error:", error);
    showToast("error", "Load failed", "Something went wrong while loading bug data.");
  }
}

async function loadProjects() {
  try {
    const response = await fetch(`${BASE_URL}/api/projects/user/${currentUser.id}`);
    const projects = await response.json();

    if (response.ok) {
      allProjects = projects;
      renderProjectsInDropdown(projects);
    } else {
      showToast("error", "Load failed", "Could not load projects.");
    }
  } catch (error) {
    console.error("Load projects error:", error);
    showToast("error", "Load failed", "Something went wrong while loading projects.");
  }
}

async function loadBugsByProject(projectId) {
  currentBugs = [];

  if (!projectId) {
    renderBugs([]);
    return;
  }

  try {
    const response = await fetch(`${BASE_URL}/api/bugs/project/${projectId}`);
    const bugs = await response.json();

    if (response.ok) {
      currentBugs = bugs;
      applyFilters();
    } else {
      showToast("error", "Load failed", "Could not load bugs.");
    }
  } catch (error) {
    console.error("Load bugs error:", error);
    showToast("error", "Load failed", "Something went wrong while loading bugs.");
  }
}

projectFilter.addEventListener("change", function () {
  searchBug.value = "";
  severityFilter.value = "";
  statusFilter.value = "";
  loadBugsByProject(projectFilter.value);
});

searchBug.addEventListener("input", applyFilters);
severityFilter.addEventListener("change", applyFilters);
statusFilter.addEventListener("change", applyFilters);

bugForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const screenshotFile = document.getElementById("bugScreenshot").files[0];

  const formData = new FormData();
  formData.append("projectId", document.getElementById("bugProject").value);
  formData.append("title", document.getElementById("bugTitle").value.trim());
  formData.append("description", document.getElementById("bugDescription").value.trim());
  formData.append("stepsToReproduce", document.getElementById("bugSteps").value.trim());
  formData.append("codeSnippet", document.getElementById("bugCodeSnippet").value.trim());
  formData.append("terminalMessage", document.getElementById("bugTerminalMessage").value.trim());
  formData.append("severity", document.getElementById("bugSeverity").value);
  formData.append("status", document.getElementById("bugStatus").value);

  if (screenshotFile) {
    formData.append("screenshot", screenshotFile);
  }

  try {
    const response = await fetch(`${BASE_URL}/api/bugs`, {
      method: "POST",
      body: formData
    });

    const contentType = response.headers.get("content-type");
    let data;

    if (contentType && contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = { message: await response.text() };
    }

    if (response.ok) {
      let insightHtml = `
        <div><strong>Suggested Severity:</strong> ${escapeHtml(data.suggestedSeverity || document.getElementById("bugSeverity").value)}</div>
        <div><strong>Detected Issue:</strong> ${escapeHtml(data.detectedIssue || "Not available")}</div>
        <div><strong>Confidence:</strong> ${escapeHtml(data.confidence || "Not available")}</div>
        <div><strong>Probable Cause:</strong> ${escapeHtml(data.probableCause || "Not available")}</div>
        <div><strong>Fix Suggestion:</strong> ${escapeHtml(data.fixSuggestion || "Not available")}</div>
        <div><strong>Screenshot Context:</strong> ${escapeHtml(data.screenshotContext || "Not available")}</div>
        <div><strong>Analysis:</strong> ${escapeHtml(data.analysisNote || "Bug created successfully.")}</div>
        <div><strong>Code Analysis:</strong> ${escapeHtml(data.codeAnalysis || "No code snippet analysis available.")}</div>
      `;

      if (data.possibleDuplicate) {
        insightHtml += `<div class="smart-bug-warning"><strong>Possible Duplicate:</strong> ${escapeHtml(data.duplicateTitle)}</div>`;
      }

      smartBugInsight.innerHTML = insightHtml;
      smartBugInsight.style.display = "block";

      showToast("success", "Bug created", data.message || "Bug created successfully.");

      const selectedProjectId = document.getElementById("bugProject").value;

      setTimeout(() => {
        closeBugModal();
        projectFilter.value = selectedProjectId;
        loadBugsByProject(selectedProjectId);
      }, 1800);
    } else {
      showToast("error", "Create failed", data.message || "Could not create bug.");
    }
  } catch (error) {
    console.error("Create bug error:", error);
    showToast("error", "Create failed", "Something went wrong while creating the bug.");
  }
});

editBugForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const bugId = document.getElementById("editBugId").value;
  const selectedProjectId = projectFilter.value;
  const replaceScreenshotFile = document.getElementById("editBugScreenshot").files[0];
  const removeScreenshot = document.getElementById("removeBugScreenshot").checked;

  const formData = new FormData();
  formData.append("title", document.getElementById("editBugTitle").value.trim());
  formData.append("description", document.getElementById("editBugDescription").value.trim());
  formData.append("stepsToReproduce", document.getElementById("editBugSteps").value.trim());
  formData.append("severity", document.getElementById("editBugSeverity").value);
  formData.append("codeSnippet", document.getElementById("editBugCodeSnippet").value.trim());
  formData.append("terminalMessage", document.getElementById("editBugTerminalMessage").value.trim());
  formData.append("removeScreenshot", String(removeScreenshot));

  if (replaceScreenshotFile) {
    formData.append("screenshot", replaceScreenshotFile);
  }

  try {
    const response = await fetch(`${BASE_URL}/api/bugs/${bugId}`, {
      method: "PUT",
      body: formData
    });

    const message = await response.text();

    if (response.ok) {
      showToast("success", "Bug updated", message);
      closeEditBugModal();
      await loadBugsByProject(selectedProjectId);
    } else {
      showToast("error", "Update failed", message);
    }
  } catch (error) {
    console.error("Update bug error:", error);
    showToast("error", "Update failed", "Something went wrong while updating the bug.");
  }
});

loadProjects();
renderBugs([]);