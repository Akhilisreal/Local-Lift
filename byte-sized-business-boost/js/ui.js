// js/ui.js - shared UI features
// Purpose: small, reusable UI helpers used across the site (snackbars,
// visibility toggles, and small DOM builders). Keep UI utilities
// centralized so other modules can import them.
import { resolveAssetPath } from './businesses.js';

// showAlert: create a temporary message banner/snackbar on the page.
// `type` is a CSS class used for styling (info, error, success, etc.).
function showAlert(message, type = 'info') {
    const alertBox = document.createElement('div');
    alertBox.classList.add('alert-box', type);
    alertBox.textContent = message;
    document.body.appendChild(alertBox);
    setTimeout(() => alertBox.remove(), 3000);
}

// toggleElementVisibility: show or hide an element by id.
function toggleElementVisibility(elementId, show) {
    const el = document.getElementById(elementId);
    if (!el) return;
    el.style.display = show ? 'block' : 'none';
}

// createBusinessCard: helper to create a small business card DOM node
// used by the favorites/listing pages. Uses resolveAssetPath to make
// image paths work both from root and from /pages/.
function createBusinessCard(business) {
    const card = document.createElement('div');
    card.classList.add('business-card');
    const imgSrc = resolveAssetPath(business.img || business.image || 'assets/placeholder.jpg');
    const dealsText = Array.isArray(business.deals) ? business.deals.join(', ') : (business.deals || '');
    card.innerHTML = `
        <img src="${imgSrc}" alt="${business.name}" class="business-card-image">
        <div class="business-card-text">
            <h3>${business.name}</h3>
            <p>Category: ${business.category}</p>
            <p>${dealsText ? '🔥 ' + dealsText : ''}</p>
            <a href="pages/business.html?businessId=${business.id}" class="view-btn">View Business</a>
        </div>
    `;
    return card;
}

// clearContainer: empty the contents of a container element.
function clearContainer(containerId) {
    const container = document.getElementById(containerId);
    if (container) container.innerHTML = '';
}

export { showAlert, toggleElementVisibility, createBusinessCard, clearContainer };