const el = (id) => document.getElementById(id);
const PROGRESS_STEPS = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

function getOwnerId() {
  let id = localStorage.getItem("ownerId");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("ownerId", id);
  }
  return id;
}
const OWNER_ID = getOwnerId();

async function api(path, options = {}) {
  const headers = Object.assign({ "Content-Type": "application/json" }, options.headers || {});
  const res = await fetch(path, Object.assign({}, options, { headers }));
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Unbekannter Fehler.");
  return data;
}

function formatTime(iso) {
  const date = new Date(iso);
  return date.toLocaleString("de-DE", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
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
    li.dataset.id = entry.id;
    const progressOptions = PROGRESS_STEPS.map(
      (p) => `<option value="${p}" ${p === entry.progress ? "selected" : ""}>${p}%</option>`
    ).join("");
    const progressControl = entry.isOwner
      ? `<label class="progress-select-label">Fortschritt ändern
          <select class="progress-select">${progressOptions}</select>
        </label>`
      : `<span class="muted-note">Nur der Ersteller kann den Fortschritt ändern</span>`;
    li.innerHTML = `
      <div class="meta">
        <span><span class="who">${escapeHtml(entry.name)}</span> <span class="firma">${escapeHtml(entry.firma || "")}</span></span>
        <span class="time">${formatTime(entry.updatedAt)}</span>
      </div>
      <p class="thema">${escapeHtml(entry.thema)}</p>
      <div class="progress-row">
        <div class="progress-bar"><div class="progress-fill" style="width: ${entry.progress}%"></div></div>
        <span class="progress-label">${entry.progress}%</span>
      </div>
      <div class="entry-actions">
        ${progressControl}
        <button type="button" class="ghost-btn delete-btn">Löschen</button>
      </div>
    `;
    list.appendChild(li);
  }
}

async function loadEntries() {
  try {
    const data = await api(`/api/entries?ownerId=${encodeURIComponent(OWNER_ID)}`);
    renderEntries(data.entries);
  } catch (err) {
    console.error(err);
  }
}

el("entryForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const errorEl = el("formError");
  errorEl.classList.add("hidden");
  const form = new FormData(e.target);
  try {
    await api("/api/entries", {
      method: "POST",
      body: JSON.stringify({
        name: form.get("name"),
        firma: form.get("firma"),
        thema: form.get("thema"),
        progress: form.get("progress"),
        ownerId: OWNER_ID,
      }),
    });
    e.target.reset();
    loadEntries();
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.classList.remove("hidden");
  }
});

el("entryList").addEventListener("click", async (e) => {
  const item = e.target.closest(".entry-item");
  if (!item) return;
  const id = item.dataset.id;

  if (e.target.classList.contains("delete-btn")) {
    const password = prompt("Lösch-Passwort eingeben:");
    if (password === null) return;
    try {
      await api(`/api/entries/${id}`, {
        method: "DELETE",
        body: JSON.stringify({ password }),
      });
      loadEntries();
    } catch (err) {
      alert(err.message);
    }
  }
});

el("entryList").addEventListener("change", async (e) => {
  if (!e.target.classList.contains("progress-select")) return;
  const item = e.target.closest(".entry-item");
  const id = item.dataset.id;
  try {
    await api(`/api/entries/${id}`, {
      method: "PUT",
      body: JSON.stringify({ progress: e.target.value, ownerId: OWNER_ID }),
    });
    loadEntries();
  } catch (err) {
    alert(err.message);
  }
});

el("refreshBtn").addEventListener("click", loadEntries);

el("startBtn").addEventListener("click", () => {
  el("welcomeView").classList.add("hidden");
  el("appView").classList.remove("hidden");
  loadEntries();
  setInterval(loadEntries, 15000);
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW registration failed", err));
  });
}
