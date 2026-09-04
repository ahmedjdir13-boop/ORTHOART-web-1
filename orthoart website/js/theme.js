// theme.js — bascule dark/light et bruit (grain), sans localStorage
// (à ajouter toi-même si tu veux que le choix persiste entre les visites :
//  localStorage.setItem('theme', value) / localStorage.getItem('theme'))

const html = document.documentElement;
const themeBtn = document.getElementById('theme-toggle');
const noiseBtn = document.getElementById('noise-toggle');

const moonIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.2 14.7A8.6 8.6 0 1 1 9.3 3.8a7.1 7.1 0 0 0 10.9 10.9Z"/></svg>';
const sunIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4.3"/><g stroke="currentColor" stroke-width="1.6" stroke-linecap="round"><path d="M12 3v2.2M12 18.8V21M21 12h-2.2M5.2 12H3M18.4 5.6l-1.6 1.6M7.2 16.8l-1.6 1.6M18.4 18.4l-1.6-1.6M7.2 7.2 5.6 5.6"/></g></svg>';

// Thème de départ : respecte la préférence système si dispo
const systemPrefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
if (systemPrefersLight) {
  html.setAttribute('data-theme', 'light');
  themeBtn.innerHTML = sunIcon;
}

themeBtn.addEventListener('click', () => {
  const current = html.getAttribute('data-theme');
  const next = current === 'dark' ? 'light' : 'dark';
  html.setAttribute('data-theme', next);
  themeBtn.innerHTML = next === 'dark' ? moonIcon : sunIcon;
  if (window.sfx) window.sfx('hover-tick');
});

noiseBtn.addEventListener('click', () => {
  const current = html.getAttribute('data-noise');
  const next = current === 'on' ? 'off' : 'on';
  html.setAttribute('data-noise', next);
  noiseBtn.style.opacity = next === 'on' ? '1' : '.5';
  if (window.sfx) window.sfx('hover-tick');
});