// dashboard.js — pages plein écran : panneau admin (recherche, favoris,
// note de séance, historique) + tableau de bord patient (lecture seule + historique)

let allPatients = [];

function openFullView(id) {
  document.body.style.overflow = 'hidden';
  const v = document.getElementById(id);
  v.classList.add('open');
  v.setAttribute('aria-hidden', 'false');
}
function closeFullView(id) {
  document.body.style.overflow = '';
  const v = document.getElementById(id);
  v.classList.remove('open');
  v.setAttribute('aria-hidden', 'true');
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-close-view]').forEach(btn => {
    btn.addEventListener('click', () => closeFullView(btn.dataset.closeView));
  });
});

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
}
function sign(n) { return n > 0 ? `+${n}` : `${n}`; }
function deltaClass(n) { return n > 0 ? 'delta-pos' : (n < 0 ? 'delta-neg' : 'delta-zero'); }

function renderHistoryList(history) {
  if (!history || history.length === 0) {
    return '<p class="history-empty">Aucune séance enregistrée pour l\'instant.</p>';
  }
  return history.map(h => {
    const rankChange = (h.rank_before != null && h.rank_after != null) ? (h.rank_before - h.rank_after) : null;
    return `
    <div class="history-item">
      <span class="history-date">${formatDate(h.created_at)}</span>
      <span class="history-note">${h.note ? escapeHtml(h.note) : '<em>Sans note</em>'}</span>
      <span class="history-deltas">
        <span class="${deltaClass(h.progress_delta)}">Progression ${sign(h.progress_delta)}%</span>
        <span class="${deltaClass(h.flame_delta)}"> ${sign(h.flame_delta)}</span>
        ${rankChange !== null ? `<span class="${deltaClass(rankChange)}">Rang ${rankChange > 0 ? '↑' : rankChange < 0 ? '↓' : '='}${Math.abs(rankChange)}</span>` : ''}
      </span>
    </div>
  `;
  }).join('');
}

// ---------------- Tableau de bord patient (page plein écran, lecture seule) ----------------
window.orthoOpenPatientDashboard = function (account) {
  const box = document.getElementById('patient-view-content');
  const pct = account.total_steps ? Math.round((account.step / account.total_steps) * 100) : 0;

  box.innerHTML = `
    <div class="patient-dashboard-v2">
      <div class="patient-view-header">
        <span class="dashboard-kicker">ESPACE PATIENT · TRAJECTOIRE ACTIVE</span>
        <h2>Bonjour, <em>${escapeHtml(account.name)}</em></h2>
        <p>Votre sourire avance avec vous, une étape après l’autre.</p>
      </div>
      <section class="patient-overview">
        <div class="progress-orbit-card">
          <span class="dashboard-kicker">progression du traitement</span>
          <div class="progress-ring-v2" style="--progress:${pct}%"><div><strong>${pct}</strong><span>%</span><small>du chemin</small></div></div>
          <b>${Math.round(account.step ?? 0)} / ${account.total_steps ?? '—'} étapes</b>
        </div>
        <div class="patient-summary-cards">
          <article><span>prochain rendez-vous</span><strong>${account.next_appointment ?? 'À planifier'}</strong><small>Nous vous préviendrons avant votre rendez-vous.</small></article>
          <article><span>régularité</span><strong>${account.flames ?? 0} flammes</strong><small>Chaque séance compte dans votre trajectoire.</small></article>
          <article><span>classement cabinet</span><strong>Rang #${account.rank ?? '—'}</strong><small>sur ${account.total_patients ?? '—'} patients</small></article>
        </div>
      </section>
      <div class="history-section patient-history-v2">
        <div class="dashboard-section-title"><span>votre chemin</span><small>Historique des séances</small></div>
      ${renderHistoryList(account.history)}
      </div>
    </div>
  `;
  openFullView('patient-view');

  // Popup "Tu as gagné" — basé sur la dernière séance enregistrée
  const last = (account.history && account.history[0]) || null;
  if (last) {
    setTimeout(() => showGainPopup(last), 400);
  }
};

function showGainPopup(last) {
  const overlay = document.createElement('div');
  overlay.className = 'gain-overlay';
  const rankChange = (last.rank_before != null && last.rank_after != null) ? (last.rank_before - last.rank_after) : null;
  overlay.innerHTML = `
    <div class="gain-box">
      <p class="gain-title">Tu as gagné: </p>
      <div class="gain-stats">
        <div class="gain-stat"><span class="${deltaClass(last.progress_delta)}">${sign(last.progress_delta)}%</span><span class="gain-lab">Progression</span></div>
        <div class="gain-stat"><span class="${deltaClass(last.flame_delta)}">${sign(last.flame_delta)} </span><span class="gain-lab">Flammes</span></div>
        ${rankChange !== null ? `<div class="gain-stat"><span class="${deltaClass(rankChange)}">${rankChange > 0 ? '↑' : rankChange < 0 ? '↓' : '='} ${Math.abs(rankChange)}</span><span class="gain-lab">Rang</span></div>` : ''}
      </div>
      ${last.note ? `<p class="gain-note">${escapeHtml(last.note)}</p>` : ''}
      <button class="btn-primary gain-close" data-sfx="confirm">Continuer</button>
    </div>
  `;
  document.body.appendChild(overlay);
  requestAnimationFrame(() => overlay.classList.add('open'));
  overlay.querySelector('.gain-close').addEventListener('click', () => {
    overlay.classList.remove('open');
    setTimeout(() => overlay.remove(), 300);
  });
}

// ---------------- Panneau admin (page plein écran) ----------------
window.orthoOpenAdminPanel = async function () {
  openFullView('admin-view');
  await refreshPatientList();
};

async function refreshPatientList() {
  const list = document.getElementById('patient-list');
  list.innerHTML = '<p class="modal-sub">Chargement…</p>';
  const result = await callAdminApi(currentAdminPin, 'list_patients');
  if (result.error) {
    list.innerHTML = `<p class="pin-status error">${escapeHtml(result.error)}</p>`;
    return;
  }
  allPatients = (result.patients || []).map(p => {
    const prog = Array.isArray(p.progress) ? p.progress[0] : p.progress;
    return { id: p.id, name: p.name, pin: p.pin_plain, ...(prog || {}) };
  });
  renderPatientList();
}

function renderPatientList(filter = '') {
  const list = document.getElementById('patient-list');
  const q = filter.trim().toLowerCase();

  let items = allPatients.filter(p => p.name.toLowerCase().includes(q));
  items.sort((a, b) => (b.favorite - a.favorite) || ((b.flames || 0) - (a.flames || 0)));

  if (items.length === 0) {
    list.innerHTML = '<p class="modal-sub">Aucun patient trouvé.</p>';
    return;
  }

  list.innerHTML = items.map((p) => {
    const step = p.step ?? 0, total = p.total_steps ?? 12;
    const pct = Math.round((step / total) * 100);
    return `
      <div class="patient-row" data-id="${p.id}" data-step="${step}" data-total="${total}" data-flames="${p.flames || 0}">
        <div class="patient-row-top">
          <span class="patient-name">${p.favorite ? ' ' : ''}${escapeHtml(p.name)}</span>
          <span class="patient-pct">${pct}% · ${p.flames || 0}</span>
        </div>
        <div class="patient-type-tag">${p.treatment_type === 'multi_attache' ? 'Multi-attaches' : `Gouttières · ${total} étapes`}</div>
        <div class="patient-pin-row">
          <span class="patient-pin-label">Code d'accès :</span>
          <code class="patient-pin-code">${escapeHtml(p.pin || '—')}</code>
          <button class="mini-btn-text copy-pin" data-pin="${escapeHtml(p.pin || '')}" data-sfx="hover-tick">Copier</button>
        </div>
        <div class="progress-bar small"><div class="progress-fill" style="width:${pct}%"></div></div>
        <div class="patient-actions">
          <button class="mini-btn-text act-modify" data-sfx="hover-tick">Modifier</button>
          <button class="mini-btn-text act-history" data-sfx="hover-tick">Historique</button>
          <button class="mini-btn-text act-favorite" data-sfx="hover-tick">${p.favorite ? 'Retirer favori' : 'Favori'}</button>
          <button class="mini-btn-text act-delete" data-sfx="hover-tick">Supprimer</button>
        </div>
        <div class="session-form" id="form-${p.id}" style="display:none;">
          <textarea placeholder="Note de séance..." class="session-note"></textarea>
          <div class="session-controls">
            <label>Progression <input type="number" class="session-progress" value="2" step="1"> %</label>
            <label>Flammes <input type="number" class="session-flames" value="0" step="1"></label>
          </div>
          <button class="btn-primary session-submit" data-sfx="confirm">Enregistrer la séance</button>
        </div>
        <div class="history-inline" id="history-${p.id}" style="display:none;"></div>
      </div>
    `;
  }).join('');

  list.querySelectorAll('.copy-pin').forEach(btn => btn.addEventListener('click', (e) => {
    navigator.clipboard.writeText(e.target.dataset.pin);
    e.target.textContent = 'Copié ✓';
    setTimeout(() => { e.target.textContent = 'Copier'; }, 1200);
  }));

  list.querySelectorAll('.act-modify').forEach(btn => btn.addEventListener('click', (e) => {
    const row = e.target.closest('.patient-row');
    const form = row.querySelector('.session-form');
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
  }));

  list.querySelectorAll('.act-history').forEach(btn => btn.addEventListener('click', async (e) => {
    const row = e.target.closest('.patient-row');
    const box = row.querySelector('.history-inline');
    if (box.style.display !== 'none') { box.style.display = 'none'; return; }
    box.style.display = 'block';
    box.innerHTML = '<p class="modal-sub">Chargement…</p>';
    const result = await callAdminApi(currentAdminPin, 'get_history', { account_id: row.dataset.id });
    box.innerHTML = renderHistoryList(result.history);
  }));

  list.querySelectorAll('.act-favorite').forEach(btn => btn.addEventListener('click', async (e) => {
    const row = e.target.closest('.patient-row');
    await callAdminApi(currentAdminPin, 'toggle_favorite', { account_id: row.dataset.id });
    await refreshPatientList();
  }));

  list.querySelectorAll('.act-delete').forEach(btn => btn.addEventListener('click', async (e) => {
    const row = e.target.closest('.patient-row');
    const name = row.querySelector('.patient-name').textContent;
    if (!confirm(`Supprimer ${name} ? Cette action est définitive.`)) return;
    await callAdminApi(currentAdminPin, 'delete_patient', { account_id: row.dataset.id });
    await refreshPatientList();
  }));

  list.querySelectorAll('.session-submit').forEach(btn => btn.addEventListener('click', async (e) => {
    const row = e.target.closest('.patient-row');
    const note = row.querySelector('.session-note').value.trim();
    const progressDelta = parseFloat(row.querySelector('.session-progress').value) || 0;
    const flameDelta = parseInt(row.querySelector('.session-flames').value, 10) || 0;
    btn.disabled = true;
    btn.textContent = 'Enregistrement…';
    const result = await callAdminApi(currentAdminPin, 'log_session', {
      account_id: row.dataset.id,
      note, progress_delta: progressDelta, flame_delta: flameDelta
    });
    if (result && result.error) {
      alert('Erreur lors de l\'enregistrement : ' + result.error);
      btn.disabled = false;
      btn.textContent = 'Enregistrer la séance';
      return;
    }
    await refreshPatientList();
  }));
}

document.addEventListener('DOMContentLoaded', () => {
  const addBtn = document.getElementById('add-patient-btn');
  const nameInput = document.getElementById('new-patient-name');
  const typeInput = document.getElementById('new-patient-type');
  const stepsInput = document.getElementById('new-patient-steps');
  const addStatus = document.getElementById('add-patient-status');
  const searchInput = document.getElementById('patient-search');

  if (typeInput && stepsInput) {
    typeInput.addEventListener('change', () => {
      stepsInput.style.display = typeInput.value === 'gouttiere' ? '' : 'none';
    });
  }

  addBtn.addEventListener('click', async () => {
    const name = nameInput.value.trim();
    if (!name) return;
    const treatmentType = typeInput ? typeInput.value : 'gouttiere';
    const totalSteps = stepsInput ? (parseInt(stepsInput.value, 10) || 12) : 12;
    addBtn.disabled = true;
    addStatus.textContent = 'Création…';
    const result = await callAdminApi(currentAdminPin, 'add_patient', {
      name, treatment_type: treatmentType, total_steps: totalSteps
    });
    if (result.error) {
      addStatus.textContent = 'Erreur : ' + result.error;
      addStatus.className = 'pin-status error';
    } else {
      addStatus.textContent = `Patient créé — code : ${result.pin} (à lui communiquer)`;
      addStatus.className = 'pin-status success';
      nameInput.value = '';
      await refreshPatientList();
    }
    addBtn.disabled = false;
  });

  if (searchInput) {
    searchInput.addEventListener('input', () => renderPatientList(searchInput.value));
  }
});

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}
