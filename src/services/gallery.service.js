import axios from 'axios';
import http, { unwrap } from '@/services/http';

export const listGalleryPhotos = (eventId, albumId) =>
  http.get(`/events/${eventId}/gallery`, { params: albumId ? { albumId } : undefined }).then(unwrap);

export const listGalleryAlbums = (eventId) =>
  http.get(`/events/${eventId}/gallery/albums`).then(unwrap);
export const createGalleryAlbum = (eventId, payload) =>
  http.post(`/events/${eventId}/gallery/albums`, payload).then(unwrap);
export const updateGalleryAlbum = (eventId, albumId, patch) =>
  http.patch(`/events/${eventId}/gallery/albums/${albumId}`, patch).then(unwrap);
export const deleteGalleryAlbum = (eventId, albumId) =>
  http.delete(`/events/${eventId}/gallery/albums/${albumId}`).then(unwrap);

// Direct-to-origin upload — bypasses Cloudflare's proxy (which hard-caps
// request bodies around 100MB) so large gallery videos actually make it
// through. Same backend, same auth token, different hostname — see
// amoevents-backend/src/app.js and the upload.events.amoview.com nginx
// config for the server side of this. A plain axios instance (not the
// shared `http` client) since this doesn't need the 401-refresh dance for
// a single big upload call.
const uploadHttp = axios.create({
  baseURL: 'https://upload.events.amoview.com/api',
  timeout: 10 * 60 * 1000, // 10 min — large videos take a while on a slow connection
});
uploadHttp.interceptors.request.use((config) => {
  const token = localStorage.getItem('gc.accessToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export async function uploadGalleryPhotos(eventId, files, onProgress, albumId) {
  const form = new FormData();
  for (const f of files) form.append('photos', f, f.name);
  if (albumId) form.append('albumId', albumId);
  const res = await uploadHttp.post(`/events/${eventId}/gallery`, form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress?.(e),
  });
  return unwrap(res);
}

export const updateGalleryPhoto = (eventId, photoId, patch) =>
  http.patch(`/events/${eventId}/gallery/${photoId}`, patch).then(unwrap);

export const deleteGalleryPhoto = (eventId, photoId) =>
  http.delete(`/events/${eventId}/gallery/${photoId}`).then(unwrap);

export const getGalleryPinStatus = (eventId) =>
  http.get(`/events/${eventId}/gallery/pin`).then(unwrap);
export const setGalleryPin = (eventId, pin) =>
  http.put(`/events/${eventId}/gallery/pin`, { pin }).then(unwrap);

export const getGalleryShareUrl = (eventId, albumId) =>
  http.get(`/events/${eventId}/gallery/share-url`, { params: albumId ? { albumId } : undefined }).then(unwrap);
