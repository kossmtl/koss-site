// Service worker K-OSS — rend l'app "installable" (PWA) sur téléphone/tablette.
//
// Stratégie volontairement simple et sûre : "network-first" pour la page elle-même
// (index.html), donc chaque ouverture va chercher la dernière version en ligne — jamais
// coincé sur une vieille version. Le cache ne sert QUE de filet en cas de perte de réseau
// (l'app peut alors au moins s'ouvrir, même si les données à jour ne seront pas là tant que
// la connexion ne revient pas — Supabase reste indispensable pour les vraies données).
//
// ⚠️ Si un jour vous changez ce fichier, augmentez CACHE_VERSION pour forcer le nettoyage
// de l'ancien cache chez les utilisateurs.
const CACHE_VERSION = "koss-pwa-v1";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(APP_SHELL).catch(() => {}))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(names.filter((n) => n !== CACHE_VERSION).map((n) => caches.delete(n)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return; // laisse passer POST/etc. (Supabase, Helcim, ...) sans y toucher

  const url = new URL(req.url);
  // Ne touche qu'aux requêtes vers notre propre origine (jamais Supabase/Helcim/Resend/API tierces).
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, resClone)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match("./index.html")))
  );
});
