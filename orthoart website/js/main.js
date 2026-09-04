// main.js — nav active selon la section visible au scroll

document.addEventListener('DOMContentLoaded', () => {
  const navLinks = document.querySelectorAll('header nav a');
  const sections = document.querySelectorAll('main section[id]');

  const io = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        navLinks.forEach(link => {
          link.classList.toggle('active', link.getAttribute('href') === '#' + entry.target.id);
        });
      }
    });
  }, { threshold: 0.5 });

  sections.forEach(s => io.observe(s));
});
