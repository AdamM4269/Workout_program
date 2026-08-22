const STORAGE_KEY = 'muscu-program-performance';
const MOOD_KEY = 'muscu-program-session-mood';
const SESSION_KEY = 'muscu-program-last-session';

const SESSION_DATA = {
  a: {
    label: 'Séance A',
    focus: 'Pectoraux + Triceps',
    exercises: [
      { id: 'bench', name: 'Développé couché', step: 2.5, best: 75 },
      { id: 'incline', name: 'Presse inclinée aux haltères', step: 2.5, best: 50 },
      { id: 'dips', name: 'Dips ou pompes sur machine', step: 2.5, best: 25 },
      { id: 'row', name: 'Rowing ou tirage horizontal', step: 2.5, best: 50 },
      { id: 'lateral', name: 'Élévations latérales', step: 2.5, best: 12.5 }
    ]
  },
  b: {
    label: 'Séance B',
    focus: 'Jambes',
    exercises: [
      { id: 'squat', name: 'Squat', step: 2.5, best: 90 },
      { id: 'split', name: 'Fentes avec haltères', step: 2.5, best: 25 },
      { id: 'press', name: 'Presse jambes', step: 5, best: 90 },
      { id: 'curl', name: 'Leg curl', step: 2.5, best: 40 },
      { id: 'calf', name: 'Mollets debout', step: 2.5, best: 40 }
    ]
  },
  c: {
    label: 'Séance C',
    focus: 'Dos + Épaules + Biceps',
    exercises: [
      { id: 'pull', name: 'Traction ou tirage vertical', step: 2.5, best: 70 },
      { id: 'rowing', name: 'Rowing barre ou haltères', step: 2.5, best: 55 },
      { id: 'military', name: 'Développé militaire', step: 2.5, best: 40 },
      { id: 'biceps', name: 'Curl barre ou haltères', step: 2.5, best: 25 },
      { id: 'abs', name: 'Abdominaux', step: 2.5, best: 12.5 }
    ]
  }
};

function clampStep(value, step) {
  return Math.round(value / step) * step;
}

function getSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getSessionMood() {
  const value = Number(localStorage.getItem(MOOD_KEY) || 2);
  return value === 1 || value === 3 ? value : 2;
}

function saveSessionMood(mood) {
  localStorage.setItem(MOOD_KEY, String(mood));
}

function calculateNextWeight(exercise, mood) {
  const best = Number(exercise.best) || 0;
  const step = Number(exercise.step) || 2.5;

  if (mood === 1) return clampStep(best * 0.92, step);
  if (mood === 3) return clampStep(best * 1.05, step);
  return clampStep(best, step);
}

function getExerciseState(sessionKey) {
  const saved = getSavedData();
  const baseSession = SESSION_DATA[sessionKey] || { exercises: [] };

  return baseSession.exercises.map((exercise) => {
    const savedExercise = saved[exercise.id];
    return savedExercise ? { ...exercise, ...savedExercise } : exercise;
  });
}

function renderSessionSettings(sessionKey) {
  const session = SESSION_DATA[sessionKey];
  if (!session) return;

  const mood = getSessionMood();
  const exerciseState = getExerciseState(sessionKey);

  document.querySelectorAll('input[name="sessionMood"]').forEach((input) => {
    input.checked = Number(input.value) === mood;
  });

  exerciseState.forEach((exercise) => {
    const row = document.querySelector(`.perf-row[data-exercise-id="${exercise.id}"]`);
    if (!row) return;

    const input = row.querySelector('input[data-field="best"]');
    const suggestion = row.querySelector('.suggestion-value');
    const note = row.querySelector('.small-note');

    if (input) input.value = Number(exercise.best) || 0;

    if (suggestion) {
      const value = calculateNextWeight(exercise, mood);
      suggestion.textContent = `${value.toFixed(1).replace('.0', '')} kg`;
    }

    if (note) {
      note.textContent = mood === 1
        ? 'Tu es fatigué : on baisse légèrement la charge pour rester efficace.'
        : mood === 3
          ? 'Tu es en pleine forme : on vise une petite progression.'
          : 'Tu es dans une forme normale : on conserve ou on consolide.';
    }
  });
}

function updateStoredExerciseValues(sessionKey) {
  const session = SESSION_DATA[sessionKey];
  if (!session) return;

  const saved = getSavedData();
  const rows = document.querySelectorAll(`.perf-row[data-session="${sessionKey}"]`);

  rows.forEach((row) => {
    const exerciseId = row.dataset.exerciseId;
    const input = row.querySelector('input[data-field="best"]');
    if (!exerciseId || !input) return;

    const value = Number(input.value) || 0;
    saved[exerciseId] = { best: value };
  });

  saveData(saved);
  renderSessionSettings(sessionKey);
}

function renderLastSessionSummary() {
  const summary = document.getElementById('sessionSummary');
  if (!summary) return;

  const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
  if (!saved) {
    summary.textContent = 'Aucune séance validée pour le moment.';
    return;
  }

  const date = new Date(saved.date).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const line = (saved.exercises || []).slice(0, 3).map((ex) => `${ex.name}: ${ex.best} kg`).join(' • ');
  summary.textContent = `Dernière séance validée le ${date} : ${line}`;
}

function validateSession(sessionKey) {
  const session = SESSION_DATA[sessionKey];
  if (!session) return;

  const saved = getSavedData();
  const rows = document.querySelectorAll(`.perf-row[data-session="${sessionKey}"]`);

  rows.forEach((row) => {
    const exerciseId = row.dataset.exerciseId;
    const input = row.querySelector('input[data-field="best"]');
    if (!exerciseId || !input) return;
    const value = Number(input.value) || 0;
    const base = getExerciseState(sessionKey).find((ex) => ex.id === exerciseId);
    saved[exerciseId] = { best: Math.max(Number(base?.best) || 0, value) };
  });

  saveData(saved);

  const date = new Date().toISOString();
  const snapshot = {
    date,
    exercises: session.exercises.map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      best: Number((saved[exercise.id] && saved[exercise.id].best) || exercise.best || 0)
    }))
  };

  localStorage.setItem(SESSION_KEY, JSON.stringify(snapshot));
  renderLastSessionSummary();
}

function initializeSessionPage() {
  const sessionKey = document.body.dataset.session;
  if (!sessionKey || !SESSION_DATA[sessionKey]) return;

  const moodInputs = document.querySelectorAll('input[name="sessionMood"]');
  moodInputs.forEach((input) => {
    input.addEventListener('change', () => {
      saveSessionMood(Number(input.value));
      renderSessionSettings(sessionKey);
    });
  });

  document.querySelectorAll(`.perf-row[data-session="${sessionKey}"] input[data-field="best"]`).forEach((input) => {
    input.addEventListener('input', () => {
      updateStoredExerciseValues(sessionKey);
    });
  });

  const saveBtn = document.querySelector('[data-save-session]');
  if (saveBtn) {
    saveBtn.addEventListener('click', () => validateSession(sessionKey));
  }

  renderSessionSettings(sessionKey);
  renderLastSessionSummary();
}

document.addEventListener('DOMContentLoaded', () => {
  initializeSessionPage();
});
