function showToast(type, title, message) {
  const toastContainer = document.getElementById("toastContainer");
  if (!toastContainer) return;

  const normalizedType = ["success", "error", "info"].includes(type) ? type : "info";

  const toast = document.createElement("div");
  toast.className = `toast toast-${normalizedType}`;
  toast.innerHTML = `
    <div class="toast-content">
      <div class="toast-title">${title}</div>
      <div class="toast-message">${message}</div>
    </div>
    <button class="toast-close" aria-label="Close notification">&times;</button>
  `;

  toastContainer.appendChild(toast);

  const closeBtn = toast.querySelector(".toast-close");
  closeBtn.addEventListener("click", () => {
    toast.remove();
  });

  setTimeout(() => {
    toast.remove();
  }, 3200);
}