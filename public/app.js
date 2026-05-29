const languageNames = {
  en: 'English',
  no: 'Norsk',
  sv: 'Svenska',
  pl: 'Polski'
};

const state = {
  language: localStorage.getItem('nova-language') || 'en',
  translations: {},
  sessionToken: localStorage.getItem('nova-session-token') || '',
  user: JSON.parse(localStorage.getItem('nova-user') || 'null'),
  matches: []
};

const page = document.body.dataset.page;

document.addEventListener('DOMContentLoaded', async () => {
  await initializeLanguage();
  if (page === 'index') {
    await setupLanding();
  } else {
    await setupApp();
  }
});

async function initializeLanguage() {
  const response = await fetch(`/api/i18n/${state.language}`);
  const payload = await response.json();
  state.language = payload.language;
  state.translations = payload.translations;
  localStorage.setItem('nova-language', state.language);

  document.querySelectorAll('#language-select').forEach((select) => {
    select.innerHTML = Object.entries(languageNames)
      .map(([value, label]) => `<option value="${value}">${label}</option>`)
      .join('');
    select.value = state.language;
    select.onchange = async (event) => {
      state.language = event.target.value;
      await initializeLanguage();
      if (page === 'index') {
        await loadCompanies();
      } else {
        await Promise.all([loadMatchesAndPredictions(), loadLeaderboard(), loadDashboard()]);
      }
    };
  });

  applyTranslations();
}

function t(key) {
  return state.translations[key] || key;
}

function applyTranslations() {
  document.documentElement.lang = state.language;
  document.querySelectorAll('[data-i18n]').forEach((element) => {
    const key = element.dataset.i18n;
    element.textContent = t(key);
  });
}

async function setupLanding() {
  await loadCompanies();

  document.getElementById('login-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await requestJson('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: form.get('email') })
    });
    showAuthFeedback(payload.message, payload.magic_link_url);
  });

  document.getElementById('signup-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const payload = await requestJson('/api/signup', {
      method: 'POST',
      body: JSON.stringify({
        name: form.get('name'),
        email: form.get('email'),
        company: form.get('company')
      })
    });
    showAuthFeedback(payload.message, payload.magic_link_url);
  });
}

async function loadCompanies() {
  const companies = await requestJson('/api/companies');
  const select = document.getElementById('company-select');
  if (!select) return;
  select.innerHTML = companies.map((company) => `<option value="${company.id}">${company.name}</option>`).join('');
}

function showAuthFeedback(message, magicLinkUrl) {
  const box = document.getElementById('auth-feedback');
  const text = document.getElementById('auth-message');
  const link = document.getElementById('magic-link');
  text.textContent = message;
  link.href = magicLinkUrl || '/app.html';
  link.classList.toggle('hidden', !magicLinkUrl);
  box.classList.remove('hidden');
}

async function setupApp() {
  if (await handleMagicLink()) return;
  if (!state.sessionToken || !state.user?.id) {
    window.location.href = '/';
    return;
  }

  document.getElementById('session-meta').textContent = `${t('signedInAs')} ${state.user.name}`;
  document.getElementById('logout-button').addEventListener('click', logout);
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.addEventListener('click', () => switchTab(button.dataset.tab));
  });
  document.getElementById('leaderboard-stage').addEventListener('change', () => loadLeaderboard());

  await Promise.all([loadMatchesAndPredictions(), loadLeaderboard(), loadDashboard()]);
}

async function handleMagicLink() {
  const url = new URL(window.location.href);
  const token = url.searchParams.get('magic_token');
  if (!token) return false;

  const payload = await requestJson(`/api/auth/verify?token=${encodeURIComponent(token)}`);
  state.sessionToken = payload.session_token;
  state.user = payload.user;
  localStorage.setItem('nova-session-token', state.sessionToken);
  localStorage.setItem('nova-user', JSON.stringify(state.user));
  url.searchParams.delete('magic_token');
  window.location.replace(url.pathname);
  return true;
}

function logout() {
  localStorage.removeItem('nova-session-token');
  localStorage.removeItem('nova-user');
  window.location.href = '/';
}

function switchTab(tab) {
  document.querySelectorAll('.tab-button').forEach((button) => {
    button.classList.toggle('active', button.dataset.tab === tab);
  });
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    panel.classList.toggle('hidden', panel.id !== `${tab}-tab`);
  });
}

async function loadMatchesAndPredictions() {
  state.matches = await requestJson('/api/matches');
  renderGroupPredictionCards();
  renderMatchCards();
}

function renderGroupPredictionCards() {
  const container = document.getElementById('group-predictions');
  if (!container) return;

  const groups = new Map();
  state.matches.filter((match) => match.group).forEach((match) => {
    const entries = groups.get(match.group) || new Map();
    entries.set(match.homeTeam.id, match.homeTeam);
    entries.set(match.awayTeam.id, match.awayTeam);
    groups.set(match.group, entries);
  });

  container.innerHTML = [...groups.entries()]
    .map(([group, teams]) => {
      const options = [...teams.values()]
        .map((team) => `<option value="${team.id}">${team.flagEmoji} ${team.name}</option>`)
        .join('');
      return `
        <form class="card stack group-form" data-group="${group}">
          <div class="match-header">
            <h3>Group ${group}</h3>
            <span class="countdown-pill">${t('groupPredictions')}</span>
          </div>
          <label>
            Winner
            <select name="winner_team">${options}</select>
          </label>
          <label>
            Runner-up
            <select name="runner_up_team">${options}</select>
          </label>
          <button type="submit" class="button-primary">${t('saveGroupPrediction')}</button>
        </form>`;
    })
    .join('');

  container.querySelectorAll('.group-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = new FormData(form);
      await authedJson('/api/predictions/group', {
        method: 'POST',
        body: JSON.stringify({
          group: form.dataset.group,
          winner_team: values.get('winner_team'),
          runner_up_team: values.get('runner_up_team')
        })
      });
      showToast(t('saveGroupPrediction'));
      await loadDashboard();
    });
  });
}

function renderMatchCards() {
  const container = document.getElementById('matches-list');
  if (!container) return;

  if (state.matches.length === 0) {
    container.innerHTML = `<p class="muted">${t('noMatches')}</p>`;
    return;
  }

  container.innerHTML = state.matches
    .map(
      (match) => `
      <form class="card stack match-form" data-match-id="${match.id}">
        <div class="match-header">
          <strong>${match.group_name}</strong>
          <span class="countdown-pill countdown" data-kickoff="${match.kickoff_at}"></span>
        </div>
        <div class="stack">
          <div class="team-line"><span class="team-badge">${match.homeTeam.flagEmoji} ${match.homeTeam.name}</span><strong>${match.home_score ?? '-'}</strong></div>
          <div class="team-line"><span class="team-badge">${match.awayTeam.flagEmoji} ${match.awayTeam.name}</span><strong>${match.away_score ?? '-'}</strong></div>
        </div>
        <div class="score-inputs">
          <input type="number" name="predicted_home" min="0" value="0" required />
          <input type="number" name="predicted_away" min="0" value="0" required />
        </div>
        <button type="submit" class="button-primary" ${match.status !== 'scheduled' ? 'disabled' : ''}>${t('savePrediction')}</button>
      </form>`
    )
    .join('');

  updateCountdowns();
  window.clearInterval(window.__novaCountdown);
  window.__novaCountdown = window.setInterval(updateCountdowns, 1000);

  container.querySelectorAll('.match-form').forEach((form) => {
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const values = new FormData(form);
      await authedJson('/api/predictions/match', {
        method: 'POST',
        body: JSON.stringify({
          match_id: form.dataset.matchId,
          predicted_home: Number(values.get('predicted_home')),
          predicted_away: Number(values.get('predicted_away'))
        })
      });
      showToast(t('savePrediction'));
      await loadDashboard();
    });
  });
}

function updateCountdowns() {
  document.querySelectorAll('.countdown').forEach((element) => {
    const distance = new Date(element.dataset.kickoff).getTime() - Date.now();
    if (distance <= 0) {
      element.textContent = 'Live / locked';
      return;
    }
    const hours = Math.floor(distance / 3600000);
    const minutes = Math.floor((distance % 3600000) / 60000);
    const seconds = Math.floor((distance % 60000) / 1000);
    element.textContent = `${t('countdown')}: ${hours}h ${minutes}m ${seconds}s`;
  });
}

async function loadLeaderboard() {
  const stage = document.getElementById('leaderboard-stage')?.value || 'all';
  const params = new URLSearchParams();
  if (stage && stage !== 'all') params.set('stage', stage);
  const rows = await requestJson(`/api/leaderboard${params.toString() ? `?${params}` : ''}`);
  const container = document.getElementById('leaderboard-list');
  if (!container) return;
  if (rows.length === 0) {
    container.innerHTML = `<p class="muted">${t('leaderboardEmpty')}</p>`;
    return;
  }
  container.innerHTML = rows
    .map(
      (row, index) => `
        <div class="leaderboard-row">
          <span>#${index + 1} ${row.name}</span>
          <strong>${row.points}</strong>
        </div>`
    )
    .join('');
}

async function loadDashboard() {
  const payload = await authedJson(`/api/dashboard/${state.user.id}`);
  const teamMap = new Map(
    state.matches.flatMap((match) => [
      [match.homeTeam.id, match.homeTeam],
      [match.awayTeam.id, match.awayTeam]
    ])
  );

  document.getElementById('dashboard-rank').textContent = payload.rank || '-';
  document.getElementById('dashboard-points').textContent = payload.points;
  document.getElementById('session-meta').textContent = `${t('signedInAs')} ${payload.user.name}`;
  renderCompactList(
    document.getElementById('dashboard-predictions'),
    payload.predictions.map((prediction) => {
      const match = state.matches.find((entry) => entry.id === prediction.match_id);
      if (!match) return `${prediction.match_id}: ${prediction.predicted_home}-${prediction.predicted_away}`;
      return `${match.homeTeam.flagEmoji} ${match.homeTeam.name} ${prediction.predicted_home}-${prediction.predicted_away} ${match.awayTeam.name} ${match.awayTeam.flagEmoji}`;
    })
  );
  renderCompactList(
    document.getElementById('dashboard-groups'),
    payload.group_predictions.map((prediction) => {
      const winner = teamMap.get(prediction.winner_team);
      const runnerUp = teamMap.get(prediction.runner_up_team);
      return `${prediction.group}: ${winner?.flagEmoji || ''} ${winner?.name || prediction.winner_team} / ${runnerUp?.flagEmoji || ''} ${runnerUp?.name || prediction.runner_up_team}`;
    })
  );
}

function renderCompactList(container, items) {
  if (!container) return;
  if (items.length === 0) {
    container.innerHTML = `<p class="muted">${t('noPredictions')}</p>`;
    return;
  }
  container.innerHTML = items.map((item) => `<div class="compact-item">${item}</div>`).join('');
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    },
    ...options
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    showToast(payload.error || 'Request failed');
    throw new Error(payload.error || 'Request failed');
  }
  return payload;
}

function authedJson(url, options = {}) {
  return requestJson(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.sessionToken}`,
      ...(options.headers || {})
    }
  });
}

function showToast(message) {
  const element = document.getElementById('app-feedback') || document.getElementById('auth-feedback');
  if (!element) return;
  if (element.id === 'app-feedback') {
    element.textContent = message;
    element.classList.remove('hidden');
    window.clearTimeout(window.__novaToast);
    window.__novaToast = window.setTimeout(() => element.classList.add('hidden'), 2500);
  } else {
    document.getElementById('auth-message').textContent = message;
    element.classList.remove('hidden');
  }
}
