document.documentElement.classList.add('has-js');

/* --- Navigation Behaviour --- */
const nav = document.querySelector('.site-nav');
const navLinks = document.querySelector('.nav-links');
const navToggle = document.querySelector('.nav-toggle');

let lastScroll = 0;

window.addEventListener('scroll', () => {
    const current = window.pageYOffset || document.documentElement.scrollTop;
    if (current > lastScroll && current > 120) {
        nav.classList.add('hidden');
    } else {
        nav.classList.remove('hidden');
    }
    lastScroll = current <= 0 ? 0 : current;

    if (navLinks && navLinks.classList.contains('active') && current > 0) {
        navLinks.classList.remove('active');
        navToggle?.classList.remove('active');
    }
});

navToggle?.addEventListener('click', () => {
    navToggle.classList.toggle('active');
    navLinks?.classList.toggle('active');
});

/* --- Footer Year Helper --- */
const yearEl = document.getElementById('current-year');
if (yearEl) {
    yearEl.textContent = new Date().getFullYear().toString();
}
