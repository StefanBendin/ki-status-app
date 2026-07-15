const el = (id) => document.getElementById(id);

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
    li.innerHTML = `
      <div class="meta">
        <span><span class="who">${escapeHtml(entry.name)}</span> <span class="firma">${escapeHtml(entry.firma || "")}</span></span>
        <span class="time">${formatTime(entry.updatedAt)}</span>
      </div>
      <p class="thema">${escapeHtml(entry.thema)}</p>
      <p class="status">${escapeHtml(entry.status)}</p>
      <div class="entry-actions">
        <button type="button" class="ghost-btn update-btn">Status aktualisieren</button>
        <button type="button" class="ghost-btn delete-btn">Löschen</button>
      </div>
    `;
    list.appendChild(li);
  }
}

async function loadEntries() {
  try {
    const data = await api("/api/entries");
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
        status: form.get("status"),
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
    if (!confirm("Diesen Eintrag wirklich löschen?")) return;
    await api(`/api/entries/${id}`, { method: "DELETE" });
    loadEntries();
  }

  if (e.target.classList.contains("update-btn")) {
    const newStatus = prompt("Neue Statusmeldung:");
    if (newStatus === null || !newStatus.trim()) return;
    try {
      await api(`/api/entries/${id}`, {
        method: "PUT",
        body: JSON.stringify({ status: newStatus }),
      });
      loadEntries();
    } catch (err) {
      alert(err.message);
    }
  }
});

el("refreshBtn").addEventListener("click", loadEntries);

loadEntries();
setInterval(loadEntries, 15000);

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => console.error("SW registration failed", err));
  });
}
