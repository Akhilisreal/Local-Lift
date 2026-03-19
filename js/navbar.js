// Automatically hide the navbar when scrolling down and show when scrolling up.
// The navbar will always be visible when scrolled to the top.
const navbar = document.querySelector('.navbar');
if (navbar) {
  let lastScrollY = window.scrollY;
  let ticking = false;

  const onScroll = () => {
    const currentScrollY = window.scrollY;

    if (currentScrollY <= 0) {
      navbar.classList.remove('hidden');
    } else if (currentScrollY > lastScrollY) {
      // scrolling down
      navbar.classList.add('hidden');
    } else {
      // scrolling up
      navbar.classList.remove('hidden');
    }

    lastScrollY = currentScrollY;
    ticking = false;
  };

  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(onScroll);
      ticking = true;
    }
  }, { passive: true });
}