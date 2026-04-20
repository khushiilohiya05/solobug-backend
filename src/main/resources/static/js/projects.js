const BASE_URL = "";

const userData = localStorage.getItem("solobugUser");

if (!userData) {
  window.location.href = "login.html";
}

const currentUser = JSON.parse(userData);
document.getElementById("navUser").textContent = currentUser.name;

const logoutBtn = document.getElementById("logoutBtn");
const openProjectModalBtn = document.getElementById("openProjectModalBtn");
const closeProjectModalBtn = document.getElementById("closeProjectModalBtn");
const cancelProjectBtn = document.getElementById("cancelProjectBtn");
const projectModal = document.getElementById("projectModal");
const projectForm = document.getElementById("projectForm");
const projectsGrid = document.getElementById("projectsGrid");
const projectsEmptyState = document.getElementById("projectsEmptyState");

const editProjectModal = document.getElementById("editProjectModal");
const closeEditProjectModalBtn = document.getElementById("closeEditProjectModalBtn");
const cancelEditProjectBtn = document.getElementById("cancelEditProjectBtn");
const editProjectForm = document.getElementById("editProjectForm");

const deleteProjectModal = document.getElementById("deleteProjectModal");
const closeDeleteProjectModalBtn = document.getElementById("closeDeleteProjectModalBtn");
const cancelDeleteProjectBtn = document.getElementById("cancelDeleteProjectBtn");
const confirmDeleteProjectBtn = document.getElementById("confirmDeleteProjectBtn");
const deleteProjectText = document.getElementById("deleteProjectText");

const projectSearch = document.getElementById("projectSearch");
const projectSort = document.getElementById("projectSort");

let allProjects = [];
let pendingDeleteProjectId = null;
let pendingDeleteProjectTitle = "";

logoutBtn.addEventListener("click", function () {
  localStorage.removeItem("solobugUser");
  showToast("success", "Logged out", "You have been signed out successfully.");

  setTimeout(() => {
    window.location.href = "login.html";
  }, 900);
});

function openProjectModal() {
  projectModal.classList.add("active");
}

function closeProjectModal() {
  projectModal.classList.remove("active");
  projectForm.reset();
}

function openEditProjectModal() {
  editProjectModal.classList.add("active");
}

function closeEditProjectModal() {
  editProjectModal.classList.remove("active");
  editProjectForm.reset();
}

function openDeleteProjectModal(projectId, projectTitle) {
  pendingDeleteProjectId = projectId;
  pendingDeleteProjectTitle = projectTitle;
  deleteProjectText.innerHTML = `You are about to delete <strong>${projectTitle}</strong>. All linked bugs may also be affected.`;
  deleteProjectModal.classList.add("active");
}

function closeDeleteProjectModal() {
  deleteProjectModal.classList.remove("active");
  pendingDeleteProjectId = null;
  pendingDeleteProjectTitle = "";
  deleteProjectText.innerHTML = "";
}

openProjectModalBtn.addEventListener("click", openProjectModal);
closeProjectModalBtn.addEventListener("click", closeProjectModal);
cancelProjectBtn.addEventListener("click", closeProjectModal);

closeEditProjectModalBtn.addEventListener("click", closeEditProjectModal);
cancelEditProjectBtn.addEventListener("click", closeEditProjectModal);

closeDeleteProjectModalBtn.addEventListener("click", closeDeleteProjectModal);
cancelDeleteProjectBtn.addEventListener("click", closeDeleteProjectModal);

projectModal.addEventListener("click", function (e) {
  if (e.target === projectModal) closeProjectModal();
});

editProjectModal.addEventListener("click", function (e) {
  if (e.target === editProjectModal) closeEditProjectModal();
});

deleteProjectModal.addEventListener("click", function (e) {
  if (e.target === deleteProjectModal) closeDeleteProjectModal();
});

function getProjectCreatedDateValue(project) {
  return (
    project.createdAt ??
    project.createdOn ??
    project.createdDate ??
    project.created_at ??
    project.dateCreated ??
    project.creationDate ??
    project.createdTime ??
    project.timestamp ??
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

function getDateTimestamp(project) {
  const parsedDate = normalizeDateInput(getProjectCreatedDateValue(project));
  return parsedDate ? parsedDate.getTime() : 0;
}

function getFilteredAndSortedProjects() {
  let filteredProjects = [...allProjects];

  const searchValue = projectSearch.value.trim().toLowerCase();
  const sortValue = projectSort.value;

  if (searchValue) {
    filteredProjects = filteredProjects.filter((project) =>
      (project.title || "").toLowerCase().includes(searchValue)
    );
  }

  if (sortValue === "latest") {
    filteredProjects.sort((a, b) => getDateTimestamp(b) - getDateTimestamp(a));
  } else if (sortValue === "oldest") {
    filteredProjects.sort((a, b) => getDateTimestamp(a) - getDateTimestamp(b));
  } else if (sortValue === "title") {
    filteredProjects.sort((a, b) => (a.title || "").localeCompare(b.title || ""));
  }

  return filteredProjects;
}

function renderProjects(projects) {
  projectsGrid.innerHTML = "";

  if (!projects || projects.length === 0) {
    projectsEmptyState.style.display = "block";
    projectsGrid.style.display = "none";
    return;
  }

  projectsEmptyState.style.display = "none";
  projectsGrid.style.display = "grid";

  projects.forEach((project) => {
    const createdDateValue = getProjectCreatedDateValue(project);

    const card = document.createElement("div");
    card.className = "project-card";

    card.innerHTML = `
      <div class="project-card-header">
        <h3>${project.title || ""}</h3>
      </div>
      <div class="project-tech">${project.techStack ? project.techStack : "No tech stack added"}</div>
      <div class="project-description">
        ${project.description ? project.description : "No description added for this project yet."}
      </div>
      <div class="project-footer">
        <div class="project-date">Created on ${formatDate(createdDateValue)}</div>
        <div style="display:flex; gap:10px; flex-wrap:wrap;">
          <button class="btn project-edit-btn" data-project-edit-id="${project.id}" style="padding:9px 14px; font-size:13px;">Edit</button>
          <button class="delete-btn" data-project-id="${project.id}" data-project-title="${project.title}">Delete</button>
        </div>
      </div>
    `;

    projectsGrid.appendChild(card);
  });

  attachProjectDeleteListeners();
  attachProjectEditListeners();
}

function refreshProjectView() {
  renderProjects(getFilteredAndSortedProjects());
}

function attachProjectDeleteListeners() {
  const deleteButtons = document.querySelectorAll(".delete-btn");

  deleteButtons.forEach((button) => {
    button.addEventListener("click", function () {
      const projectId = this.getAttribute("data-project-id");
      const projectTitle = this.getAttribute("data-project-title");
      openDeleteProjectModal(projectId, projectTitle);
    });
  });
}

confirmDeleteProjectBtn.addEventListener("click", async function () {
  if (!pendingDeleteProjectId) return;

  try {
    const response = await fetch(`${BASE_URL}/api/projects/${pendingDeleteProjectId}`, {
      method: "DELETE"
    });

    const message = await response.text();

    if (response.ok) {
      closeDeleteProjectModal();
      showToast("success", "Project deleted", message);
      await loadProjects();
    } else {
      showToast("error", "Delete failed", message);
    }
  } catch (error) {
    console.error("Delete project error:", error);
    showToast("error", "Delete failed", "Something went wrong while deleting the project.");
  }
});

function attachProjectEditListeners() {
  const editButtons = document.querySelectorAll("[data-project-edit-id]");

  editButtons.forEach((button) => {
    button.addEventListener("click", async function () {
      const projectId = this.getAttribute("data-project-edit-id");
      await loadProjectForEdit(projectId);
    });
  });
}

async function loadProjectForEdit(projectId) {
  try {
    const response = await fetch(`${BASE_URL}/api/projects/${projectId}`);
    const project = await response.json();

    if (!response.ok) {
      showToast("error", "Load failed", "Could not load project for editing.");
      return;
    }

    document.getElementById("editProjectId").value = project.id;
    document.getElementById("editProjectTitle").value = project.title || "";
    document.getElementById("editProjectDescription").value = project.description || "";
    document.getElementById("editProjectTechStack").value = project.techStack || "";

    openEditProjectModal();
  } catch (error) {
    console.error("Load project edit error:", error);
    showToast("error", "Load failed", "Something went wrong while loading project data.");
  }
}

async function loadProjects() {
  try {
    const response = await fetch(`${BASE_URL}/api/projects/user/${currentUser.id}`);
    const data = await response.json();

    if (response.ok) {
      allProjects = data;
      refreshProjectView();
    } else {
      showToast("error", "Load failed", "Could not load projects.");
    }
  } catch (error) {
    console.error("Load projects error:", error);
    showToast("error", "Load failed", "Something went wrong while loading projects.");
  }
}

projectSearch.addEventListener("input", refreshProjectView);
projectSort.addEventListener("change", refreshProjectView);

projectForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const title = document.getElementById("projectTitle").value.trim();
  const description = document.getElementById("projectDescription").value.trim();
  const techStack = document.getElementById("projectTechStack").value.trim();

  const projectData = {
    title,
    description,
    techStack,
    userId: currentUser.id
  };

  try {
    const response = await fetch(`${BASE_URL}/api/projects`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(projectData)
    });

    const message = await response.text();

    if (response.ok) {
      showToast("success", "Project created", message);
      closeProjectModal();
      await loadProjects();
    } else {
      showToast("error", "Create failed", message);
    }
  } catch (error) {
    console.error("Create project error:", error);
    showToast("error", "Create failed", "Something went wrong while creating the project.");
  }
});

editProjectForm.addEventListener("submit", async function (e) {
  e.preventDefault();

  const projectId = document.getElementById("editProjectId").value;

  const payload = {
    title: document.getElementById("editProjectTitle").value.trim(),
    description: document.getElementById("editProjectDescription").value.trim(),
    techStack: document.getElementById("editProjectTechStack").value.trim()
  };

  try {
    const response = await fetch(`${BASE_URL}/api/projects/${projectId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const message = await response.text();

    if (response.ok) {
      showToast("success", "Project updated", message);
      closeEditProjectModal();
      await loadProjects();
    } else {
      showToast("error", "Update failed", message);
    }
  } catch (error) {
    console.error("Update project error:", error);
    showToast("error", "Update failed", "Something went wrong while updating the project.");
  }
});

loadProjects();