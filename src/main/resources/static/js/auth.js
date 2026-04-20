const BASE_URL = "";

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");

if (signupForm) {
  signupForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const name = document.getElementById("signupName").value.trim();
    const email = document.getElementById("signupEmail").value.trim();
    const password = document.getElementById("signupPassword").value.trim();

    const signupData = { name, email, password };

    try {
      const response = await fetch(`${BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(signupData)
      });

      const message = await response.text();

      if (response.ok) {
        showToast("success", "Account created", message);
        signupForm.reset();

        setTimeout(() => {
          window.location.href = "login.html";
        }, 1200);
      } else {
        showToast("error", "Signup failed", message);
      }
    } catch (error) {
      console.error("Signup error:", error);
      showToast("error", "Signup failed", "Something went wrong while creating your account.");
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value.trim();

    const loginData = { email, password };

    try {
      const response = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(loginData)
      });

      const contentType = response.headers.get("content-type");
      let data;

      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        data = await response.text();
      }

      if (response.ok) {
        localStorage.setItem("solobugUser", JSON.stringify(data));
        showToast("success", "Login successful", data.message || "Welcome back to SoloBug.");

        setTimeout(() => {
          window.location.href = "dashboard.html";
        }, 1000);
      } else {
        showToast("error", "Login failed", typeof data === "string" ? data : "Invalid email or password.");
      }
    } catch (error) {
      console.error("Login error:", error);
      showToast("error", "Login failed", "Something went wrong while logging in.");
    }
  });
}