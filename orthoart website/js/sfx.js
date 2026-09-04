// sfx.js — sons synthétisés en direct (Web Audio API), aucun fichier audio requis

let actx;
function getCtx(){
  if(!actx) actx = new (window.AudioContext || window.webkitAudioContext)();
  return actx;
}

// Les navigateurs bloquent le son tant qu'il n'y a pas eu un vrai clic
// sur la page (règle anti-autoplay). On "réveille" l'audio au premier clic.
document.addEventListener('click', () => {
  const ctx = getCtx();
  if (ctx.state === 'suspended') ctx.resume();
}, { once: true });

function playTone({freq=440, type='sine', duration=0.15, gain=0.15, sweepTo=null, delay=0}){
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime+delay);
  if(sweepTo) osc.frequency.exponentialRampToValueAtTime(sweepTo, ctx.currentTime+delay+duration);
  g.gain.setValueAtTime(gain, ctx.currentTime+delay);
  g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime+delay+duration);
  osc.connect(g).connect(ctx.destination);
  osc.start(ctx.currentTime+delay);
  osc.stop(ctx.currentTime+delay+duration+0.02);
}

window.sfx = function(name){
  switch(name){
    case 'hover-tick': playTone({freq:1100, type:'sine', duration:.05, gain:.06}); break;
    case 'chime':
      playTone({freq:784, type:'sine', duration:.35, gain:.05});
      playTone({freq:1046.5, type:'sine', duration:.4, gain:.04, delay:.05});
      break;
    case 'confirm':
      playTone({freq:523.25, type:'sine', duration:.1, gain:.12});
      playTone({freq:659.25, type:'sine', duration:.16, gain:.12, delay:.07});
      break;
    case 'error':
      playTone({freq:300, type:'square', duration:.15, gain:.08, sweepTo:150});
      break;
    default: playTone({freq:800, type:'sine', duration:.06, gain:.08});
  }
};

// Branche automatiquement tout élément [data-sfx] du site
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('[data-sfx]').forEach(el => {
    el.addEventListener('click', () => window.sfx(el.dataset.sfx));
    el.addEventListener('mouseenter', () => window.sfx('hover-tick'));
  });
});
