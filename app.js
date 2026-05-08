// =============================================
// ORALÍSIMO — APPLICATION LOGIC
// =============================================

// ===== STATE =====
const State = {
  level: null,          // '5eme' | '3eme'
  topics: [],           // topics for current level
  currentTopic: null,   // selected topic
  drawnIds: [],         // IDs already drawn this session (anti-doublon)
  timerInterval: null,
  timerSeconds: 300,    // 5 min prep
  timerRunning: false,
  exchangeInterval: null,
  exchangeSeconds: 0,
  exchangeRunning: false,
  isFullscreen: false,
};

// ===== STORAGE HELPERS =====
function saveTopics() {
  localStorage.setItem('oralisimo_topics', JSON.stringify({
    "5eme": getTopicsForLevel("5eme"),
    "3eme": getTopicsForLevel("3eme"),
  }));
}

function loadTopics() {
  const saved = localStorage.getItem('oralisimo_topics');
  if (saved) {
    return JSON.parse(saved);
  }
  return null;
}

function getTopicsForLevel(level) {
  const saved = loadTopics();
  if (saved && saved[level]) return saved[level];
  return DEFAULT_TOPICS[level] || [];
}

function getAllTopics() {
  return {
    "5eme": getTopicsForLevel("5eme"),
    "3eme": getTopicsForLevel("3eme"),
  };
}

// ===== NAVIGATION =====
function goToScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  const target = document.getElementById(id);
  if (target) {
    target.classList.add('active');
    window.scrollTo(0, 0);
  }
}

function goHome() {
  stopPrepTimer();
  stopExchangeTimer();
  updateHomeStats();
  updateBadges();
  goToScreen('screen-home');
}

function changeLevel() {
  stopPrepTimer();
  stopExchangeTimer();
  State.drawnIds = []; // reset deduplication when changing level
  goToScreen('screen-login');
}

function goToAdmin() {
  updateAdminLevel(State.level || '5eme');
  updateBadges();
  goToScreen('screen-admin');
}

function updateBadges() {
  const label = State.level === '3eme' ? '3ème' : '5ème';
  document.querySelectorAll('[id^="badge-level"]').forEach(el => el.textContent = label);
}

// ===== LOGIN SCREEN =====
function selectLevel(level) {
  State.level = level;
  document.querySelectorAll('.level-btn').forEach(btn => {
    btn.classList.toggle('selected', btn.dataset.level === level);
  });
  document.getElementById('btn-enter').disabled = false;
}

function enterApp() {
  if (!State.level) return;
  State.topics = getTopicsForLevel(State.level);
  State.drawnIds = []; // reset deduplication on level entry
  updateHomeStats();
  updateBadges();
  goToScreen('screen-home');
}

function updateHomeStats() {
  const topics = getTopicsForLevel(State.level || '5eme');
  const total = topics.length;
  const drawn = State.drawnIds.filter(id => topics.find(t => t.id === id)).length;
  const remaining = total - drawn;

  const numEl = document.getElementById('stat-num');
  if (numEl) numEl.textContent = total;

  // Progress bar on home
  let prog = document.getElementById('home-progress');
  if (!prog && total > 0) {
    prog = document.createElement('div');
    prog.id = 'home-progress';
    prog.style.cssText = `
      width: 100%; max-width: 300px; margin: 0 auto;
      display: flex; flex-direction: column; align-items: center; gap: 6px;
    `;
    prog.innerHTML = `
      <div style="width:100%;height:8px;background:rgba(255,255,255,0.08);border-radius:99px;overflow:hidden;">
        <div id="home-prog-bar" style="height:100%;border-radius:99px;background:var(--brand-yellow);transition:width 0.5s ease;width:0%"></div>
      </div>
      <span id="home-prog-label" style="font-size:0.8rem;color:var(--text-muted);font-weight:700"></span>
    `;
    const statsEl = document.querySelector('.home-stats');
    if (statsEl) statsEl.appendChild(prog);
  }
  if (prog) {
    const pct = total > 0 ? Math.round((drawn / total) * 100) : 0;
    const bar = document.getElementById('home-prog-bar');
    const label = document.getElementById('home-prog-label');
    if (bar) bar.style.width = pct + '%';
    if (label) {
      if (drawn === 0) label.textContent = 'Aucun sujet tiré cette session';
      else if (remaining === 0) label.textContent = '🏁 Tous les sujets tirés !';
      else label.textContent = `${drawn} tiré${drawn > 1 ? 's' : ''} · ${remaining} restant${remaining > 1 ? 's' : ''}`;
    }
  }
}

// ===== FULLSCREEN =====
function toggleFullscreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      State.isFullscreen = true;
      updateFullscreenButtons();
    }).catch(() => showToast('⚠️ Plein écran non autorisé par le navigateur'));
  } else {
    document.exitFullscreen().then(() => {
      State.isFullscreen = false;
      updateFullscreenButtons();
    });
  }
}

function updateFullscreenButtons() {
  const icon = State.isFullscreen ? '✕ Quitter' : '⛶';
  document.querySelectorAll('.btn-fullscreen').forEach(btn => {
    btn.textContent = State.isFullscreen ? '⊡' : '⛶';
    btn.title = State.isFullscreen ? 'Quitter le plein écran' : 'Plein écran';
  });
}

document.addEventListener('fullscreenchange', () => {
  State.isFullscreen = !!document.fullscreenElement;
  updateFullscreenButtons();
});

// ===== TOPIC DRAW =====
/**
 * Deduplication strategy:
 * - On garde en mémoire les IDs déjà tirés dans State.drawnIds
 * - On pioche toujours dans les sujets NON encore tirés
 * - Quand tous les sujets ont été tirés, on repart du début (cycle complet)
 *   et on affiche un toast d'info
 */
function pickNextTopic(topics, exclude) {
  const remaining = topics.filter(t => !exclude.includes(t.id));
  if (remaining.length === 0) {
    // Tous les sujets ont été tirés → on repart du zéro (sauf le tout dernier)
    const fresh = topics.filter(t => t.id !== (State.currentTopic && State.currentTopic.id));
    return { topic: fresh[Math.floor(Math.random() * fresh.length)], cycleComplete: true };
  }
  return { topic: remaining[Math.floor(Math.random() * remaining.length)], cycleComplete: false };
}

function drawTopic() {
  const topics = getTopicsForLevel(State.level);
  if (!topics.length) {
    alert("Aucun sujet disponible pour ce niveau !");
    return;
  }

  const { topic, cycleComplete } = pickNextTopic(topics, State.drawnIds);
  if (!topic) return;

  if (cycleComplete) {
    // Tous les sujets ont été épuisés, on repart
    State.drawnIds = [];
    showToast('🔁 Tous les sujets ont été tirés — on repart du début !');
  }

  State.currentTopic = topic;
  State.drawnIds.push(topic.id);

  renderDrawCard(topic);
  updateDrawCounter(topics.length);
  goToScreen('screen-draw');
  updateBadges();

  const card = document.getElementById('draw-card');
  card.classList.remove('flipped', 'animating');
  document.getElementById('draw-actions').style.display = 'none';

  void card.offsetWidth;
  card.classList.add('animating');
  setTimeout(() => {
    card.classList.remove('animating');
    card.classList.add('flipped');
    setTimeout(() => {
      document.getElementById('draw-actions').style.display = 'flex';
    }, 500);
  }, 700);
}

function updateDrawCounter(total) {
  const drawn = State.drawnIds.length;
  const remaining = total - drawn;
  let el = document.getElementById('draw-counter');
  if (!el) {
    el = document.createElement('div');
    el.id = 'draw-counter';
    el.style.cssText = 'text-align:center;color:var(--text-muted);font-size:0.82rem;font-weight:700;margin-top:4px;letter-spacing:0.3px;';
    const stage = document.getElementById('draw-stage');
    if (stage) stage.after(el);
  }
  if (remaining <= 0) {
    el.textContent = '✅ Tous les sujets tirés !';
  } else {
    el.textContent = `🎯 ${drawn}/${total} sujets tirés · ${remaining} restant${remaining > 1 ? 's' : ''}`;
  }
}

function renderDrawCard(topic) {
  const badge = document.getElementById('topic-type-badge');
  badge.textContent = topic.type === 'debat' ? 'DÉBAT' : 'SITUATION';
  badge.className = 'topic-type-badge ' + topic.type;
  document.getElementById('topic-title').textContent = topic.title;
  document.getElementById('topic-desc').textContent = topic.desc;
}

function redrawTopic() {
  const card = document.getElementById('draw-card');
  card.classList.remove('flipped');
  document.getElementById('draw-actions').style.display = 'none';

  // Retirer le sujet actuel de la liste des tirés pour permettre de retomber dessus si c'est le seul restant
  // mais l'exclure ce tour-ci
  setTimeout(() => {
    const topics = getTopicsForLevel(State.level);
    if (!topics.length) return;

    // Exclure le sujet actuel de ce tirage (mais le garder dans drawnIds)
    const excludeNow = [...State.drawnIds];
    const remaining = topics.filter(t => !excludeNow.includes(t.id));

    let topic;
    let cycleComplete = false;

    if (remaining.length === 0) {
      // Cycle complet : on repart, sauf le sujet juste affiché
      State.drawnIds = State.currentTopic ? [State.currentTopic.id] : [];
      const fresh = topics.filter(t => !State.drawnIds.includes(t.id));
      if (!fresh.length) {
        showToast('Il n\'y a qu\'un seul sujet dans la banque !');
        card.classList.add('flipped');
        setTimeout(() => { document.getElementById('draw-actions').style.display = 'flex'; }, 500);
        return;
      }
      topic = fresh[Math.floor(Math.random() * fresh.length)];
      cycleComplete = true;
    } else {
      topic = remaining[Math.floor(Math.random() * remaining.length)];
    }

    if (cycleComplete) showToast('🔁 Cycle terminé — on repart du début !');

    State.currentTopic = topic;
    State.drawnIds.push(topic.id);
    renderDrawCard(topic);
    updateDrawCounter(topics.length);

    setTimeout(() => {
      card.classList.add('flipped');
      setTimeout(() => {
        document.getElementById('draw-actions').style.display = 'flex';
      }, 500);
    }, 100);
  }, 400);
}

// ===== PREP TIMER =====
function startPrep() {
  if (!State.currentTopic) return;

  // Setup prep screen
  const topic = State.currentTopic;
  const badge = document.getElementById('prep-topic-badge');
  badge.textContent = topic.type === 'debat' ? 'DÉBAT' : 'SITUATION';
  badge.className = 'prep-topic-badge ' + (topic.type === 'debat' ? 'debat' : 'situation');
  badge.style.background = topic.type === 'debat' ? 'var(--brand-orange)' : 'var(--brand-green)';
  badge.style.color = '#fff';
  document.getElementById('prep-topic-title').textContent = topic.title;

  State.timerSeconds = 300;
  State.timerRunning = true;
  updateTimerDisplay(300);
  updateTimerArc(300, 300);

  document.getElementById('btn-pause').textContent = '⏸️ Pause';
  goToScreen('screen-prep');
  updateBadges();

  State.timerInterval = setInterval(() => {
    if (!State.timerRunning) return;
    State.timerSeconds--;
    updateTimerDisplay(State.timerSeconds);
    updateTimerArc(State.timerSeconds, 300);

    if (State.timerSeconds <= 0) {
      stopPrepTimer();
      triggerExchange();
    }
    // Warning color at 1 min
    const arc = document.getElementById('timer-arc');
    if (State.timerSeconds <= 60) {
      arc.style.stroke = 'var(--brand-red)';
      arc.style.filter = 'drop-shadow(0 0 8px rgba(232,64,64,0.8))';
    } else if (State.timerSeconds <= 120) {
      arc.style.stroke = 'var(--brand-orange)';
      arc.style.filter = 'drop-shadow(0 0 8px rgba(255,124,26,0.7))';
    }
  }, 1000);
}

function updateTimerDisplay(sec) {
  const m = Math.floor(sec / 60).toString().padStart(1, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  document.getElementById('timer-display').textContent = `${m}:${s}`;
}

function updateTimerArc(sec, total) {
  const circumference = 553;
  const offset = circumference * (1 - sec / total);
  document.getElementById('timer-arc').style.strokeDashoffset = offset;
}

function pauseTimer() {
  State.timerRunning = !State.timerRunning;
  document.getElementById('btn-pause').textContent = State.timerRunning ? '⏸️ Pause' : '▶️ Reprendre';
}

function stopPrepTimer() {
  clearInterval(State.timerInterval);
  State.timerRunning = false;
}

function skipToExchange() {
  stopPrepTimer();
  triggerExchange();
}

// ===== EXCHANGE =====
function triggerExchange() {
  goToScreen('screen-exchange');
  updateBadges();
  renderExchangeScreen();

  // Show character overlay
  const overlay = document.getElementById('character-overlay');
  overlay.style.display = 'flex';
  overlay.classList.remove('out');

  setTimeout(() => {
    overlay.classList.add('out');
    setTimeout(() => {
      overlay.style.display = 'none';
    }, 500);
  }, 2500);

  // Start exchange timer
  State.exchangeSeconds = 0;
  State.exchangeRunning = true;
  updateExchangeTimer(0);
  State.exchangeInterval = setInterval(() => {
    if (!State.exchangeRunning) return;
    State.exchangeSeconds++;
    updateExchangeTimer(State.exchangeSeconds);
  }, 1000);
}

function renderExchangeScreen() {
  const topic = State.currentTopic;
  if (!topic) return;

  // Badge + title
  const badge = document.getElementById('exchange-topic-badge');
  badge.textContent = topic.type === 'debat' ? 'DÉBAT' : 'SITUATION';
  badge.className = 'exchange-topic-badge';
  badge.style.background = topic.type === 'debat' ? 'var(--brand-orange)' : 'var(--brand-green)';
  badge.style.color = '#fff';
  document.getElementById('exchange-topic-title').textContent = topic.title;

  // Communication aide
  const commBody = document.getElementById('panel-comm-body');
  commBody.innerHTML = '<ul class="comm-list">' +
    COMM_AIDE.map(cat =>
      cat.phrases.map(p => `<li class="comm-item"><strong>${cat.cat}</strong>${p}</li>`).join('')
    ).join('') +
    '</ul>';

  // Vocabulary
  const vocabBody = document.getElementById('panel-vocab-body');
  if (topic.vocab && topic.vocab.length) {
    vocabBody.innerHTML = '<ul class="vocab-list">' +
      topic.vocab.map(w => `<li class="vocab-chip">${w}</li>`).join('') +
      '</ul>';
  } else {
    vocabBody.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">Aucun vocabulaire spécifique ajouté.</p>';
  }

  // Clear notes
  document.getElementById('notes-area').value = '';
  document.getElementById('btn-exchange-timer').textContent = '⏸️ Pause échange';
}

function updateExchangeTimer(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  document.getElementById('exchange-timer-mini').textContent = `⏱️ ${m}:${s}`;
}

function toggleExchangeTimer() {
  State.exchangeRunning = !State.exchangeRunning;
  document.getElementById('btn-exchange-timer').textContent =
    State.exchangeRunning ? '⏸️ Pause échange' : '▶️ Reprendre échange';
}

function stopExchangeTimer() {
  clearInterval(State.exchangeInterval);
  State.exchangeRunning = false;
}

function endExchange() {
  stopExchangeTimer();
  const notes = document.getElementById('notes-area').value.trim();
  const topic = State.currentTopic;

  // Recap screen
  if (topic) {
    document.getElementById('recap-topic-info').innerHTML =
      `<strong>${topic.type === 'debat' ? '🔥 Débat' : '🎭 Situation'} :</strong> ${topic.title}`;
  }
  document.getElementById('recap-notes-saved').textContent =
    notes ? `📝 Notes sauvegardées (${notes.split('\n').filter(Boolean).length} lignes)` : 'Aucune note prise.';

  goToScreen('screen-recap');
  launchConfetti();
}

// ===== CONFETTI =====
function launchConfetti() {
  const zone = document.getElementById('confetti-zone');
  zone.innerHTML = '';
  const colors = ['#f5c400','#6c3fc5','#28c76f','#e84040','#3b82f6','#ff7c1a','#fff'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.left = Math.random() * 100 + 'vw';
    el.style.top = '-20px';
    el.style.background = colors[Math.floor(Math.random() * colors.length)];
    el.style.width = (6 + Math.random() * 10) + 'px';
    el.style.height = (6 + Math.random() * 10) + 'px';
    el.style.animationDuration = (2 + Math.random() * 3) + 's';
    el.style.animationDelay = (Math.random() * 1.5) + 's';
    zone.appendChild(el);
  }
}

// ===== ADMIN =====
let adminLevel = '5eme';

function switchAdminLevel(level) {
  adminLevel = level;
  document.getElementById('tab-5eme').classList.toggle('active', level === '5eme');
  document.getElementById('tab-3eme').classList.toggle('active', level === '3eme');
  updateAdminLevel(level);
}

function updateAdminLevel(level) {
  adminLevel = level;
  document.getElementById('admin-list-title').textContent =
    `Sujets pour la ${level === '5eme' ? '5ème' : '3ème'}`;
  renderTopicsList(level);
}

function renderTopicsList(level) {
  const topics = getTopicsForLevel(level);
  const container = document.getElementById('topics-list');
  if (!topics.length) {
    container.innerHTML = '<p style="color:var(--text-muted);font-size:0.9rem;padding:16px">Aucun sujet pour ce niveau.</p>';
    return;
  }
  container.innerHTML = topics.map((t, i) => `
    <div class="topic-item">
      <div class="topic-item-info">
        <div class="topic-item-head">
          <span class="topic-type-badge ${t.type}" style="font-size:0.7rem;padding:3px 10px">
            ${t.type === 'debat' ? 'DÉBAT' : 'SITUATION'}
          </span>
          <span class="topic-item-title">${escHtml(t.title)}</span>
        </div>
        <p class="topic-item-desc">${escHtml(t.desc)}</p>
        <div class="topic-item-vocab">
          ${(t.vocab || []).slice(0, 5).map(w => `<span class="vocab-chip" style="font-size:0.75rem">${escHtml(w)}</span>`).join('')}
          ${(t.vocab || []).length > 5 ? `<span style="color:var(--text-muted);font-size:0.75rem">+${t.vocab.length - 5}</span>` : ''}
        </div>
      </div>
      <button class="topic-item-delete" onclick="deleteTopic('${level}', '${t.id}')" title="Supprimer">🗑️</button>
    </div>
  `).join('');
}

function addTopic() {
  const type = document.getElementById('new-type').value;
  const title = document.getElementById('new-title').value.trim();
  const desc = document.getElementById('new-desc').value.trim();
  const vocabRaw = document.getElementById('new-vocab').value.trim();

  if (!title || !desc) {
    showToast('⚠️ Titre et description sont obligatoires !');
    return;
  }

  const vocab = vocabRaw ? vocabRaw.split('\n').map(w => w.trim()).filter(Boolean) : [];
  const id = `custom-${adminLevel}-${Date.now()}`;

  const all = getAllTopics();
  all[adminLevel].push({ id, type, title, desc, vocab });
  localStorage.setItem('oralisimo_topics', JSON.stringify(all));

  // Clear form
  document.getElementById('new-title').value = '';
  document.getElementById('new-desc').value = '';
  document.getElementById('new-vocab').value = '';

  renderTopicsList(adminLevel);
  updateHomeStats();
  showToast('✅ Sujet ajouté !');
}

function deleteTopic(level, id) {
  if (!confirm('Supprimer ce sujet ?')) return;
  const all = getAllTopics();
  all[level] = all[level].filter(t => t.id !== id);
  localStorage.setItem('oralisimo_topics', JSON.stringify(all));
  renderTopicsList(level);
  updateHomeStats();
  showToast('🗑️ Sujet supprimé');
}

// ===== TOAST NOTIFICATION =====
function showToast(msg) {
  const existing = document.getElementById('toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.textContent = msg;
  toast.style.cssText = `
    position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%);
    background: rgba(30,20,70,0.95); border: 1px solid rgba(255,255,255,0.15);
    color: #fff; padding: 12px 24px; border-radius: 999px;
    font-family: 'Nunito', sans-serif; font-weight: 700; font-size: 0.95rem;
    z-index: 999; backdrop-filter: blur(12px);
    animation: toastIn 0.3s ease;
    box-shadow: 0 8px 24px rgba(0,0,0,0.4);
  `;
  const style = document.createElement('style');
  style.textContent = `@keyframes toastIn { from { opacity:0; transform:translateX(-50%) translateY(12px);} to { opacity:1; transform:translateX(-50%) translateY(0);} }`;
  document.head.appendChild(style);
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ===== UTILS =====
function escHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    // Fermer l'overlay Oralísimo avec Echap
    if (e.key === 'Escape') {
      const overlay = document.getElementById('character-overlay');
      if (overlay && overlay.style.display !== 'none') {
        overlay.classList.add('out');
        setTimeout(() => { overlay.style.display = 'none'; }, 500);
      }
    }
    // F11 ou F = plein écran
    if (e.key === 'F11' || (e.key === 'f' && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA')) {
      if (e.key === 'F11') e.preventDefault();
      toggleFullscreen();
    }
  });

  // Reset arc color
  const arc = document.getElementById('timer-arc');
  if (arc) {
    arc.style.stroke = 'var(--brand-yellow)';
    arc.style.filter = 'drop-shadow(0 0 8px rgba(245,196,0,0.7))';
  }
});
