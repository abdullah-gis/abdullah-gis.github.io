/* ── NAV ── */
const nav = document.getElementById('mainNav');
window.addEventListener('scroll', () => {
nav.classList.toggle('scrolled', window.scrollY > 10);
const h = document.documentElement.scrollHeight - window.innerHeight;
document.getElementById('scrollProgress').style.width = (window.scrollY / h * 100) + '%';
});

/* ── HAMBURGER ── */
const hamburger = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
hamburger.addEventListener('click', () => {
hamburger.classList.toggle('open');
mobileMenu.classList.toggle('open');
});
function closeMobile() {
hamburger.classList.remove('open');
mobileMenu.classList.remove('open');
}

/* ── PAGE ROUTING ── */
function showSection(id) {
document.querySelectorAll('section').forEach(s => s.classList.remove('active'));
document.getElementById(id).classList.add('active');
document.querySelectorAll('.nav-links a[data-page]').forEach(a => a.classList.remove('active'));
const active = document.querySelector(`.nav-links a[data-page="${id}"]`);
if (active) active.classList.add('active');
window.scrollTo({ top: 0, behavior: 'smooth' });

// animate skill bars on CV
if (id === 'cv') {
    setTimeout(() => {
    document.querySelectorAll('.skill-bar-fill').forEach(bar => {
        const w = bar.style.width;
        bar.style.width = '0';
        setTimeout(() => { bar.style.width = w; }, 50);
    });
    }, 100);
}
return false;
}

function showProjectSub(sub) {
showSection('projects');
// scroll to grid
setTimeout(() => {
    const el = document.getElementById('projectsGrid');
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
}, 200);
}

/* ── CONTACT FORM ── */
function submitForm() {
const first = document.getElementById('firstName').value.trim();
const email = document.getElementById('emailInput').value.trim();
const msg = document.getElementById('message').value.trim();

if (!first || !email || !msg) {
    alert('Please fill in at least your name, email, and message.');
    return;
}
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert('Please enter a valid email address.');
    return;
}

const mailto = `mailto:dn.abdullah12riaz1@gmail.com?subject=${encodeURIComponent(document.getElementById('subject').value || 'Portfolio Contact')}&body=${encodeURIComponent(`From: ${first} ${document.getElementById('lastName').value}\nEmail: ${email}\n\n${msg}`)}`;
window.location.href = mailto;

document.getElementById('contactForm').style.display = 'none';
document.getElementById('formSuccess').classList.add('show');
}
