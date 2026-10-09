import { reactive } from 'vue';
import { generateMissingCards } from '@/services/cardTemplates.service';
import { apiErrorMessage } from '@/services/http';

const jobs = reactive({});

function storageKey(eventId) {
  return `amoevents:missing-card-generation:${eventId}`;
}

function persist(eventId) {
  try { sessionStorage.setItem(storageKey(eventId), JSON.stringify(jobs[eventId])); } catch (_) { /* optional */ }
}

export function getMissingCardGeneration(eventId) {
  if (!jobs[eventId]) {
    let saved = null;
    try { saved = JSON.parse(sessionStorage.getItem(storageKey(eventId)) || 'null'); } catch (_) { /* ignore */ }
    jobs[eventId] = saved || {
      status: 'idle', total: 0, completed: 0, failed: 0, templateName: '', error: '',
    };
  }
  return jobs[eventId];
}

export function observeMissingCardProgress(eventId, missingNow) {
  const job = getMissingCardGeneration(eventId);
  if (job.status !== 'running') return;
  job.completed = Math.max(job.completed || 0, Math.min(job.total, job.total - missingNow));
  persist(eventId);
}

export function startMissingCardGeneration({ eventId, templateId, templateName, total }) {
  const job = getMissingCardGeneration(eventId);
  Object.assign(job, {
    status: 'running', total, completed: 0, failed: 0, templateName, error: '',
    startedAt: Date.now(), finishedAt: null,
  });
  persist(eventId);

  // Deliberately keep this request alive after the template picker unmounts.
  // The Cards page observes this shared state and polls its own card list so
  // each finished JPEG appears without blocking navigation.
  generateMissingCards(templateId, eventId)
    .then((result) => {
      Object.assign(job, {
        status: result.failed?.length ? 'partial' : 'complete',
        completed: result.generated || 0,
        failed: result.failed?.length || 0,
        error: '',
        finishedAt: Date.now(),
      });
      persist(eventId);
    })
    .catch((error) => {
      Object.assign(job, {
        status: 'failed', error: apiErrorMessage(error), finishedAt: Date.now(),
      });
      persist(eventId);
    });

  return job;
}

export function clearMissingCardGeneration(eventId) {
  const job = getMissingCardGeneration(eventId);
  Object.assign(job, { status: 'idle', total: 0, completed: 0, failed: 0, error: '' });
  try { sessionStorage.removeItem(storageKey(eventId)); } catch (_) { /* optional */ }
}
