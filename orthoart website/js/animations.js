// animations.js — scroll reveal + tilt 3D léger sur la gouttière et les cartes

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ---- Reveal au scroll ----
const revealElements = document.querySelectorAll('.reveal');
if (revealElements.length > 0) {
  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) entry.target.classList.add('in');
    });
  }, { threshold: 0.15 });
  revealElements.forEach(el => io.observe(el));
}

if (!reduceMotion) {
  // ---- Tilt doux sur le logo flottant (suit la souris, subtil) ----
  const aligner = document.getElementById('aligner');
  if (aligner) {
    window.addEventListener('mousemove', (e) => {
      const rx = (e.clientY / window.innerHeight - 0.5) * -8;
      const ry = (e.clientX / window.innerWidth - 0.5) * 8;
      aligner.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg)`;
    });
    // Petit son au survol de la dent
    let chimed = false;
    aligner.addEventListener('mouseenter', () => {
      if (window.sfx && !chimed) { window.sfx('chime'); chimed = true; setTimeout(()=> chimed=false, 1200); }
    });
  }

  // ---- Tilt 3D sur les cartes de service ----
  document.querySelectorAll('.tilt-card').forEach(card => {
    card.addEventListener('mousemove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      const rx = (py - 0.5) * -10;
      const ry = (px - 0.5) * 10;
      card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translateZ(6px)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'rotateX(0) rotateY(0) translateZ(0)';
    });
  });
}

// Prévisualisation plein écran des soins : interaction demandée pour la V2.
// Elle ne touche ni à Supabase ni aux actions des cartes.
const treatmentPreview = document.getElementById('treatment-preview');
if (treatmentPreview) {
  const previewTitle = treatmentPreview.querySelector('strong');
  document.querySelectorAll('.treatment-card').forEach((card, index) => {
    card.setAttribute('tabindex', '0');
    card.setAttribute('role', 'button');
    card.addEventListener('click', () => {
      previewTitle.textContent = card.dataset.treatment || 'Nos soins';
      treatmentPreview.dataset.treatment = String(index + 1);
      treatmentPreview.classList.add('open');
      treatmentPreview.setAttribute('aria-hidden', 'false');
    });
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        card.click();
      }
    });
  });
  treatmentPreview.addEventListener('click', () => {
    treatmentPreview.classList.remove('open');
    treatmentPreview.setAttribute('aria-hidden', 'true');
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      treatmentPreview.classList.remove('open');
      treatmentPreview.setAttribute('aria-hidden', 'true');
    }
  });
}
