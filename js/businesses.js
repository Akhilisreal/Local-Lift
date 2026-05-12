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
  {
    id: "biz1",
    name: "Toluca's Restaurant",
    nameEs: "Restaurante Toluca's",
    latitude: "42.3639",
    longitude: "-87.8705",
    category: "Food",
    img: "assets/tolucas.jpg",
    description: "An authentic Mexican restaurant at 1419 Washington St serving traditional tacos, tortas, and regional Mexican dishes in a cozy, family-friendly setting in the heart of Waukegan.",
    descriptionEs: "Un restaurante mexicano auténtico en 1419 Washington St que sirve tacos tradicionales, tortas y platillos regionales en un ambiente acogedor y familiar en el corazón de Waukegan.",
    deals: ["10% off on Tuesdays", "Family combo special on weekends", "Free salsa with any entrée"]
  },
  {
    id: "biz2",
    name: "Los Compadres de Waukegan",
    nameEs: "Los Compadres de Waukegan",
    latitude: "42.3592",
    longitude: "-87.8707",
    category: "Food",
    img: "assets/loscompadres.jpg",
    description: "A vibrant Mexican eatery at 1614 Washington St known for antojitos, tacos, and homemade salsas, open late on weekends with a festive, community-centered atmosphere.",
    descriptionEs: "Un animado restaurante mexicano en 1614 Washington St conocido por sus antojitos, tacos y salsas caseras, abierto hasta tarde los fines de semana con un ambiente festivo y comunitario.",
    deals: ["Happy hour Monday–Friday 4–6 PM", "Free agua fresca with any combo meal", "Weekend birria special"]
  },
  {
    id: "biz3",
    name: "La Mexicanita",
    nameEs: "La Mexicanita",
    latitude: "42.3974",
    longitude: "-87.8775",
    category: "Food",
    img: "assets/lamexicanita.jpg",
    description: "A neighborhood Mexican restaurant at 1818 W Yorkhouse Rd offering authentic homestyle cooking including enchiladas, tamales, and fresh-made tortillas in a welcoming local setting.",
    descriptionEs: "Un restaurante mexicano de barrio en 1818 W Yorkhouse Rd que ofrece cocina casera auténtica, incluyendo enchiladas, tamales y tortillas recién hechas en un ambiente local y acogedor.",
    deals: ["Lunch special $8.99 Mon–Fri", "Kids eat free on Sundays", "Tamales by the dozen on weekends"]
  },
  {
    id: "biz4",
    name: "Cemitas Frida",
    nameEs: "Cemitas Frida",
    latitude: "42.3633",
    longitude: "-87.8712",
    category: "Food",
    img: "assets/cemitasfrida.jpg",
    description: "A beloved Waukegan spot at 1409 Washington St specializing in cemitas — overstuffed Puebla-style sandwiches — alongside traditional Mexican street food and refreshing aguas frescas.",
    descriptionEs: "Un querido lugar en Waukegan en 1409 Washington St especializado en cemitas — sándwiches al estilo Puebla — junto con antojitos mexicanos tradicionales y refrescantes aguas frescas.",
    deals: ["Combo: cemita + agua fresca for $10", "Free chips & salsa on Saturdays", "Student discount 10% with ID"]
  },
  {
    id: "biz5",
    name: "El Sabrocito",
    nameEs: "El Sabrocito",
    latitude: "42.3849",
    longitude: "-87.8821",
    category: "Food",
    img: "assets/elsabrocito.jpg",
    description: "A family-owned Mexican restaurant at 2941 Sunset Ave serving hearty traditional plates, handmade salsas, and a warm, inviting atmosphere perfect for the whole family.",
    descriptionEs: "Un restaurante mexicano familiar en 2941 Sunset Ave que sirve generosos platillos tradicionales, salsas artesanales y un ambiente cálido y acogedor perfecto para toda la familia.",
    deals: ["10% off for groups of 6+", "Daily lunch specials from $7.99", "Free dessert on birthdays"]
  },
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
            nameEs: b.nameEs || '',
            category: b.category,
            img: b.img,
            description: b.description,
            descriptionEs: b.descriptionEs || '',
            deals: b.deals || [],
            averageRating: 0,
            reviewCount: 0
          });
        } else {
          // if already present, only add missing fields or sync changed ones
          const val = snap.val();
          const updates = {};
          if (val.name !== b.name) updates.name = b.name;
          if (val.nameEs !== b.nameEs) updates.nameEs = b.nameEs || '';
          if (val.category !== b.category) updates.category = b.category;
          if (val.img !== b.img) updates.img = b.img;
          if (val.description !== b.description) updates.description = b.description;
          if (val.descriptionEs !== b.descriptionEs) updates.descriptionEs = b.descriptionEs || '';
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
        <h3>${this.name}${this.nameEs && this.nameEs !== this.name ? `<br><small class="name-es">${this.nameEs}</small>` : ''}</h3>
        <p>${this.description}</p>
        ${this.descriptionEs ? `<p class="description-es"><em>${this.descriptionEs}</em></p>` : ''}
        <p><strong>Categoría:</strong> ${this.category}</p>
        <div class="card-rating">Calificación Promedio: <span class="avg-rating">${this._avgRating ? Number(this._avgRating).toFixed(1) : '—'}</span> <span class="avg-stars">${this._avgRating ? renderStars(this._avgRating) : ''}</span></div>
        <div class="card-buttons">
          <button class="view-business-btn">Ver Detalles</button>
          <button class="favorite-btn">❤️ Favorito</button>
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
    categorySelect.innerHTML = `<option value="all">Todas</option>` + cats.map(c => `<option value="${c}">${c}</option>`).join('');
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
      favBtn.textContent = favorited ? '💔 Quitar Favorito' : '❤️ Favorito';
    })();

    favBtn.onclick = async () => {
      await toggleFavorite(inst.id);
      favBtn.textContent = (await isFavorited(inst.id)) ? '💔 Quitar Favorito' : '❤️ Favorito';
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
  if (!businessId) { businessDetailsContainer.innerHTML = '<p>No se seleccionó ningún negocio.</p>'; return; }

  const data = businessData.find(b => b.id === businessId);
  if (!data) { businessDetailsContainer.innerHTML = '<p>Negocio no encontrado.</p>'; return; }

  // ensure DB seed exists and create an instance for rendering
  await Business.ensureAllSeeded();
  const business = new Business(data);

  // build the details UI (static HTML portion)
  businessDetailsContainer.innerHTML = `
    <div class="business-details-card">
      <div class="business-header">
        <img src="${resolveAssetPath(business.img)}" alt="${business.name}">
        <div class="business-details-content">
          <h2>${business.name}${business.nameEs && business.nameEs !== business.name ? `<br><small class="name-es">${business.nameEs}</small>` : ''}</h2>
          <p>${business.description}</p>
          ${business.descriptionEs ? `<p class="description-es"><em>${business.descriptionEs}</em></p>` : ''}
          <p><strong>Categoría:</strong> ${business.category}</p>
          ${Array.isArray(business.deals) && business.deals.length ? `
            <div class="business-deals"><h3>Ofertas</h3><ul class="deals-list">${business.deals.map(d=>`<li>${escapeHtml(d)}</li>`).join('')}</ul></div>` : ''}
          <div id="avgRating">Promedio: <span class="avg-rating">—</span> <span class="avg-stars"></span></div>
          <button id="favBtn">❤️ Favorito</button>
        </div>
      </div>

      <div class="business-reviews">
        <section id="reviewsSection">
          <h3>Reseñas</h3>
          <div id="reviewsList">Cargando reseñas...</div>
          <form id="reviewForm">
            <label for="reviewRating">Calificación:</label>
            <select id="reviewRating"><option value="5">5</option><option value="4">4</option><option value="3">3</option><option value="2">2</option><option value="1">1</option></select>
            <label for="reviewText">Reseña:</label>
            <textarea id="reviewText" rows="4" placeholder="Escribe tu reseña..."></textarea>
            <button type="submit">Enviar Reseña</button>
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
  favBtn.textContent = (await isFavorited(businessId)) ? '💔 Quitar Favorito' : '❤️ Favorito';
  favBtn.onclick = async () => { await toggleFavorite(businessId); favBtn.textContent = (await isFavorited(businessId)) ? '💔 Quitar Favorito' : '❤️ Favorito'; };

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
        reviewsList.innerHTML = '<p>Aún no hay reseñas. ¡Sé el primero!</p>';
      }
    } catch (e) {
      console.error('Error loading reviews', e);
    }
  }

  // normalize reviewer name for display
  function formatReviewerName(name) {
    if (!name) return 'Anónimo';
    const s = String(name).trim(); if (!s) return 'Anónimo';
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
      const name = user?.displayName || user?.email || 'Anónimo';
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
        showAlert('Error al enviar la reseña. Inténtalo de nuevo.', 'error');
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