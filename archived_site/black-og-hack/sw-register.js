// Registers the DM WIN Predictor service worker (offline shell).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function () {
    navigator.serviceWorker.register('/black-og-hack/sw.js').catch(function () {});
  });
}
