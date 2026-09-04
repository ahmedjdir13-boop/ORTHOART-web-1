// auth.js — connexion réelle (via Supabase RPC verify_pin), routage
// vers le panneau admin ou le tableau de bord patient selon le rôle.

let currentAdminPin = null; // gardé en mémoire le temps de la session (jamais stocké)

document.addEventListener('DOMContentLoaded', () => {
  const modal = document.getElementById('account-modal');
  const openBtns = [document.getElementById('open-account'), document.getElementById('open-account-2'), document.getElementById('account-toggle')].filter(Boolean);
  const closeBtn = document.getElementById('close-account');
  const boxes = Array.from(document.querySelectorAll('.pin-box'));
  const submitBtn = document.getElementById('pin-submit');
  const status = document.getElementById('pin-status');

  function openModal(){
    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');
    boxes.forEach(b => { b.value=''; b.classList.remove('filled','error'); });
    status.textContent = '\u00A0';
    status.className = 'pin-status';
    updateSubmitState();
    setTimeout(() => boxes[0].focus(), 250);
  }
  function closeModal(m = modal){
    m.classList.remove('open');
    m.setAttribute('aria-hidden', 'true');
  }
  window.orthoCloseModal = closeModal;

  openBtns.forEach(btn => btn.addEventListener('click', openModal));
  closeBtn.addEventListener('click', () => closeModal());
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });

  function updateSubmitState(){
    const complete = boxes.every(b => b.value.length === 1);
    submitBtn.disabled = !complete;
    submitBtn.classList.toggle('ready', complete);
  }

  boxes.forEach((box, i) => {
    box.addEventListener('input', () => {
      box.value = box.value.replace(/[^0-9]/g, '').slice(0, 1);
      box.classList.toggle('filled', box.value.length === 1);
      if (window.sfx) window.sfx('hover-tick');
      if (box.value && i < boxes.length - 1) boxes[i+1].focus();
      updateSubmitState();
    });
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Backspace' && !box.value && i > 0) boxes[i-1].focus();
    });
    box.addEventListener('paste', (e) => {
      e.preventDefault();
      const digits = (e.clipboardData.getData('text').match(/\d/g) || []).slice(0, 6);
      digits.forEach((d, idx) => { if (boxes[idx]) { boxes[idx].value = d; boxes[idx].classList.add('filled'); } });
      updateSubmitState();
      if (digits.length) boxes[Math.min(digits.length, boxes.length) - 1].focus();
    });
  });

  submitBtn.addEventListener('click', async () => {
    const code = boxes.map(b => b.value).join('');
    status.textContent = 'Vérification…';
    status.className = 'pin-status';
    submitBtn.disabled = true;

    const { data, error } = await supabaseClient.rpc('verify_pin', { input_pin: code });

    if (error) {
      // Vraie erreur technique (connexion, fonction manquante, etc.) — on l'affiche en clair
      status.textContent = 'Erreur technique : ' + error.message;
      status.className = 'pin-status error';
      if (window.sfx) window.sfx('error');
      updateSubmitState();
      return;
    }

    if (!data || data.length === 0) {
      status.textContent = 'Code invalide.';
      status.className = 'pin-status error';
      boxes.forEach(b => b.classList.add('error'));
      if (window.sfx) window.sfx('error');
      setTimeout(() => boxes.forEach(b => b.classList.remove('error')), 400);
      updateSubmitState();
      return;
    }

    const account = data[0];
    if (window.sfx) window.sfx('confirm');
    closeModal();

    if (account.role === 'admin') {
      currentAdminPin = code;
      window.orthoOpenAdminPanel();
    } else {
      window.orthoOpenPatientDashboard(account);
    }
  });
});
