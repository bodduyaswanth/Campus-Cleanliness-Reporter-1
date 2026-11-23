/**
 * Campus Cleanliness Reporter & Recurrence Tracker
 * StudentLife Hackathon Project #42 | Domain: Environment & Sustainability
 */

// Application State
let reportsState = [];
let filteredReports = [];
let currentPage = 1;
const pageSize = 8;
let activeModalReportId = null;

// Chart Instances
let chartRecurring = null;
let chartCategories = null;
let chartSeverity = null;
let chartScores = null;

// Cleanliness score mapping
const SCORE_LABELS = {
  1: "Critical / Hazardous",
  2: "Poor Condition",
  3: "Fair / Acceptable",
  4: "Good Hygiene",
  5: "Spotless Clean"
};

// Initialize Application on DOM Ready
document.addEventListener('DOMContentLoaded', async () => {
  initLucide();
  initTheme();
  initClock();
  initAuth();
  setupEventListeners();
  await loadData();
  renderAll();
});

// Re-render Lucide icons
function initLucide() {
  if (window.lucide) {
    window.lucide.createIcons();
  }
}

// Clock & Time updater
function initClock() {
  const clockEl = document.getElementById('currentClock');
  const updateClock = () => {
    const now = new Date();
    clockEl.innerText = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };
  updateClock();
  setInterval(updateClock, 1000);
}

// Theme handling
function initTheme() {
  const savedTheme = localStorage.getItem('ecoTheme') || 'light';
  if (savedTheme === 'dark') {
    document.documentElement.classList.add('dark');
    document.body.classList.add('dark-mode');
    updateThemeIcon(true);
  } else {
    updateThemeIcon(false);
  }

  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    document.body.classList.toggle('dark-mode', isDark);
    localStorage.setItem('ecoTheme', isDark ? 'dark' : 'light');
    updateThemeIcon(isDark);
    renderCharts(); // Re-render charts with dark mode styling
  });
}

function updateThemeIcon(isDark) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.setAttribute('data-lucide', isDark ? 'sun' : 'moon');
    initLucide();
  }
}

// ==========================================
// USER AUTHENTICATION & SESSION HANDLING
// ==========================================

function getCurrentUser() {
  const user = localStorage.getItem('ecoCurrentUser');
  if (user) {
    try {
      return JSON.parse(user);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function initAuth() {
  const user = getCurrentUser();
  const signInBtn = document.getElementById('signInLinkBtn');
  const userDropdown = document.getElementById('userProfileDropdown');
  const navLoginText = document.getElementById('navLoginText');

  if (user) {
    if (signInBtn) signInBtn.classList.add('hidden');
    if (userDropdown) userDropdown.classList.remove('hidden');

    const nameEl = document.getElementById('userNameDisplay');
    const roleEl = document.getElementById('userRoleBadge');
    const emailEl = document.getElementById('userEmailDisplay');
    const avatarEl = document.getElementById('userAvatar');

    if (nameEl) nameEl.innerText = user.name || 'User';
    if (roleEl) roleEl.innerText = user.role || 'Member';
    if (emailEl) emailEl.innerText = user.email || '';

    if (avatarEl) {
      const initials = (user.name || 'U')
        .split(' ')
        .map(n => n[0])
        .join('')
        .slice(0, 2)
        .toUpperCase();
      avatarEl.innerText = initials;
    }

    if (navLoginText) {
      const firstName = (user.name || 'User').split(' ')[0];
      navLoginText.innerText = `${firstName} (${user.role.split(' ')[0]})`;
    }

    // Auto-populate report form fields with user credentials
    const formName = document.getElementById('formReporterName');
    const formEmail = document.getElementById('formReporterEmail');
    const formRole = document.getElementById('formReporterRole');
    if (formName && !formName.value) formName.value = user.name;
    if (formEmail && !formEmail.value) formEmail.value = user.email;
    if (formRole && user.role) {
      for (let opt of formRole.options) {
        if (opt.value.toLowerCase().includes(user.role.toLowerCase()) || user.role.toLowerCase().includes(opt.value.toLowerCase())) {
          formRole.value = opt.value;
          break;
        }
      }
    }
  } else {
    if (signInBtn) signInBtn.classList.remove('hidden');
    if (userDropdown) userDropdown.classList.add('hidden');
    if (navLoginText) navLoginText.innerText = "Sign In / Role";
  }

  initLucide();
}

function handleLogout() {
  localStorage.removeItem('ecoCurrentUser');
  initAuth();
  showToast("You have been signed out.", "info");
}

// Tab Switching
function setupEventListeners() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      switchTab(btn.dataset.tab);
    });
  });

  document.getElementById('quickReportBtn').addEventListener('click', () => {
    switchTab('report');
  });

  // Search & Filter listeners
  document.getElementById('searchInput').addEventListener('input', applyFilters);
  document.getElementById('filterBuilding').addEventListener('change', applyFilters);
  document.getElementById('filterSeverity').addEventListener('change', applyFilters);
  document.getElementById('filterStatus').addEventListener('change', applyFilters);
  document.getElementById('filterRecurringOnly').addEventListener('change', applyFilters);
}

function switchTab(tabId) {
  // Update Buttons
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) {
      btn.className = 'tab-btn px-3 py-2 rounded-lg text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-semibold flex items-center space-x-2';
    } else {
      btn.className = 'tab-btn px-3 py-2 rounded-lg text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center space-x-2';
    }
  });

  // Update Sections
  document.querySelectorAll('.tab-content').forEach(section => {
    if (section.id === `tab-${tabId}`) {
      section.classList.remove('hidden');
      section.classList.add('block');
    } else {
      section.classList.add('hidden');
      section.classList.remove('block');
    }
  });

  // If opening dashboard, trigger chart resize/render
  if (tabId === 'dashboard') {
    setTimeout(renderCharts, 50);
  } else if (tabId === 'report') {
    initAuth();
  }

  initLucide();
}

// Audio Feedback (Subtle Web Audio synthesize)
function playFeedbackTone(type = 'success') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'success') {
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } else if (type === 'alert') {
      osc.frequency.setValueAtTime(260, ctx.currentTime);
      osc.frequency.setValueAtTime(180, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    }
  } catch (e) {
    // Audio context may be restricted by browser policy before user interaction
  }
}

// Show Toast
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  const bg = type === 'success' ? 'bg-emerald-600' : (type === 'error' ? 'bg-rose-600' : 'bg-slate-800');
  toast.className = `${bg} text-white text-xs px-4 py-2.5 rounded-lg shadow-lg flex items-center space-x-2 transition-all transform duration-300 opacity-0 translate-y-2 pointer-events-auto`;
  toast.innerHTML = `
    <span>${escapeHTML(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 300);
  }, 3500);

  playFeedbackTone(type === 'error' ? 'alert' : 'success');
}

// Helper: Escape HTML
function escapeHTML(str) {
  if (!str) return '';
  return String(str).replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

// ==========================================
// DATA PERSISTENCE & LOADING
// ==========================================

async function loadData() {
  const localStored = localStorage.getItem('ecoCampusReports');
  if (localStored) {
    try {
      reportsState = JSON.parse(localStored);
      return;
    } catch (e) {
      console.warn("Corrupted localStorage data. Reloading fallback template...", e);
    }
  }

  // Attempt to fetch from server API or static json
  try {
    const res = await fetch('data/reports.json');
    if (res.ok) {
      reportsState = await res.json();
      saveData();
      return;
    }
  } catch (err) {
    console.log("Static fetch failed, checking API endpoint...", err);
  }

  // Fallback to internal seed if network/file fails
  reportsState = getFallbackSeed();
  saveData();
}

function saveData() {
  try {
    localStorage.setItem('ecoCampusReports', JSON.stringify(reportsState));
  } catch (e) {
    console.error("Local storage write error:", e);
  }
}

// Reset state to initial sample dataset
function resetToDefaultData() {
  if (confirm("Restore the default 35 seed reports? Current changes will be overwritten.")) {
    localStorage.removeItem('ecoCampusReports');
    fetch('data/reports.json')
      .then(res => res.json())
      .then(data => {
        reportsState = data;
        saveData();
        renderAll();
        showToast("Seed dataset successfully restored!", "success");
      })
      .catch(() => {
        reportsState = getFallbackSeed();
        saveData();
        renderAll();
        showToast("Restored embedded seed dataset", "success");
      });
  }
}

// ==========================================
// CORE BUSINESS LOGIC & RECURRENCE ENGINE
// ==========================================

/**
 * Computes recurrence metrics:
 * Groups reports by location key (building + spot).
 * Counts how many reports have occurred at each spot.
 */
function getRecurrenceAnalysis() {
  const map = {};
  
  reportsState.forEach(r => {
    const key = `${r.building.trim()} - ${r.spot.trim()}`;
    if (!map[key]) {
      map[key] = {
        key: key,
        building: r.building,
        spot: r.spot,
        zone: r.zone,
        count: 0,
        reports: [],
        categories: new Set(),
        activeCount: 0,
        severities: []
      };
    }
    map[key].count += 1;
    map[key].reports.push(r);
    map[key].categories.add(r.category);
    map[key].severities.push(r.severity);
    if (r.status !== 'Resolved') {
      map[key].activeCount += 1;
    }
  });

  // Array of hotspots, sorted by recurrence frequency descending
  const list = Object.values(map)
    .filter(item => item.count >= 2)
    .sort((a, b) => b.count - a.count);

  return list;
}

/**
 * Checks if a specific report belongs to a recurring problem area
 */
function isReportRecurring(report) {
  const key = `${report.building.trim()} - ${report.spot.trim()}`;
  const count = reportsState.filter(r => `${r.building.trim()} - ${r.spot.trim()}` === key).length;
  return count >= 2;
}

// ==========================================
// RENDERING FUNCTIONS
// ==========================================

function renderAll() {
  updateMetricsAndBadges();
  applyFilters();
  renderRecurringHotspotsView();
  renderCharts();
  initLucide();
}

function updateMetricsAndBadges() {
  const total = reportsState.length;
  const active = reportsState.filter(r => r.status !== 'Resolved').length;
  const resolved = total - active;
  const resolutionRate = total > 0 ? Math.round((resolved / total) * 100) : 100;
  
  const critical = reportsState.filter(r => r.severity === 'Critical' && r.status !== 'Resolved').length;
  
  const avgScore = total > 0 
    ? (reportsState.reduce((acc, r) => acc + Number(r.cleanliness_score), 0) / total).toFixed(1)
    : "5.0";

  const recurringList = getRecurrenceAnalysis();
  const hotspotCount = recurringList.length;

  // DOM Elements
  document.getElementById('statTotalReports').innerText = total;
  document.getElementById('statActiveIssues').innerText = active;
  document.getElementById('statResolutionRate').innerText = `${resolutionRate}% resolved`;
  document.getElementById('statCriticalAlerts').innerText = critical;
  document.getElementById('statAvgScore').innerText = avgScore;
  document.getElementById('statHotspotsCount').innerText = hotspotCount;
  document.getElementById('totalReportsNavCount').innerText = total;

  // Avg label
  const scoreNum = parseFloat(avgScore);
  const scoreLabelEl = document.getElementById('statScoreLabel');
  if (scoreNum <= 2.0) {
    scoreLabelEl.innerText = "Poor";
    scoreLabelEl.className = "text-xs px-1.5 py-0.5 rounded bg-red-100 text-red-700 font-bold";
  } else if (scoreNum <= 3.5) {
    scoreLabelEl.innerText = "Fair";
    scoreLabelEl.className = "text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 font-bold";
  } else {
    scoreLabelEl.innerText = "Good";
    scoreLabelEl.className = "text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-bold";
  }

  // Recurring badge in nav
  const recurringBadge = document.getElementById('recurringBadge');
  if (hotspotCount > 0) {
    recurringBadge.innerText = hotspotCount;
    recurringBadge.classList.remove('hidden');
  } else {
    recurringBadge.classList.add('hidden');
  }

  // Threshold Warning Banner
  const warningBanner = document.getElementById('thresholdWarningBanner');
  const warningMsg = document.getElementById('thresholdWarningMsg');
  if (hotspotCount > 0 || critical > 0) {
    let msg = `High Alert: ${hotspotCount} recurring cleanliness hotspot(s) detected`;
    if (critical > 0) msg += ` and ${critical} critical SLA breach / emergency risk active!`;
    warningMsg.innerText = msg;
    warningBanner.classList.remove('hidden');
  } else {
    warningBanner.classList.add('hidden');
  }

  // Action Queue
  renderActionQueue();
}

function dismissWarningBanner() {
  document.getElementById('thresholdWarningBanner').classList.add('hidden');
}

function renderActionQueue() {
  const container = document.getElementById('immediateActionList');
  const criticalReports = reportsState
    .filter(r => r.status !== 'Resolved')
    .sort((a, b) => {
      // Sort Critical first, then High
      const weight = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 };
      return weight[b.severity] - weight[a.severity];
    })
    .slice(0, 3);

  if (criticalReports.length === 0) {
    container.innerHTML = `
      <div class="p-3 text-center text-xs text-slate-400 border border-dashed rounded-lg">
        All critical and high-priority cleanliness reports have been resolved!
      </div>
    `;
    return;
  }

  container.innerHTML = criticalReports.map(r => `
    <div class="p-2.5 rounded-lg border border-slate-200 dark:border-slate-700 flex items-start justify-between bg-slate-50 dark:bg-slate-900/50">
      <div class="pr-2">
        <div class="flex items-center space-x-1.5">
          <span class="text-[10px] font-bold px-1.5 py-0.2 rounded ${getSeverityClass(r.severity)}">${r.severity}</span>
          <span class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHTML(r.building)}</span>
        </div>
        <p class="text-[11px] text-slate-500 line-clamp-1 mt-0.5">${escapeHTML(r.spot)} &bull; ${escapeHTML(r.category)}</p>
      </div>
      <button onclick="openIncidentModal('${r.id}')" class="text-xs text-emerald-600 hover:text-emerald-700 font-semibold px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 whitespace-nowrap">
        Resolve
      </button>
    </div>
  `).join('');
}

// ==========================================
// FILTERS, SEARCH & PAGINATION
// ==========================================

function applyFilters() {
  const search = document.getElementById('searchInput').value.toLowerCase().trim();
  const building = document.getElementById('filterBuilding').value;
  const severity = document.getElementById('filterSeverity').value;
  const status = document.getElementById('filterStatus').value;
  const recurringOnly = document.getElementById('filterRecurringOnly').checked;

  filteredReports = reportsState.filter(r => {
    // Search match
    if (search) {
      const match = (r.id && r.id.toLowerCase().includes(search)) ||
                    (r.building && r.building.toLowerCase().includes(search)) ||
                    (r.spot && r.spot.toLowerCase().includes(search)) ||
                    (r.zone && r.zone.toLowerCase().includes(search)) ||
                    (r.category && r.category.toLowerCase().includes(search)) ||
                    (r.reporter_name && r.reporter_name.toLowerCase().includes(search)) ||
                    (r.description && r.description.toLowerCase().includes(search));
      if (!match) return false;
    }

    if (building && r.building !== building) return false;
    if (severity && r.severity !== severity) return false;
    if (status && r.status !== status) return false;
    if (recurringOnly && !isReportRecurring(r)) return false;

    return true;
  });

  document.getElementById('filteredCountText').innerText = filteredReports.length;
  currentPage = 1;
  renderTable();
}

function clearAllFilters() {
  document.getElementById('searchInput').value = '';
  document.getElementById('filterBuilding').value = '';
  document.getElementById('filterSeverity').value = '';
  document.getElementById('filterStatus').value = '';
  document.getElementById('filterRecurringOnly').checked = false;
  applyFilters();
}

function renderTable() {
  const tbody = document.getElementById('reportsTableBody');
  const totalPages = Math.ceil(filteredReports.length / pageSize) || 1;
  document.getElementById('currentPageNum').innerText = currentPage;
  document.getElementById('totalPagesNum').innerText = totalPages;
  document.getElementById('prevPageBtn').disabled = (currentPage <= 1);
  document.getElementById('nextPageBtn').disabled = (currentPage >= totalPages);

  const start = (currentPage - 1) * pageSize;
  const pageItems = filteredReports.slice(start, start + pageSize);

  if (pageItems.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-8 text-center text-slate-400 text-xs">
          No matching cleanliness reports found. Try modifying your filter criteria.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = pageItems.map(r => {
    const isRecurring = isReportRecurring(r);
    return `
      <tr class="hover:bg-slate-50 dark:hover:bg-slate-750 transition-colors">
        <td class="py-3 px-4 font-mono text-xs font-semibold text-slate-800 dark:text-slate-200">
          ${escapeHTML(r.id)}
        </td>
        <td class="py-3 px-4">
          <div class="font-medium text-slate-900 dark:text-white flex items-center gap-1.5">
            ${escapeHTML(r.building)}
            ${isRecurring ? '<span class="px-1.5 py-0.2 rounded text-[10px] bg-red-100 text-red-700 font-bold flex items-center gap-0.5"><i data-lucide="repeat" class="w-2.5 h-2.5"></i> Repeat</span>' : ''}
          </div>
          <div class="text-xs text-slate-500">${escapeHTML(r.spot)} &bull; <span class="text-slate-400">${escapeHTML(r.zone)}</span></div>
        </td>
        <td class="py-3 px-4">
          <div class="text-xs font-semibold text-slate-800 dark:text-slate-200">${escapeHTML(r.category)}</div>
          <div class="mt-0.5">
            <span class="score-pill score-${r.cleanliness_score}">★ ${r.cleanliness_score}/5 (${SCORE_LABELS[r.cleanliness_score].split(' ')[0]})</span>
          </div>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded text-xs font-bold ${getSeverityClass(r.severity)}">
            ${r.severity}
          </span>
          <span class="block text-[11px] text-slate-400 mt-0.5">SLA: ${r.sla_hours || 12}h</span>
        </td>
        <td class="py-3 px-4">
          <span class="px-2 py-0.5 rounded-full text-xs font-semibold ${getStatusClass(r.status)}">
            ${r.status}
          </span>
        </td>
        <td class="py-3 px-4 text-xs">
          <div class="font-medium text-slate-700 dark:text-slate-300">${escapeHTML(r.reporter_name)}</div>
          <div class="text-[11px] text-slate-400">${r.timestamp ? r.timestamp.replace('T', ' ').slice(0, 16) : ''}</div>
        </td>
        <td class="py-3 px-4 text-right space-x-1 whitespace-nowrap">
          <button onclick="openIncidentModal('${r.id}')" title="Inspect & Update" class="p-1.5 text-slate-500 hover:text-emerald-600 dark:hover:text-emerald-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <i data-lucide="eye" class="w-4 h-4"></i>
          </button>
          <button onclick="quickToggleStatus('${r.id}')" title="Quick Cycle Status" class="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <i data-lucide="check-circle" class="w-4 h-4"></i>
          </button>
          <button onclick="deleteReport('${r.id}')" title="Delete record" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 transition">
            <i data-lucide="trash-2" class="w-4 h-4"></i>
          </button>
        </td>
      </tr>
    `;
  }).join('');

  initLucide();
}

function changePage(delta) {
  currentPage += delta;
  renderTable();
}

function getSeverityClass(sev) {
  switch (sev) {
    case 'Critical': return 'badge-critical';
    case 'High': return 'badge-high';
    case 'Medium': return 'badge-medium';
    default: return 'badge-low';
  }
}

function getStatusClass(st) {
  switch (st) {
    case 'Resolved': return 'status-resolved';
    case 'In Progress': return 'status-in-progress';
    default: return 'status-reported';
  }
}

function quickToggleStatus(id) {
  const item = reportsState.find(r => r.id === id);
  if (!item) return;

  if (item.status === 'Reported') {
    item.status = 'In Progress';
  } else if (item.status === 'In Progress') {
    item.status = 'Resolved';
    item.resolved_at = new Date().toISOString();
  } else {
    item.status = 'Reported';
    item.resolved_at = null;
  }

  saveData();
  renderAll();
  showToast(`Updated ${id} to ${item.status}`, "success");
}

function deleteReport(id) {
  if (confirm(`Are you sure you want to delete report ${id}?`)) {
    reportsState = reportsState.filter(r => r.id !== id);
    saveData();
    renderAll();
    showToast(`Deleted ${id}`, "info");
  }
}

// ==========================================
// RECURRING HOTSPOTS VIEW
// ==========================================

function renderRecurringHotspotsView() {
  const container = document.getElementById('recurringHotspotsContainer');
  const hotspots = getRecurrenceAnalysis();

  if (hotspots.length === 0) {
    container.innerHTML = `
      <div class="col-span-full p-8 text-center text-slate-400 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700">
        <i data-lucide="check-circle" class="w-10 h-10 mx-auto text-emerald-500 mb-2"></i>
        <h4 class="font-bold text-slate-700 dark:text-slate-300">No Recurring Problem Areas Detected</h4>
        <p class="text-xs text-slate-500 mt-1">All campus areas currently have singular or zero reported cleanliness issues.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = hotspots.map(h => {
    // Generate Custodial Recommendation based on categories
    let actionRecommendation = "Increase routine custodial passes and inspect trash containment.";
    if (h.categories.has("Overflowing Bins")) {
      actionRecommendation = "Upgrade to high-capacity sensory compacting bins; schedule peak-hour bin sweeps.";
    } else if (h.categories.has("Restroom Sanitization") || h.categories.has("Plumbing/Leak")) {
      actionRecommendation = "Perform plumbing seal overhaul; install automatic soap/faucet sensors and deep disinfectant cycle.";
    } else if (h.categories.has("Pest Control")) {
      actionRecommendation = "Deploy sealed pest traps; enforce strict student food ban in study areas.";
    } else if (h.categories.has("Hazardous/Chemical")) {
      actionRecommendation = "Mandatory lab fume hood check; replenish safety wash neutralizer supplies.";
    }

    return `
      <div class="eco-card p-5 bg-white dark:bg-slate-800 rounded-xl border border-rose-200 dark:border-rose-950/60 shadow-sm flex flex-col justify-between">
        <div>
          <div class="flex items-center justify-between mb-2">
            <span class="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase bg-rose-100 text-rose-700 border border-rose-200">
              ${h.count} Incidents Logged
            </span>
            <span class="text-xs text-slate-400 font-mono">${escapeHTML(h.zone)}</span>
          </div>

          <h3 class="font-bold text-slate-900 dark:text-white text-base">${escapeHTML(h.building)}</h3>
          <p class="text-xs text-slate-500 dark:text-slate-400 font-medium">${escapeHTML(h.spot)}</p>

          <div class="mt-3 flex flex-wrap gap-1">
            ${Array.from(h.categories).map(cat => `
              <span class="px-2 py-0.5 rounded text-[11px] bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">${escapeHTML(cat)}</span>
            `).join('')}
          </div>

          <div class="mt-4 p-3 rounded-lg bg-rose-50/70 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/40 text-xs">
            <div class="font-bold text-rose-800 dark:text-rose-300 flex items-center gap-1 mb-1">
              <i data-lucide="shield-alert" class="w-3.5 h-3.5"></i> Recommended Remediation:
            </div>
            <p class="text-rose-700 dark:text-rose-400 text-[11px] leading-relaxed">${actionRecommendation}</p>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-slate-100 dark:border-slate-700 flex items-center justify-between text-xs">
          <span class="text-slate-500">${h.activeCount} currently unresolved</span>
          <button onclick="filterByHotspot('${escapeHTML(h.building)}')" class="text-emerald-600 dark:text-emerald-400 font-semibold hover:underline">
            View Reports &rarr;
          </button>
        </div>
      </div>
    `;
  }).join('');

  initLucide();
}

function filterByHotspot(building) {
  document.getElementById('filterBuilding').value = building;
  switchTab('incidents');
  applyFilters();
}

// ==========================================
// FORM SUBMISSION & DEFENSIVE VALIDATION
// ==========================================

function updateScoreDisplay(val) {
  const display = document.getElementById('scoreDisplay');
  const num = parseInt(val);
  display.innerText = `${num} - ${SCORE_LABELS[num]}`;
  display.className = `font-extrabold text-sm score-${num} px-2 py-0.5 rounded-full inline-block`;
}

function loadSamplePreset() {
  document.getElementById('formZone').value = "North Campus";
  document.getElementById('formBuilding').value = "Student Cafeteria";
  document.getElementById('formSpot').value = "Ground Floor Dish Drop & Wash Area";
  document.getElementById('formCategory').value = "Overflowing Bins";
  document.getElementById('formSeverity').value = "Critical";
  document.getElementById('formScore').value = 1;
  updateScoreDisplay(1);
  document.getElementById('formDescription').value = "Bins overfilled with organic food remnants, creating slippery grease patches and unpleasant odors.";
  document.getElementById('descCharCount').innerText = document.getElementById('formDescription').value.length;
  document.getElementById('formReporterName').value = "Kavya Deshmukh";
  document.getElementById('formReporterRole').value = "Student";
  document.getElementById('formReporterEmail').value = "kavya.d@campus.edu";
  showToast("Preset loaded into form!", "info");
}

function handleFormSubmit(e) {
  e.preventDefault();

  // Reset errors
  ['errZone', 'errBuilding', 'errSpot', 'errCategory', 'errDescription', 'errReporterName', 'errReporterEmail'].forEach(id => {
    document.getElementById(id).classList.add('hidden');
  });

  // Extract & Sanitize values
  const zone = document.getElementById('formZone').value.trim();
  const building = document.getElementById('formBuilding').value.trim();
  const spot = document.getElementById('formSpot').value.trim();
  const category = document.getElementById('formCategory').value.trim();
  const severity = document.getElementById('formSeverity').value;
  const score = parseInt(document.getElementById('formScore').value);
  const description = document.getElementById('formDescription').value.trim();
  const reporterName = document.getElementById('formReporterName').value.trim();
  const reporterRole = document.getElementById('formReporterRole').value;
  const reporterEmail = document.getElementById('formReporterEmail').value.trim();

  let hasError = false;

  // Defensive Checks
  if (!zone) {
    document.getElementById('errZone').classList.remove('hidden');
    hasError = true;
  }
  if (!building || building.length < 3) {
    document.getElementById('errBuilding').classList.remove('hidden');
    hasError = true;
  }
  if (!spot || spot.length < 3) {
    document.getElementById('errSpot').classList.remove('hidden');
    hasError = true;
  }
  if (!category) {
    document.getElementById('errCategory').classList.remove('hidden');
    hasError = true;
  }
  if (!description || description.length < 10 || description.length > 300) {
    document.getElementById('errDescription').classList.remove('hidden');
    hasError = true;
  }
  if (!reporterName || reporterName.length < 2) {
    document.getElementById('errReporterName').classList.remove('hidden');
    hasError = true;
  }
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!reporterEmail || !emailRegex.test(reporterEmail)) {
    document.getElementById('errReporterEmail').classList.remove('hidden');
    hasError = true;
  }

  if (hasError) {
    showToast("Please correct the highlighted validation errors.", "error");
    return;
  }

  // Generate unique report ID
  const newId = `CR-${1000 + reportsState.length + 1}`;
  const now = new Date();
  const timestamp = now.toISOString().slice(0, 19);

  // SLA mapping in hours
  const slaMap = { 'Critical': 4, 'High': 8, 'Medium': 16, 'Low': 48 };

  const newReport = {
    id: newId,
    timestamp: timestamp,
    zone: zone,
    building: building,
    spot: spot,
    category: category,
    cleanliness_score: score,
    severity: severity,
    description: description,
    reporter_name: reporterName,
    reporter_role: reporterRole,
    reporter_email: reporterEmail,
    status: "Reported",
    assigned_to: "Custodial Triage",
    sla_hours: slaMap[severity] || 24,
    resolved_at: null,
    notes: ""
  };

  // Prepend to state (most recent first)
  reportsState.unshift(newReport);
  saveData();

  // Reset form
  document.getElementById('cleanlinessForm').reset();
  document.getElementById('descCharCount').innerText = "0";
  updateScoreDisplay(2);

  renderAll();
  showToast(`Report ${newId} logged and validated successfully!`, "success");

  // If recurring hotspot, alert user
  if (isReportRecurring(newReport)) {
    setTimeout(() => {
      showToast(`Warning: ${building} - ${spot} is a recurring hotspot!`, "error");
    }, 800);
  }

  // Switch to Incidents feed
  switchTab('incidents');
}

// ==========================================
// MODAL DETAILS & EDITING
// ==========================================

function openIncidentModal(id) {
  const r = reportsState.find(item => item.id === id);
  if (!r) return;

  activeModalReportId = id;
  document.getElementById('modalReportId').innerText = r.id;
  
  const sevBadge = document.getElementById('modalSeverityBadge');
  sevBadge.className = `px-2 py-0.5 rounded text-xs font-bold ${getSeverityClass(r.severity)}`;
  sevBadge.innerText = r.severity;

  document.getElementById('modalLocation').innerText = `${r.building} (${r.zone})`;
  document.getElementById('modalSpot').innerText = r.spot;
  document.getElementById('modalCategory').innerText = r.category;
  
  const scoreEl = document.getElementById('modalScore');
  scoreEl.innerText = `★ ${r.cleanliness_score}/5`;
  scoreEl.className = `font-bold text-xs score-${r.cleanliness_score} px-1.5 py-0.5 rounded`;

  document.getElementById('modalSla').innerText = `${r.sla_hours || 24} hours`;
  document.getElementById('modalDescription').innerText = r.description;
  document.getElementById('modalReporter').innerText = `${r.reporter_name} (${r.reporter_role || 'Student'})`;
  document.getElementById('modalTimestamp').innerText = r.timestamp ? r.timestamp.replace('T', ' ') : 'N/A';
  document.getElementById('modalNotes').value = r.notes || '';
  document.getElementById('modalStatusSelect').value = r.status;

  document.getElementById('incidentModal').classList.remove('hidden');
  initLucide();
}

function closeIncidentModal() {
  document.getElementById('incidentModal').classList.add('hidden');
  activeModalReportId = null;
}

function saveModalChanges() {
  if (!activeModalReportId) return;
  const item = reportsState.find(r => r.id === activeModalReportId);
  if (!item) return;

  const newStatus = document.getElementById('modalStatusSelect').value;
  const newNotes = document.getElementById('modalNotes').value.trim();

  item.status = newStatus;
  item.notes = newNotes;
  if (newStatus === 'Resolved' && !item.resolved_at) {
    item.resolved_at = new Date().toISOString();
  }

  saveData();
  renderAll();
  closeIncidentModal();
  showToast(`Updated record ${item.id}`, "success");
}

// ==========================================
// MULTI-FORMAT SUMMARY EXPORTS
// ==========================================

function exportMarkdownSummary() {
  const total = reportsState.length;
  const active = reportsState.filter(r => r.status !== 'Resolved').length;
  const resolved = total - active;
  const avgScore = (reportsState.reduce((a, b) => a + Number(b.cleanliness_score), 0) / (total || 1)).toFixed(2);
  const hotspots = getRecurrenceAnalysis();

  let md = `# Campus Cleanliness Reporter - Executive Summary Report\n\n`;
  md += `**Project:** StudentLife Hack #42 | Domain: Environment & Sustainability\n`;
  md += `**Generated:** ${new Date().toLocaleString()}\n\n`;
  md += `## 1. Executive Performance Metrics\n\n`;
  md += `| Metric | Value |\n|---|---|\n`;
  md += `| Total Cleanliness Reports | ${total} |\n`;
  md += `| Active / Unresolved Issues | ${active} |\n`;
  md += `| Resolved Issues | ${resolved} (${Math.round((resolved/total)*100)}%) |\n`;
  md += `| Campus Cleanliness Index | ${avgScore} / 5.0 |\n`;
  md += `| Flagged Recurring Hotspots | ${hotspots.length} |\n\n`;

  md += `## 2. Chronic Recurring Hotspots (Frequency >= 2)\n\n`;
  if (hotspots.length === 0) {
    md += `_No recurring problem areas recorded._\n\n`;
  } else {
    md += `| Location | Zone | Occurrences | Active Complaints | Categories |\n|---|---|---|---|---|\n`;
    hotspots.forEach(h => {
      md += `| ${h.building} - ${h.spot} | ${h.zone} | ${h.count} | ${h.activeCount} | ${Array.from(h.categories).join(', ')} |\n`;
    });
    md += `\n`;
  }

  md += `## 3. Incident Audit Register\n\n`;
  md += `| ID | Timestamp | Location | Category | Score | Severity | Status | Reporter |\n|---|---|---|---|---|---|---|---|\n`;
  reportsState.slice(0, 50).forEach(r => {
    md += `| ${r.id} | ${r.timestamp} | ${r.building} (${r.spot}) | ${r.category} | ${r.cleanliness_score}/5 | ${r.severity} | ${r.status} | ${r.reporter_name} |\n`;
  });

  md += `\n---\n*Report compiled by EcoCampus Cleanliness Reporter Engine.*`;

  downloadBlob(md, 'CAMPUS_CLEANLINESS_REPORT.md', 'text/markdown');
  showToast("Executive Markdown report exported!", "success");
}

function exportCSVData() {
  if (reportsState.length === 0) {
    showToast("No data to export", "error");
    return;
  }
  const headers = Object.keys(reportsState[0]);
  const rows = reportsState.map(r => {
    return headers.map(h => {
      let val = r[h] === null || r[h] === undefined ? '' : String(r[h]);
      val = val.replace(/"/g, '""');
      return `"${val}"`;
    }).join(',');
  });

  const csv = [headers.join(','), ...rows].join('\r\n');
  downloadBlob(csv, 'reports_export.csv', 'text/csv');
  showToast("CSV dataset exported!", "success");
}

function exportJSONData() {
  const json = JSON.stringify(reportsState, null, 2);
  downloadBlob(json, 'campus_cleanliness_database.json', 'application/json');
  showToast("JSON database backup exported!", "success");
}

function exportAuditLog() {
  let log = `========================================================================================\n`;
  log += `                   CAMPUS CLEANLINESS REPORTER - AUDIT ACTION LOG                       \n`;
  log += `========================================================================================\n`;
  log += `Log Generated: ${new Date().toISOString()}\n`;
  log += `Total Records: ${reportsState.length}\n\n`;
  log += `ID       TIMESTAMP           SEVERITY  STATUS       SCORE  LOCATION\n`;
  log += `----------------------------------------------------------------------------------------\n`;

  reportsState.forEach(r => {
    const id = (r.id || '').padEnd(8);
    const ts = (r.timestamp || '').slice(0, 19).padEnd(20);
    const sev = (r.severity || '').padEnd(10);
    const st = (r.status || '').padEnd(13);
    const sc = `${r.cleanliness_score}/5`.padEnd(7);
    const loc = `${r.building} - ${r.spot}`;
    log += `${id} ${ts} ${sev} ${st} ${sc} ${loc}\n`;
  });

  downloadBlob(log, 'audit_log.txt', 'text/plain');
  showToast("Audit log file exported!", "success");
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type: `${type};charset=utf-8;` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ==========================================
// BULK DATASET IMPORT (CSV & JSON)
// ==========================================

function handleBulkFileUpload(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  const isJSON = file.name.endsWith('.json');
  
  reader.onload = (e) => {
    const text = e.target.result;
    const logBox = document.getElementById('importLogContainer');
    const logOutput = document.getElementById('importLogOutput');
    const statsEl = document.getElementById('importStats');
    logBox.classList.remove('hidden');
    logOutput.innerHTML = '';

    let parsedRows = [];
    let errors = [];

    if (isJSON) {
      try {
        const json = JSON.parse(text);
        if (Array.isArray(json)) {
          parsedRows = json;
        } else {
          errors.push("Root JSON must be an array of report objects.");
        }
      } catch (err) {
        errors.push(`JSON Syntax Error: ${err.message}`);
      }
    } else {
      // CSV Parsing
      const lines = text.split(/\r\n|\n/).filter(l => l.trim() !== '');
      if (lines.length < 2) {
        errors.push("CSV file must contain a header and at least one data row.");
      } else {
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
        for (let i = 1; i < lines.length; i++) {
          const values = lines[i].split(',').map(v => v.trim().replace(/^"|"$/g, ''));
          const rowObj = {};
          headers.forEach((h, idx) => {
            rowObj[h] = values[idx] || '';
          });
          parsedRows.push(rowObj);
        }
      }
    }

    if (errors.length > 0) {
      logOutput.innerHTML = errors.map(er => `<div class="text-red-500">&bull; ${er}</div>`).join('');
      return;
    }

    // Row-by-row defensive validation
    let validCount = 0;
    let failCount = 0;
    const validRecords = [];

    parsedRows.forEach((r, idx) => {
      const rowNum = idx + 2;
      const building = r.building ? String(r.building).trim() : '';
      const spot = r.spot ? String(r.spot).trim() : '';
      const category = r.category ? String(r.category).trim() : 'Litter/Debris';
      const score = parseInt(r.cleanliness_score) || 3;

      if (!building || building.length < 2) {
        logOutput.innerHTML += `<div class="text-rose-400">Row ${rowNum}: Skipped - missing building name</div>`;
        failCount++;
        return;
      }

      const id = r.id || `CR-${2000 + reportsState.length + validCount + 1}`;
      validRecords.push({
        id: id,
        timestamp: r.timestamp || new Date().toISOString().slice(0, 19),
        zone: r.zone || 'Campus Wide',
        building: building,
        spot: spot || 'General Area',
        category: category,
        cleanliness_score: Math.min(5, Math.max(1, score)),
        severity: r.severity || 'Medium',
        description: r.description || 'Imported via legacy dataset bulk ingest.',
        reporter_name: r.reporter_name || 'Staff Import',
        reporter_role: r.reporter_role || 'Staff',
        reporter_email: r.reporter_email || 'admin@campus.edu',
        status: r.status || 'Reported',
        assigned_to: r.assigned_to || 'Pending Assignment',
        sla_hours: parseInt(r.sla_hours) || 24,
        resolved_at: r.resolved_at || null,
        notes: r.notes || 'Bulk imported record.'
      });
      validCount++;
    });

    statsEl.innerText = `${validCount} valid, ${failCount} rejected`;
    logOutput.innerHTML += `<div class="text-emerald-500 font-bold">&bull; Import complete: ${validCount} records integrated successfully.</div>`;

    if (validRecords.length > 0) {
      reportsState = [...validRecords, ...reportsState];
      saveData();
      renderAll();
      showToast(`Successfully imported ${validCount} reports!`, "success");
    }
  };

  reader.readAsText(file);
}

// ==========================================
// VISUAL DATA PLOTTING (CHART.JS)
// ==========================================

function renderCharts() {
  if (typeof Chart === 'undefined') return;

  const isDark = document.documentElement.classList.contains('dark');
  const textColor = isDark ? '#cbd5e1' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)';

  // Chart 1: Recurring Problem Locations Bar Chart
  const recurringLocations = {};
  reportsState.forEach(r => {
    const loc = `${r.building}`;
    recurringLocations[loc] = (recurringLocations[loc] || 0) + 1;
  });

  const sortedLocs = Object.entries(recurringLocations)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const locLabels = sortedLocs.map(e => e[0]);
  const locCounts = sortedLocs.map(e => e[1]);

  const ctxLoc = document.getElementById('chartRecurringLocations');
  if (ctxLoc) {
    if (chartRecurring) chartRecurring.destroy();
    chartRecurring = new Chart(ctxLoc, {
      type: 'bar',
      data: {
        labels: locLabels,
        datasets: [{
          label: 'Report Count',
          data: locCounts,
          backgroundColor: '#10b981',
          borderRadius: 6,
          hoverBackgroundColor: '#059669'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: {
            ticks: { color: textColor, font: { size: 10 } },
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            ticks: { color: textColor, stepSize: 1 },
            grid: { color: gridColor }
          }
        }
      }
    });
  }

  // Chart 2: Category Distribution Doughnut Chart
  const categoryCounts = {};
  reportsState.forEach(r => {
    categoryCounts[r.category] = (categoryCounts[r.category] || 0) + 1;
  });

  const catLabels = Object.keys(categoryCounts);
  const catData = Object.values(categoryCounts);

  const ctxCat = document.getElementById('chartCategories');
  if (ctxCat) {
    if (chartCategories) chartCategories.destroy();
    chartCategories = new Chart(ctxCat, {
      type: 'doughnut',
      data: {
        labels: catLabels,
        datasets: [{
          data: catData,
          backgroundColor: [
            '#10b981', '#06b6d4', '#f59e0b', '#ef4444', 
            '#8b5cf6', '#ec4899', '#3b82f6', '#64748b'
          ],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'right',
            labels: { boxWidth: 10, color: textColor, font: { size: 10 } }
          }
        }
      }
    });
  }

  // Chart 3: Severity Breakdown
  const sevCounts = { 'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0 };
  reportsState.forEach(r => {
    if (sevCounts[r.severity] !== undefined) {
      sevCounts[r.severity] += 1;
    }
  });

  const ctxSev = document.getElementById('chartSeverity');
  if (ctxSev) {
    if (chartSeverity) chartSeverity.destroy();
    chartSeverity = new Chart(ctxSev, {
      type: 'pie',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: [sevCounts.Critical, sevCounts.High, sevCounts.Medium, sevCounts.Low],
          backgroundColor: ['#ef4444', '#f97316', '#f59e0b', '#3b82f6'],
          borderWidth: isDark ? 2 : 1,
          borderColor: isDark ? '#1e293b' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 10, color: textColor, font: { size: 10 } } }
        }
      }
    });
  }

  // Chart 4: Cleanliness Score 1 to 5 Distribution
  const scoreCounts = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  reportsState.forEach(r => {
    const sc = parseInt(r.cleanliness_score);
    if (scoreCounts[sc] !== undefined) scoreCounts[sc] += 1;
  });

  const ctxScore = document.getElementById('chartScores');
  if (ctxScore) {
    if (chartScores) chartScores.destroy();
    chartScores = new Chart(ctxScore, {
      type: 'bar',
      data: {
        labels: ['1 (Hazard)', '2 (Poor)', '3 (Fair)', '4 (Good)', '5 (Clean)'],
        datasets: [{
          label: 'Count',
          data: [scoreCounts[1], scoreCounts[2], scoreCounts[3], scoreCounts[4], scoreCounts[5]],
          backgroundColor: ['#ef4444', '#f97316', '#eab308', '#10b981', '#059669'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: textColor, font: { size: 9 } }, grid: { display: false } },
          y: { beginAtZero: true, ticks: { color: textColor, stepSize: 1 }, grid: { color: gridColor } }
        }
      }
    });
  }
}

// Minimal fallback seed in case static files are unreachable
function getFallbackSeed() {
  return [
    {
      id: "CR-1001",
      timestamp: "2026-11-20T08:15:00",
      zone: "North Campus",
      building: "Student Cafeteria",
      spot: "Ground Floor Dish Drop & Wash Area",
      category: "Overflowing Bins",
      cleanliness_score: 1,
      severity: "Critical",
      description: "Bins overflowing with food waste; greasy floor causing slip hazard.",
      reporter_name: "Aarav Sharma",
      reporter_role: "Student",
      reporter_email: "aarav.s@campus.edu",
      status: "In Progress",
      assigned_to: "Custodial Team Alpha",
      sla_hours: 4,
      resolved_at: null,
      notes: "Trash compacting scheduled."
    },
    {
      id: "CR-1002",
      timestamp: "2026-11-21T09:30:00",
      zone: "North Campus",
      building: "Student Cafeteria",
      spot: "Ground Floor Dish Drop & Wash Area",
      category: "Overflowing Bins",
      cleanliness_score: 1,
      severity: "Critical",
      description: "Second occurrence: bins overflowing post-lunch hour.",
      reporter_name: "Sunita Rao",
      reporter_role: "Staff",
      reporter_email: "srao@campus.edu",
      status: "Reported",
      assigned_to: "Custodial Supervisor",
      sla_hours: 2,
      resolved_at: null,
      notes: "Urgent escalation."
    },
    {
      id: "CR-1003",
      timestamp: "2026-11-21T11:00:00",
      zone: "Central Campus",
      building: "Central Library",
      spot: "2nd Floor Silent Study Wing",
      category: "Litter/Debris",
      cleanliness_score: 3,
      severity: "Medium",
      description: "Coffee cups and snack wrappers left around study carrels.",
      reporter_name: "Rohan Mehta",
      reporter_role: "Student",
      reporter_email: "rohan.m@campus.edu",
      status: "Resolved",
      assigned_to: "Floor Attendant 2",
      sla_hours: 12,
      resolved_at: "2026-11-21T14:10:00",
      notes: "Desks cleaned."
    }
  ];
}
