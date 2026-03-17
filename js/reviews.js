// js/reviews.js - cleaned up and made resilient
// Purpose: manage loading and submitting reviews for a business. The
// module only runs when the expected DOM elements are present on the
// page; this keeps it safe to import on other pages.
import { auth, database } from './auth.js';
import { showAlert } from './ui.js';
import { ref, push, get, update } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { renderStars } from './businesses.js';

// DOM references this module expects on the business details page.
const businessContainer = document.getElementById('business-container');
const submitBtn = document.getElementById('submit-review');
const commentEl = document.getElementById('review-comment');
const ratingEl = document.getElementById('review-rating');
const reviewsListEl = document.getElementById('reviews-list');

// Determine which business ID the page is showing
const urlParams = new URLSearchParams(window.location.search);
const businessId = urlParams.get('businessId') || urlParams.get('id');

if (businessId) {
    // Initialize behavior only on pages that include this businessId
    // and the expected DOM nodes.
    if (businessContainer) loadBusinessDetails();
    if (reviewsListEl) loadReviews();
    if (submitBtn) {
        // wire submit handler when present
        submitBtn.addEventListener('click', submitReview);
    }
}

// Load basic business info and write it into the details container
function loadBusinessDetails() {
    get(ref(database, `businesses/${businessId}`)).then(snapshot => {
        if (snapshot.exists()) {
            const business = snapshot.val();
            businessContainer.innerHTML = `
                <img src="${business.img || ''}" alt="${business.name}" style="max-width:300px;border-radius:12px;">
                <h2>${business.name}</h2>
                <p><strong>Category:</strong> ${business.category}</p>
                <p>${business.description || ''}</p>
            `;
        } else {
            businessContainer.innerHTML = '<p>Business not found.</p>';
        }
    }).catch(e => { console.error('Failed to load business', e); });
}

// Normalize different review shapes into a consistent object shape
function normalizeReviewObj(r) {
    return {
        name: r.name || r.userName || 'Anonymous',
        rating: Number(r.rating || r.stars || 0),
        text: r.text || r.comment || '',
        timestamp: r.timestamp || r.date || Date.now()
    };
}

// Load and render the list of reviews for the current business
function loadReviews() {
    get(ref(database, `businesses/${businessId}/reviews`)).then(snapshot => {
        if (!reviewsListEl) return;
        reviewsListEl.innerHTML = '';
        if (snapshot && snapshot.exists()) {
            const arr = Object.values(snapshot.val()).map(normalizeReviewObj).sort((a,b)=> (b.timestamp||0)-(a.timestamp||0));
            arr.forEach(r => {
                const div = document.createElement('div');
                div.className = 'review-card';
                const dateStr = r.timestamp ? new Date(r.timestamp).toLocaleDateString() : '';
                div.innerHTML = `<p><strong>${escapeHtml(r.name)}</strong> ${dateStr ? `(${dateStr})` : ''}</p><p class="review-stars">${renderStars(r.rating)}</p><p>${escapeHtml(r.text)}</p>`;
                reviewsListEl.appendChild(div);
            });
        } else {
            reviewsListEl.innerHTML = '<p>No reviews yet.</p>';
        }
    }).catch(e => { console.error('Failed to load reviews', e); });
}

// Submit a new review, update average/count, and refresh the list
async function submitReview() {
    const user = auth.currentUser;
    if (!user) { showAlert('You must be logged in to leave a review.', 'error'); return; }
    if (!commentEl || !ratingEl) return;
    const comment = commentEl.value.trim();
    const rating = Number(ratingEl.value);
    if (!comment || !rating || rating < 1 || rating > 5) { showAlert('Please provide a comment and a rating between 1-5.', 'error'); return; }

    try {
        // push review object into the business reviews list
        await push(ref(database, `businesses/${businessId}/reviews`), {
            uid: user.uid,
            name: user.displayName || user.email || 'Anonymous',
            rating,
            text: comment,
            timestamp: Date.now()
        });

        // Update average & count (same logic as businesses.js)
        const bizRef = ref(database, `businesses/${businessId}`);
        const bizSnap = await get(bizRef);
        let avg = 0, count = 0;
        if (bizSnap && bizSnap.exists()) { const val = bizSnap.val(); avg = Number(val.averageRating || 0); count = Number(val.reviewCount || 0); }
        const newCount = count + 1; const newAvg = ((avg * count) + rating) / newCount;
        await update(bizRef, { averageRating: newAvg, reviewCount: newCount });

        // clear inputs and refresh the reviews list
        if (commentEl) commentEl.value = '';
        if (ratingEl) ratingEl.value = '';
        if (reviewsListEl) await loadReviews();
    } catch (e) {
        console.error('Error submitting review', e);
        showAlert('Failed to submit review. Try again.', 'error');
    }
}

// Simple HTML-escaping helper for user-provided review text
function escapeHtml(str) {
    return String(str || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}