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
  { id: "biz1", name: "The Peanut Gallery", latitude: "42.250452", longitude: "-87.839704", category: "Food", img: "assets/peanutgallery.png", description: "A casual, family-friendly spot in Lake Forest known for classic American comfort food, sandwiches, and a relaxed, welcoming atmosphere.", deals: ["50% off appetizers from 3–5 PM on weekdays","Burger & fries for $9.99 every Tuesday","Family meal for four for $29.99", "Free soft drink with any entree on weekends"]},
  { id: "biz2", name: "Sunset Foods", latitude: "42.251417", longitude: "-87.840779", category: "Food / Retail", img: "assets/sunset.png", description: "A neighborhood grocery store at Sunset Corners on Waukegan Rd, focused on high-quality products and standout customer service.", deals: ["Member discount: 15% off new releases"] },
  { id: "biz3", name: "Lake Forest Food & Wine", latitude: "42.2497", longitude: "-87.8404", category: "Food", img: "assets/lakeforestfoodandwine.jpeg", description: "A cozy, upscale eatery and wine bar featuring seasonal dishes, curated wines, and a relaxed yet refined atmosphere in downtown Lake Forest.", deals: ["$5 off any wine bottle on Mondays", "Happy hour small plates for $8 from 4–6 PM", "Free dessert with purchase of two entrees", "10% off total bill for students with ID on Thursdays"]},
  { id: "biz4", name: "Everett Farm",  latitude: "42.224888", longitude: "-87.873873", category: "Food", img: "assets/everett.avif", description: "A newer restaurant that opened at Forest Square in 2021, offering a farm-to-table dining experience in a relaxed, local setting.", deals: ["Free cookie with any loaf on Tuesdays"] },
  { id: "biz5", name: "Le Colonial Lake Forest",  latitude: "42.251911", longitude: "-87.841270", category: "Food", img: "assets/lecolonial.jpeg", description: "An upscale French-Vietnamese restaurant known for elegant ambiance and refined cuisine — a standout dining option in the Lake Forest area.", deals: ["10% off screen replacements"] },
  { id: "biz6", name: "Sushi Kushi Toyo",  latitude: "42.225208", longitude: "-87.872353", category: "Food", img: "assets/sushikushi.avif", description: "A Japanese restaurant located at Sunset Corners, offering sushi and other Japanese dishes in a casual, community-friendly setting.", deals: ["Student discount 15% on weekdays"] },
  { id: "biz7", name: "Hollywood Feed",  latitude: "42.250998", longitude: "-87.841486", category: "Retail", img: "assets/hollywoodfeed.jpeg", description: "A pet supply store open since 2019, offering personalized nutrition advice, same-day pet food delivery, and self-serve dog wash stations. Returns are donated to local animal rescues.", deals: ["Student discount 15% on weekdays"] },
  { id: "biz8", name: "OriMay Salon",  latitude: "42.251388428864935", longitude: "-87.84030619969522", category: "Services", img: "assets/orimaylogo.jpg", description: "A boutique hair salon in the Lake Forest Arcade, owned by Paola Lago, who brings over 20 years of experience from high-end salons and spas.", deals: ["Student discount 15% on weekdays"] },
  { id: "biz9", name: "Scout Driver Driving School", latitude: "42.251212", longitude: "-87.8411133", category: "Services", img: "assets/scoutdriver.png", description: "A locally owned driving school at 246 E. Deerpath founded in 2023, offering teen and adult programs that meet all Illinois requirements, with flexible scheduling.", deals: ["Student discount 15% on weekdays"] },
  { id: "biz10", name: "True Value (Sunset Corners)", latitude: "42.22508349157069", longitude: "-87.87212690701608", category: "Retail", img: "assets/truevalue.jpeg", description: "A hardware and home goods store located in the Sunset Corners shopping area, serving Lake Forest residents with tools, supplies, and home improvement products.", deals: ["Student discount 15% on weekdays"] },
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

  // read filter/sort/search controls if present
  const categorySelect = document.getElementById('categoryFilter');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('businessSearch');

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

  // prepare the list, apply search, category filter and sort if controls are present
  let list = instances.slice();
  const searchQuery = searchInput ? searchInput.value.trim().toLowerCase() : '';
  if (searchQuery) {
    list = list.filter(b => b.name.toLowerCase().includes(searchQuery));
  }
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
  if (searchInput) searchInput.oninput = () => renderBusinessCards();
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

      <div class="business-map">
        <gmp-map
          center="${business.latitude},${business.longitude}"
          zoom="16"
          map-id="DEMO_MAP_ID"
          style="height: 500px">
          <gmp-advanced-marker position="${business.latitude},${business.longitude}"></gmp-advanced-marker>
        </gmp-map>
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