const CHANNEL_URL = "https://t.me/s/codexstudys";
const FALLBACK_THUMB = "assets/codex-telegram.png";
let allBatches = [];
let activeFilter = "all";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[character]));
}

function initials(name = "C") {
  return escapeHtml(name.trim().split(/\s+/).slice(0, 2).map((word) => word[0]).join("").toUpperCase() || "C");
}

function categoryFor(batch) {
  const text = `${batch.name || ""} ${batch.byName || ""}`.toLowerCase();
  if (/\bjee\b|iit/.test(text)) return "jee";
  if (/neet|medical/.test(text)) return "neet";
  if (/class|cbse|icse|school|commerce|humanities/.test(text)) return "school";
  return "exam";
}

function openBatch(batch) {
  const id = batch._id || batch.batch_id;
  if (!id) return showToast("This course is not available right now.");
  const name = encodeURIComponent(batch.name || "Course").replace(/%20/g, "+");
  window.location.href = `https://stream.testuk.org/subjects?batchId=${encodeURIComponent(id)}&batchName=${name}`;
}

function filteredBatches() {
  return allBatches.filter((batch) => activeFilter === "all" || categoryFor(batch) === activeFilter);
}

function courseCard(batch) {
  const title = escapeHtml(batch.name || "Untitled course");
  const description = escapeHtml(batch.byName || "Structured learning for your next milestone");
  const language = escapeHtml(batch.language || "Self-paced");
  const category = categoryFor(batch);
  const image = escapeHtml(batch.previewImage || FALLBACK_THUMB);
  const id = escapeHtml(batch._id || batch.batch_id || "");
  return `
    <article class="course-card" data-id="${id}">
      <div class="course-thumb">
        <div class="thumb-fallback">${initials(batch.name)}</div>
        <img src="${image}" alt="" loading="lazy" onerror="this.style.display='none'">
        <span class="course-tag">${escapeHtml(category)}</span>
      </div>
      <div class="course-body">
        <h3 class="course-title">${title}</h3>
        <p class="course-description">${description}</p>
        <div class="course-meta"><span>${language}</span><button class="course-cta" type="button">Open <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button></div>
      </div>
    </article>`;
}

function renderBatches() {
  const grid = $("#batchGrid");
  const batches = filteredBatches();
  const visible = batches.slice(0, 24);
  $("#resultsNote").textContent = batches.length
    ? `Showing ${visible.length} of ${batches.length.toLocaleString()} ${activeFilter === "all" ? "courses" : `${activeFilter.toUpperCase()} courses`}.`
    : "No courses matched that filter yet.";
  grid.innerHTML = visible.length ? visible.map(courseCard).join("") : '<div class="empty">Try another category or search the full library.</div>';
  $$(".course-card").forEach((card, index) => {
    card.addEventListener("click", () => openBatch(visible[index]));
  });
}

function renderSearchResults(query = "") {
  const results = $("#searchResults");
  const normalized = query.trim().toLowerCase();
  if (!normalized) {
    results.innerHTML = '<div class="search-hint">Start typing to find your next course.</div>';
    return;
  }
  const matches = allBatches.filter((batch) => `${batch.name || ""} ${batch.byName || ""} ${batch.language || ""}`.toLowerCase().includes(normalized)).slice(0, 30);
  if (!matches.length) {
    results.innerHTML = '<div class="search-hint">No matches yet. Try a subject, exam or class.</div>';
    return;
  }
  results.innerHTML = matches.map((batch) => `
    <div class="search-result" data-id="${escapeHtml(batch._id || batch.batch_id || "")}">
      <div class="search-result-thumb">${batch.previewImage ? `<img src="${escapeHtml(batch.previewImage)}" alt="" onerror="this.remove()">` : initials(batch.name)}</div>
      <div><strong>${escapeHtml(batch.name || "Untitled course")}</strong><small>${escapeHtml(batch.byName || batch.language || "Course")}</small></div>
    </div>`).join("");
  $$(".search-result").forEach((result, index) => result.addEventListener("click", () => {
    openBatch(matches[index]);
    closeModal("searchModal");
  }));
}

function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add("visible");
  document.body.classList.add("modal-open");
  modal.querySelector("input")?.focus();
}

function closeModal(id) {
  document.getElementById(id)?.classList.remove("visible");
  if (!$$(".overlay.visible").length) document.body.classList.remove("modal-open");
}

function showToast(message) {
  const oldToast = $(".toast");
  oldToast?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  window.setTimeout(() => toast.remove(), 2800);
}

async function loadBatches() {
  try {
    const response = await fetch("batches.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Course library unavailable");
    const data = await response.json();
    allBatches = Array.isArray(data.batches) ? data.batches : [];
    $("#courseCount").textContent = allBatches.length.toLocaleString();
    renderBatches();
  } catch (error) {
    console.error(error);
    $("#resultsNote").textContent = "The course library could not be loaded.";
    $("#batchGrid").innerHTML = '<div class="empty">Please refresh to reconnect to the course library.</div>';
    showToast("Course library unavailable");
  } finally {
    $("#globalPreloader").classList.add("hidden");
  }
}

function setupNavigation() {
  const menu = $("#navLinks");
  const menuButton = $("#menuBtn");
  menuButton.addEventListener("click", () => {
    const open = menu.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(open));
  });
  $$(".nav-link").forEach((link) => link.addEventListener("click", () => {
    menu.classList.remove("open");
    menuButton.setAttribute("aria-expanded", "false");
  }));
  const sections = $$("main section[id]");
  const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
    if (entry.isIntersecting) {
      $$(".nav-link").forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`));
    }
  }), { rootMargin: "-35% 0px -55% 0px" });
  sections.forEach((section) => observer.observe(section));
}

function setupModals() {
  $("#searchBtn").addEventListener("click", () => openModal("searchModal"));
  $("#openLibrary").addEventListener("click", () => openModal("searchModal"));
  $("#searchInput").addEventListener("input", (event) => renderSearchResults(event.target.value));
  $$("[data-close]").forEach((button) => button.addEventListener("click", () => closeModal(button.dataset.close)));
  $$(".overlay").forEach((overlay) => overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closeModal(overlay.id);
  }));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") $$(".overlay.visible").forEach((modal) => closeModal(modal.id));
  });
}

function setupFilters() {
  $$("#filters .filter").forEach((button) => button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    $$("#filters .filter").forEach((item) => item.classList.toggle("active", item === button));
    renderBatches();
  }));
}

function setupTelegramPopup() {
  const key = "codex-studys-telegram-dismissed";
  const joined = document.getElementById("joinFromModal");
  joined.addEventListener("click", () => localStorage.setItem(key, "true"));
  $$('[data-close="telegramModal"]').forEach((button) => button.addEventListener("click", () => localStorage.setItem(key, "true")));
  if (localStorage.getItem(key) !== "true") window.setTimeout(() => openModal("telegramModal"), 3400);
}

document.addEventListener("DOMContentLoaded", () => {
  setupNavigation();
  setupModals();
  setupFilters();
  setupTelegramPopup();
  loadBatches();
});