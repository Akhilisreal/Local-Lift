// js/businesses.js
// Purpose: render business listings and business detail pages, seed sample
// business data into the Realtime Database, and handle review submission
// related UI logic. This module exposes render functions used by pages.
import { auth } from "./auth.js";
import { showAlert } from './ui.js';
import { toggleFavorite, isFavorited } from "./favorites.js";
import { database } from "./firebase.js";
import { ref, get, push, update } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

// Resolve asset paths so pages in /pages/ load images from project root
function resolveAssetPath(p) {
  // return early when value is falsy
  if (!p) return p;
  const str = String(p).trim();
  // absolute URLs and root paths are already correct
  if (str.startsWith('http') || str.startsWith('/')) return str;
  // when we're rendering a page from /pages/, adjust relative paths
  if (window.location.pathname.includes('/pages/') && !str.startsWith('../')) {
    return '../' + str;
  }
  // otherwise leave the path as-is
  return str;
}

// Seed data for example businesses used when the app starts.
// In production this would come from an external admin tool or API.
// Seeding Business Data
const businessData = [
  { id: "biz1", name: "Joe's Coffee", category: "Food", img: "assets/coffee.jpg", description: "Great coffee shop", deals: ["Buy one get one free on small drip coffee (Mon)", "10% off all pastries"] },
  { id: "biz2", name: "Local Bookstore", category: "Retail", img: "assets/bookstore.jpg", description: "Books and more", deals: ["Member discount: 15% off new releases"] },
  { id: "biz3", name: "Quick Cleaners", category: "Services", img: "assets/cleaner.jpg", description: "Laundry & dry cleaning", deals: ["First-time customers 20% off"] },
  { id: "biz4", name: "Sunny Bakery", category: "Food", img: "assets/bakery.jpg", description: "Fresh breads and pastries", deals: ["Free cookie with any loaf on Tuesdays"] },
  { id: "biz5", name: "Tech Repair Co.", category: "Services", img: "assets/repair.jpg", description: "Phone & computer repairs", deals: ["10% off screen replacements"] },
  { id: "biz6", name: "Green Salon", category: "Services", img: "assets/salon.jpg", description: "Eco-friendly haircuts and styling", deals: ["Student discount 15% on weekdays"] },
];

// Class that represents each business and contains helpers to ensure
// seed data exists in the database and to render UI cards.
// Ensure each business exists in the Realtime Database (seed data)
class Business {
  constructor(data) {
    Object.assign(this, data);
    this._avgRating = null;
  }

  static async ensureAllSeeded() {
    // For each seed entry ensure a corresponding DB node exists or is updated
    const ops = businessData.map(async (b) => {
      const bizRef = ref(database, `businesses/${b.id}`);
      try {
        // read current value for this business
        const snap = await get(bizRef);
        // if not present, write the full seed object
        if (!snap || !snap.exists()) {
          await update(bizRef, {
            name: b.name,
            category: b.category,
            img: b.img,
            description: b.description,
            deals: b.deals || [],
            averageRating: 0,
            reviewCount: 0
          });
        } else {
          // if already present, only add missing fields or sync changed ones
          const val = snap.val();
          const updates = {};
          if (val.name !== b.name) updates.name = b.name;
          if (val.category !== b.category) updates.category = b.category;
          if (val.img !== b.img) updates.img = b.img;
          if (val.description !== b.description) updates.description = b.description;
          if (!('deals' in val)) updates.deals = b.deals || [];
          if (!('averageRating' in val)) updates.averageRating = 0;
          if (!('reviewCount' in val)) updates.reviewCount = 0;
          // apply updates only when there are changes
          if (Object.keys(updates).length) await update(bizRef, updates);
        }
      } catch (e) {
        // log but do not throw: seeding is best-effort
        console.warn('Failed to ensure business in DB', b.id, e);
      }
    });
    // wait for all seed operations to complete
    await Promise.all(ops);
  }

  static async fetchAverages(instances) {
    // fetch averageRating for each instance in parallel
    const avgPromises = instances.map(async (inst) => {
      try {
        const s = await get(ref(database, `businesses/${inst.id}/averageRating`));
        return s && s.exists() ? Number(s.val()) : null;
      } catch (e) {
        // if a single fetch fails, return null for that entry
        return null;
      }
    });
    const avgs = await Promise.all(avgPromises);
    // attach fetched averages back onto instances
    instances.forEach((inst, i) => inst._avgRating = avgs[i]);
  }

  renderCard() {
    const card = document.createElement('div');
    card.className = 'business-card';
    card.dataset.id = this.id;
    card.innerHTML = `
      <div class="card-image">
        <img class="business-image" src="${resolveAssetPath(this.img)}" alt="${this.name}">
      </div>
      <div class="card-content">
        <h3>${this.name}</h3>
        <p>${this.description}</p>
        <p><strong>Category:</strong> ${this.category}</p>
        <div class="card-rating">Average Rating: <span class="avg-rating">${this._avgRating ? Number(this._avgRating).toFixed(1) : '—'}</span> <span class="avg-stars">${this._avgRating ? renderStars(this._avgRating) : ''}</span></div>
        <div class="card-buttons">
          <button class="view-business-btn">View Details</button>
          <button class="favorite-btn">❤️ Favorite</button>
        </div>
      </div>
    `;
    return card;
  }
}

const businessContainer = document.getElementById('businessContainer');
const businessDetailsContainer = document.getElementById('businessDetailsContainer');

// Render the list of business cards on the home/index page. This builds
// DOM nodes, wires up favorite/view buttons, and applies filtering/sorting.
// Render cards for index.html
async function renderBusinessCards() {
  if (!businessContainer) return;
  // clear previous cards
  businessContainer.innerHTML = '';

  // ensure seed data exists before rendering
  await Business.ensureAllSeeded();

  // read filter/sort controls if present
  const categorySelect = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortSelect');

  // create Business instances from the seed data (or source array)
  const instances = businessData.map(d => new Business(d));

  // populate category filter options when the control exists
  if (categorySelect) {
    const prev = categorySelect.value; // remember previous selection
    const cats = Array.from(new Set(instances.map(i => i.category))).sort();
    categorySelect.innerHTML = `<option value="all">All</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
    // restore previous selection when possible
    if (prev) {
      const hasPrev = Array.from(categorySelect.options).some(opt => opt.value === prev);
      categorySelect.value = hasPrev ? prev : 'all';
    }
  }

  // fetch per-business average ratings before rendering
  await Business.fetchAverages(instances);

  // prepare the list, apply category filter and sort if controls are present
  let list = instances.slice();
  if (categorySelect && categorySelect.value && categorySelect.value !== 'all') {
    list = list.filter(b => b.category === categorySelect.value);
  }
  if (sortSelect && sortSelect.value) {
    if (sortSelect.value === 'rating-desc') list.sort((a,b)=> (b._avgRating||0) - (a._avgRating||0));
    else if (sortSelect.value === 'rating-asc') list.sort((a,b)=> (a._avgRating||0) - (b._avgRating||0));
    else if (sortSelect.value === 'category-asc') list.sort((a,b)=> a.category.localeCompare(b.category));
  }

  // create DOM for each business and wire up buttons
  for (const inst of list) {
    const card = inst.renderCard();
    businessContainer.appendChild(card);

    // view details button navigates to the business detail page
    const viewBtn = card.querySelector('.view-business-btn');
    viewBtn.onclick = () => window.location.href = `pages/business.html?businessId=${inst.id}`;

    // favorite button: initialize label then attach toggle handler
    const favBtn = card.querySelector('.favorite-btn');
    (async () => {
      const favorited = await isFavorited(inst.id);
      favBtn.textContent = favorited ? '💔 Unfavorite' : '❤️ Favorite';
    })();

    // click toggles favorite status and updates button label
    favBtn.onclick = async () => {
      await toggleFavorite(inst.id);
      favBtn.textContent = (await isFavorited(inst.id)) ? '💔 Unfavorite' : '❤️ Favorite';
    };
  }

  // re-render when controls change
  if (categorySelect) categorySelect.onchange = () => renderBusinessCards();
  if (sortSelect) sortSelect.onchange = () => renderBusinessCards();
}

// Render the business details view (business.html). This populates the
// page with the selected business, loads averages/reviews, and attaches
// the review submission handler.
// Render details for business.html
async function renderBusinessDetails() {
  if (!businessDetailsContainer) return;
  // get businessId from query string
  const businessId = new URLSearchParams(window.location.search).get('businessId');
  if (!businessId) { businessDetailsContainer.innerHTML = '<p>No business selected.</p>'; return; }

  // find the seed data object for this id
  const data = businessData.find(b => b.id === businessId);
  if (!data) { businessDetailsContainer.innerHTML = '<p>Business not found.</p>'; return; }

  // ensure DB seed exists and create an instance for rendering
  await Business.ensureAllSeeded();
  const business = new Business(data);

  // build the details UI (static HTML portion)
  businessDetailsContainer.innerHTML = `
    <div class="business-details-card">
      <div class="business-header">
        <img src="${resolveAssetPath(business.img)}" alt="${business.name}">
        <div class="business-details-content">
          <h2>${business.name}</h2>
          <p>${business.description}</p>
          <p><strong>Category:</strong> ${business.category}</p>
          ${Array.isArray(business.deals) && business.deals.length ? `
            <div class="business-deals"><h3>Deals</h3><ul class="deals-list">${business.deals.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul></div>` : ''}
          <div id="avgRating">Average: <span class="avg-rating">—</span> <span class="avg-stars"></span></div>
          <button id="favBtn">❤️ Favorite</button>
        </div>
      </div>

      <div class="business-reviews">
        <section id="reviewsSection">
          <h3>Reviews</h3>
          <div id="reviewsList">Loading reviews...</div>
          <form id="reviewForm">
            <label for="reviewRating">Rating:</label>
            <select id="reviewRating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
            <label for="reviewText">Review:</label>
            <textarea id="reviewText" rows="4" placeholder="Write your review..."></textarea>
            <button type="submit">Submit Review</button>
          </form>
        </section>
      </div>
    </div>
  `;

  // favorite button setup: initial text and click handler
  const favBtn = document.getElementById('favBtn');
  favBtn.textContent = (await isFavorited(businessId)) ? '💔 Unfavorite' : '❤️ Favorite';
  favBtn.onclick = async () => { await toggleFavorite(businessId); favBtn.textContent = (await isFavorited(businessId)) ? '💔 Unfavorite' : '❤️ Favorite'; };

  // load and display the average rating
  async function loadAverage() {
    try {
      const avgSnap = await get(ref(database, `businesses/${businessId}/averageRating`));
      const avgEl = document.querySelector('#avgRating .avg-rating');
      const starsEl = document.querySelector('#avgRating .avg-stars');
      if (avgSnap && avgSnap.exists()) {
        const avg = avgSnap.val();
        if (avgEl) avgEl.textContent = Number(avg).toFixed(1);
        if (starsEl) starsEl.innerHTML = renderStars(avg);
      } else {
        // no average exists yet
        if (avgEl) avgEl.textContent = '—';
        if (starsEl) starsEl.textContent = '';
      }
    } catch (e) {
      // log errors fetching average
      console.error('Error loading average', e);
    }
  }

  // load and render reviews for this business
  async function loadReviews() {
    try {
      const reviewsSnap = await get(ref(database, `businesses/${businessId}/reviews`));
      const reviewsList = document.getElementById('reviewsList');
      reviewsList.innerHTML = '';
      if (reviewsSnap && reviewsSnap.exists()) {
        // convert snapshot to array and sort by timestamp desc
        const reviewsArr = Object.values(reviewsSnap.val()).sort((a,b)=> (b.timestamp||0)-(a.timestamp||0));
        reviewsArr.forEach(r => {
          const div = document.createElement('div');
          div.className = 'review-item';
          const displayName = formatReviewerName(r.name);
          div.innerHTML = `<strong>${escapeHtml(displayName)}</strong> - <span class="review-stars">${renderStars(r.rating)}</span><p>${escapeHtml(r.text || '')}</p>`;
          reviewsList.appendChild(div);
        });
      } else {
        reviewsList.innerHTML = '<p>No reviews yet. Be the first!</p>';
      }
    } catch (e) {
      console.error('Error loading reviews', e);
    }
  }

  // normalize reviewer name for display
  function formatReviewerName(name) {
    if (!name) return 'Anonymous';
    const s = String(name).trim(); if (!s) return 'Anonymous';
    const atIdx = s.indexOf('@'); if (atIdx > 0) return s.slice(0, atIdx); return s;
  }

  // handle review submission: push to DB and update averages/UI
  const reviewForm = document.getElementById('reviewForm');
  if (reviewForm) {
    reviewForm.addEventListener('submit', async (ev)=>{
      ev.preventDefault();
      // read values from the form
      const rating = Number(document.getElementById('reviewRating').value);
      const text = document.getElementById('reviewText').value.trim();
      const user = auth.currentUser;
      const name = user?.displayName || user?.email || 'Anonymous';
      try {
        // push review record
        await push(ref(database, `businesses/${businessId}/reviews`), { uid: user.uid, name, rating, text, timestamp: Date.now() });
        
        // update aggregate counters (reviewCount, averageRating)
        const bizRef = ref(database, `businesses/${businessId}`);
        const bizSnap = await get(bizRef);
        let avg = 0, count = 0;
        if (bizSnap && bizSnap.exists()) {
          const val = bizSnap.val(); avg = Number(val.averageRating || 0); count = Number(val.reviewCount || 0);
        }
        const newCount = count + 1;
        const newAvg = ((avg * count) + rating) / newCount;
        await update(bizRef, { averageRating: newAvg, reviewCount: newCount });

        // clear form and refresh UI
        document.getElementById('reviewText').value = '';
        await loadAverage(); await loadReviews();

        // if the card exists on the index page update its displayed average
        const card = document.querySelector(`.business-card[data-id="${businessId}"]`);
        if (card) {
          const avgEl = card.querySelector('.avg-rating');
          const starsEl = card.querySelector('.avg-stars');
          if (avgEl) avgEl.textContent = Number(newAvg).toFixed(1);
          if (starsEl) starsEl.innerHTML = renderStars(newAvg);
        }
      } catch (e) {
        // show error and log
        console.error('Error submitting review', e);
        showAlert('Failed to submit review. Try again.', 'error');
      }
    });
  }

  // initial load of average and reviews
  loadAverage(); loadReviews();
}

// Auth check
// Rendering is triggered by the page's own auth handler to avoid duplicate calls.

export { renderBusinessCards, renderBusinessDetails, businessData, renderStars, resolveAssetPath };

// Helper: render star characters for an average (rounded)
function renderStars(avg) {
  const rounded = Math.round(avg || 0);
  let s = '';
  for (let i = 0; i < 5; i++) {
    s += `<span class="star ${i < rounded ? 'filled' : 'empty'}" aria-hidden="true"></span>`;
  }
  return s;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}