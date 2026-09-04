import { defineStore } from 'pinia';
import { adminImportPsd } from '@/services/cardTemplates.service';
import { apiErrorMessage } from '@/services/http';

function formatBytes(n) {
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let i = 0; let v = n;
  while (v >= 1024 && i < units.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(v >= 10 || i === 0 ? 0 : 1)} ${units[i]}`;
}

// Runs a PSD import independent of any single view's lifecycle — the
// upload can legitimately take a long time on a slow connection (up to
// the 2h client timeout), and an admin shouldn't be stuck staring at one
// page for that whole stretch. Since this is a Pinia store rather than
// component state, navigating to another page and back leaves the same
// upload/poll still running and still visible.
export const usePsdImportStore = defineStore('psdImport', {
  state: () => ({
    active: false, // upload/parse in flight
    fileName: '',
    fileSize: 0,
    stage: '',
    progress: 0,
    bytesText: '',
    error: '',
    errorHint: '',
    // Set once the import finishes successfully — the templates list can
    // watch for this to refresh itself and offer "open in Studio" even if
    // it wasn't the page that started the import.
    completedTemplate: null,
    startedAt: 0,
  }),
  actions: {
    dismissError() { this.error = ''; this.errorHint = ''; },
    dismissCompleted() { this.completedTemplate = null; },

    async startImport(file, meta) {
      if (this.active) return; // one import at a time — a second click shouldn't race the first
      this.active = true;
      this.fileName = file.name;
      this.fileSize = file.size;
      this.stage = `Uploading ${file.name} (${formatBytes(file.size)})…`;
      this.bytesText = `0 / ${formatBytes(file.size)}`;
      this.progress = 0;
      this.error = '';
      this.errorHint = '';
      this.completedTemplate = null;
      this.startedAt = Date.now();

      try {
        const tpl = await adminImportPsd(file, meta, {
          onUploadProgress: (evt) => {
            const total = evt.total || file.size;
            if (!total) return;
            const pct = Math.round((evt.loaded / total) * 100);
            this.progress = Math.min(pct, 99); // upload finishing != server work done
            const elapsedSec = Math.max(1, (Date.now() - this.startedAt) / 1000);
            const speed = evt.loaded / elapsedSec;
            this.bytesText = `${formatBytes(evt.loaded)} / ${formatBytes(total)}  ·  ${formatBytes(speed)}/s`;
            if (evt.loaded >= total) this.stage = 'Uploaded — waiting for the server to start parsing…';
          },
          onStage: (stage) => { this.stage = stage; this.bytesText = ''; },
        });
        this.progress = 100;
        this.stage = 'Done';
        this.completedTemplate = tpl;
      } catch (err) {
        const msg = apiErrorMessage(err);
        this.error = msg;
        const code = err?.response?.status;
        if (err?.code === 'ECONNABORTED' || /timeout/i.test(msg)) {
          this.errorHint = 'The upload took longer than 2 hours. Try a stronger connection, or shrink the PSD (flatten unused layers, downsample embedded images) before importing.';
        } else if (code === 408) {
          this.errorHint = 'The server did not receive the full file in time (nginx 408). This usually means the connection stalled mid-upload. Try again on a more stable network.';
        } else if (code === 413) {
          this.errorHint = 'The file exceeds the server upload cap. If this PSD is above 2 GB, shrink it before importing.';
        } else if (!err?.response) {
          this.errorHint = 'The browser lost the connection to the server. Check your network and retry.';
        }
      } finally {
        this.active = false;
      }
    },
  },
});
