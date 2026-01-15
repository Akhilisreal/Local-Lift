// Image-based captcha using an array of SVGs + expected answers
// Simple image-based captcha module
// This IIFE keeps captcha state private and exposes no globals. It
// picks a random image+answer pair, checks user input, and sets a
// session flag on success so the login page can be unlocked.
(function() {
    // Available captcha images and their expected answers
    const images = [
        { src: '../assets/captcha1.svg', answer: 'X7Bq2' },
        { src: '../assets/captcha2.svg', answer: 'mP9tZ' },
        { src: '../assets/captcha3.svg', answer: 'R4k8Y' },
        { src: '../assets/captcha4.svg', answer: 'tQ2h6' },
        { src: '../assets/captcha5.svg', answer: '9LmW1' },
        { src: '../assets/captcha6.svg', answer: 'Z3pV7' }
    ];

    // DOM references used by the captcha UI
    const imgEl = document.getElementById('captchaImg');
    const inputEl = document.getElementById('captchaInput');
    const verifyBtn = document.getElementById('verifyBtn');
    const refreshBtn = document.getElementById('refreshBtn');
    const msgEl = document.getElementById('captcha-msg');

    let current = null;
    let attempts = 0;
    const MAX_ATTEMPTS = 5;

    // Choose a random captcha image, clear messages, and enable controls
    function pickRandom() {
        // select a random index and assign current image
        const idx = Math.floor(Math.random() * images.length);
        current = images[idx];
        // update image element with cache-busting query param
        if (imgEl) imgEl.src = current.src + '?v=' + Date.now(); // cache-bust
        // clear any previous messages and re-enable inputs
        if (msgEl) { msgEl.textContent = ''; msgEl.style.color = ''; }
        if (inputEl) inputEl.value = '';
        if (verifyBtn) verifyBtn.disabled = false;
        if (inputEl) inputEl.disabled = false;
    }

    // Verify user input against the current captcha answer and handle
    // success/failure UI and attempt limits.
    function verify() {
        // basic validation and attempt limiting
        if (!current) return;
        if (attempts >= MAX_ATTEMPTS) return;
        const val = (inputEl.value || '').trim();
        if (!val) {
            msgEl.textContent = 'Please enter the characters shown.';
            return;
        }
        attempts++;
        // compare answers case-insensitively
        if (val.toLowerCase() === current.answer.toLowerCase()) {
            try { sessionStorage.setItem('captchaPassed', 'true'); } catch (e) {}
            msgEl.style.color = 'green';
            msgEl.textContent = 'Verified — redirecting to login...';
            // short delay before redirect so user can see the message
            setTimeout(() => { window.location.href = 'login.html'; }, 600);
        } else {
            // on failure, show message and either lock out or refresh image
            msgEl.style.color = '#b22222';
            if (attempts >= MAX_ATTEMPTS) {
                msgEl.textContent = 'Too many failed attempts. Please try again later.';
                verifyBtn.disabled = true;
                inputEl.disabled = true;
            } else {
                msgEl.textContent = `Incorrect — Attempts left: ${MAX_ATTEMPTS - attempts}`;
                pickRandom();
            }
        }
    }

    if (verifyBtn) verifyBtn.addEventListener('click', verify);
    if (refreshBtn) refreshBtn.addEventListener('click', (e) => { e.preventDefault(); pickRandom(); });

    // Start
    pickRandom();
})();
