const state = {
  token: localStorage.getItem("token") || null,
};

const el = (id) => document.getElementById(id);

function showAuthError(message) {
  const box = el("authError");
  box.textContent = message;
  box.classList.remove("hidden");
}

function clearAuthError() {
  el("authError").classList.add("hidden");
}

function setLoggedIn(token) {
  state.token = token;
  localStorage.setItem("token", token);
  el("authView").classList.add("hidden");
  el("appView").classList.remove("hidden");
  el("logoutBtn").classList.remove("hidden");
  loadEntries();
}

function setLoggedOut() {
  state.token = null;
  localStorage.removeItem("token");
  el("authView").classList.remove("hidden");
  el("appView").classList.add("hidden");
  el("logoutBtn").classList.add("hidden");
}

async function api(path, options = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(path, Object.assign({}, options, { headers }));
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) setLoggedOut();
    throw new Error(data.error || "Unbekannter Fehler.");
  }
  return data;
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function renderEntries(entries) {
  const list = el("entryList");
  const empty = el("emptyState");
  list.innerHTML = "";
  if (!entries.length) {
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "entry-item";
    li.innerHTML = `
      <div class="meta">
        <span><span class="who">${escapeHtml(entry.name)}</span> <span class="firma">${escapeHtml(entry.firma || "")}</span></span>
        <span class="time">${formatTime(entry.updatedAt)}</span>
      </div>
      <p class="thema">${escapeHtml(entry.thema)}</p>
      <p class="status">${escapeHtml(entry.status)}</p>
    `;
    list.appendChild(li);
  }
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function loadEntries() {
  try {
    const data = await api("/api/entries");
    renderEntries(data.entries);
  } catch (err) {
    console.error(err);
  }
}

el("tabLogin").addEventListener("click", () => {
  el("tabLogin").classList.add("active");
  el("tabRegister").classList.remove("active");
  el("loginForm").classList.remove("hidden");
  el("registerForm").classList.add("hidden");
  clearAuthError();
});

el("tabRegister").addEventListener("click", () => {
  el("tabRegister").classList.add("active");
  el("tabLogin").classList.remove("active");
  el("registerForm").classList.remove("hidden");
  el("loginForm").classList.add("hidden");
  clearAuthError();
});

el("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAuthError();
  const form = new FormData(e.target);
  try {
    const data = await api("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: form.get("username"), password: form.get("password") }),
    });
    setLoggedIn(data.token);
  } catch (err) {
    showAuthError(err.message);
  }
});

el("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  clearAuthError();
  const form = new FormData(e.target);
  try {
    const data = await api("/api/register", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        firma: form.get("firma"),
        username: form.get("username"),
        password: form.get("password"),
      }),
    });
    setLoggedIn(data.token);
  } catch (err) {
    showAuthError(err.message);
  }
});

el("entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const form = new FormData(e.target);
  try {
    await api("/api/entries", {
      method: "POST",
      body: JSON.stringify({ thema: form.get("thema"), status: form.get("status") }),
    });
    e.target.reset();
    loadEntries();
  } catch (err) {
    alert(err.message);
  }
});

el("refreshBtn").addEventListener("click", loadEntries);
el("logoutBtn").addEventListener("click", setLoggedOut);

if (state.token) {
  setLoggedIn(state.token);
} else {
  setLoggedOut();
}

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW registration failed", err));
  });
}
