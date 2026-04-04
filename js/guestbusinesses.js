// js/guestbusinesses.js
// Renders business listings and detail pages for unauthenticated (guest) users.
// Guests can browse businesses and read reviews but cannot favorite or submit reviews.
import { businessData, renderStars, resolveAssetPath } from './businesses.js';
import { database } from './firebase.js';
import { ref, get } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

// Render business cards on the guest home page (guestbusiness.html).
// No favorite buttons — guests can only view details.
export async function renderGuestBusinessCards() {
    const container = document.getElementById('businessContainer');
    if (!container) return;
    container.innerHTML = '';

    const categorySelect = document.getElementById('categoryFilter');
    const sortSelect = document.getElementById('sortSelect');

    // Clone seed data with a placeholder for average rating
    const instances = businessData.map(d => ({ ...d, _avgRating: null }));

    // Save current selections before rebuilding the dropdown
    const prevCategory = categorySelect ? categorySelect.value : '';
    const prevSort = sortSelect ? sortSelect.value : '';

    // Populate category filter (restore previous selection after rebuilding)
    if (categorySelect) {
        const cats = Array.from(new Set(instances.map(i => i.category))).sort();
        categorySelect.innerHTML = `<option value="all">All</option>` +
            cats.map(c => `<option value="${c}">${c}</option>`).join('');
        if (prevCategory) {
            const hasPrev = Array.from(categorySelect.options).some(opt => opt.value === prevCategory);
            categorySelect.value = hasPrev ? prevCategory : 'all';
        }
    }
    if (sortSelect && prevSort) sortSelect.value = prevSort;

    // Fetch average ratings from Firebase (guests can read public data)
    await Promise.all(instances.map(async (inst) => {
        try {
            const s = await get(ref(database, `businesses/${inst.id}/averageRating`));
            inst._avgRating = s && s.exists() ? Number(s.val()) : null;
        } catch (e) {
            inst._avgRating = null;
        }
    }));

    // Apply filter and sort
    let list = instances.slice();
    if (categorySelect && categorySelect.value && categorySelect.value !== 'all') {
        list = list.filter(b => b.category === categorySelect.value);
    }
    if (sortSelect && sortSelect.value) {
        if (sortSelect.value === 'rating-desc') list.sort((a, b) => (b._avgRating || 0) - (a._avgRating || 0));
        else if (sortSelect.value === 'rating-asc') list.sort((a, b) => (a._avgRating || 0) - (b._avgRating || 0));
        else if (sortSelect.value === 'category-asc') list.sort((a, b) => a.category.localeCompare(b.category));
    }

    for (const inst of list) {
        const card = document.createElement('div');
        card.className = 'business-card';
        card.innerHTML = `
            <div class="card-image">
                <img class="business-image" src="${resolveAssetPath(inst.img)}" alt="${inst.name}">
            </div>
            <div class="card-content">
                <h3>${inst.name}</h3>
                <p>${inst.description}</p>
                <p><strong>Category:</strong> ${inst.category}</p>
                <div class="card-rating">Average Rating: <span class="avg-rating">${inst._avgRating ? Number(inst._avgRating).toFixed(1) : '—'}</span> <span class="avg-stars">${inst._avgRating ? renderStars(inst._avgRating) : ''}</span></div>
                <div class="card-buttons">
                    <button class="view-business-btn">View Details</button>
                </div>
            </div>
        `;
        card.querySelector('.view-business-btn').onclick = () =>
            window.location.href = `guestbusiness.html?businessId=${inst.id}`;
        container.appendChild(card);
    }

    // Re-render when filter/sort controls change
    if (categorySelect) categorySelect.onchange = () => renderGuestBusinessCards();
    if (sortSelect) sortSelect.onchange = () => renderGuestBusinessCards();
}

// Render the business detail page for guests (guestbusiness-detail.html).
// Shows business info and existing reviews; no review form, no favorites.
export async function renderGuestBusinessDetails() {
    const container = document.getElementById('businessDetailsContainer');
    if (!container) return;

    const businessId = new URLSearchParams(window.location.search).get('businessId');
    if (!businessId) { container.innerHTML = '<p>No business selected.</p>'; return; }

    const data = businessData.find(b => b.id === businessId);
    if (!data) { container.innerHTML = '<p>Business not found.</p>'; return; }

    // Fetch average rating
    let avg = null;
    try {
        const avgSnap = await get(ref(database, `businesses/${businessId}/averageRating`));
        if (avgSnap && avgSnap.exists()) avg = Number(avgSnap.val());
    } catch (e) { /* no average yet */ }

    container.innerHTML = `
        <div class="business-details-card">
            <div class="business-header">
                <img src="${resolveAssetPath(data.img)}" alt="${data.name}">
                <div class="business-details-content">
                    <h2>${data.name}</h2>
                    <p>${data.description}</p>
                    <p><strong>Category:</strong> ${data.category}</p>
                    ${Array.isArray(data.deals) && data.deals.length ? `
                        <div class="business-deals">
                            <h3>Deals</h3>
                            <ul class="deals-list">${data.deals.map(d => `<li>${escapeHtml(d)}</li>`).join('')}</ul>
                        </div>` : ''}
                    <div id="avgRating">Average: <span class="avg-rating">${avg ? Number(avg).toFixed(1) : '—'}</span> <span class="avg-stars">${avg ? renderStars(avg) : ''}</span></div>
                    <p class="guest-notice"><a href="login.html">Log in</a> to favorite businesses and leave reviews.</p>
                </div>
            </div>

            <div class="business-reviews">
                <section id="reviewsSection">
                    <h3>Reviews</h3>
                    <div id="reviewsList">Loading reviews...</div>
                    <p class="guest-notice" style="margin-top:16px"><a href="login.html">Log in</a> to submit a review.</p>
                </section>
            </div>

            <div class="business-map">
                <gmp-map
                    center="${data.latitude},${data.longitude}"
                    zoom="16"
                    map-id="DEMO_MAP_ID"
                    style="height: 500px">
                    <gmp-advanced-marker position="${data.latitude},${data.longitude}"></gmp-advanced-marker>
                </gmp-map>
            </div>
        </div>
    `;

    // Load and display reviews (read-only)
    try {
        const reviewsSnap = await get(ref(database, `businesses/${businessId}/reviews`));
        const reviewsList = document.getElementById('reviewsList');
        reviewsList.innerHTML = '';
        if (reviewsSnap && reviewsSnap.exists()) {
            const reviewsArr = Object.values(reviewsSnap.val())
                .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            reviewsArr.forEach(r => {
                const div = document.createElement('div');
                div.className = 'review-item';
                const name = r.name ? String(r.name).split('@')[0] : 'Anonymous';
                div.innerHTML = `<strong>${escapeHtml(name)}</strong> - <span class="review-stars">${renderStars(r.rating)}</span><p>${escapeHtml(r.text || '')}</p>`;
                reviewsList.appendChild(div);
            });
        } else {
            reviewsList.innerHTML = '<p>No reviews yet.</p>';
        }
    } catch (e) {
        console.error('Error loading reviews', e);
    }
}