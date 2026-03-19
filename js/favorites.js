// js/favorites.js
// Purpose: allow users to favorite/unfavorite businesses and render the
// favorites list for the current logged-in user. Uses the Realtime
// Database under `users/{uid}/favorites` to store per-user favorites.
import { getDatabase, ref, set, remove, get } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";
import { auth, usernameToKey } from "./auth.js";
import { businessData, renderStars, resolveAssetPath } from "./businesses.js";

const db = getDatabase();

// Toggle a single business as favorited/unfavorited for the current user.
export async function toggleFavorite(businessId) {
    const user = auth.currentUser;
    if (!user) return;

    // Derive the user's key (prefer username-derived key when available)
    const uname = user.displayName;
    const userKey = uname ? usernameToKey(uname) : user.uid;
    const favRef = ref(db, `users/${userKey}/favorites/${businessId}`);
    // Check current state and toggle accordingly
    const snapshot = await get(favRef);
    if (snapshot.exists()) {
        await remove(favRef);
    } else {
        await set(favRef, true);
    }
}

// Check whether the current user has favorited a given business.
export async function isFavorited(businessId) {
    const user = auth.currentUser;
    if (!user) return false;

    // Check the favorites path for presence
    const uname = user.displayName;
    const userKey = uname ? usernameToKey(uname) : user.uid;
    const favRef = ref(db, `users/${userKey}/favorites/${businessId}`);
    const snapshot = await get(favRef);
    return snapshot.exists();
}

// Render favorites once the user is logged in
// Render the user's favorites inside a container element. This function
// waits for the auth state, queries the user's favorites, and builds
// small business cards for each favorited item.
export function renderFavorites(containerId) {
    const container = document.getElementById(containerId);

    // Use modular onAuthStateChanged; prefer importing it if needed elsewhere.
    // `auth` here is the Firebase Auth instance; we rely on `user.displayName` to derive username keys.
    auth.onAuthStateChanged(async (user) => {
        if (!user) {
            container.innerHTML = "<p>Please log in to see your favorites.</p>";
            return;
        }

        container.innerHTML = "";

        const uname = user.displayName;
        const userKey = uname ? usernameToKey(uname) : user.uid;
        const favRef = ref(db, `users/${userKey}/favorites`);
        const favSnapshot = await get(favRef);

        if (!favSnapshot.exists()) {
            container.innerHTML = '<p class="empty-favorites-msg">No favorites yet.</p>';
            return;
        }

        const favs = favSnapshot.val();

        // reuse `businessData` from businesses.js to avoid duplication

        for (const businessId of Object.keys(favs)) {
            const business = businessData.find(b => b.id === businessId);
            if (!business) continue;

            // fetch average rating for this business (if available)
            let avg = null;
            try {
                const avgSnap = await get(ref(db, `businesses/${business.id}/averageRating`));
                if (avgSnap && avgSnap.exists()) avg = Number(avgSnap.val());
            } catch (e) {
                console.warn('Failed to load avg for', business.id, e);
            }

            const card = document.createElement("div");
            card.className = "business-card";

            card.innerHTML = `
                <div class="card-image">
                <img src="${resolveAssetPath(business.img)}" alt="${business.name}">
                </div>
                <div class="card-content">
                    <h3>${business.name}</h3>
                    <p>${business.description}</p>
                    <p><strong>Category:</strong> ${business.category}</p>
                    <div class="card-rating">Average Rating: <span class="avg-rating">${avg ? Number(avg).toFixed(1) : '—'}</span> <span class="avg-stars">${avg ? renderStars(avg) : ''}</span></div>
                    <div class="card-buttons">
                    <button class="view-business-btn">View Details</button>
                    <button class="unfavorite-btn">❤️ Unfavorite</button>
                    </div>
                </div>
            `;

            // Unfavorite button
            const unfavBtn = card.querySelector(".unfavorite-btn");
            unfavBtn.onclick = async () => {
                // Remove favorite in DB then remove the DOM card
                await toggleFavorite(businessId);
                card.remove(); // Remove card after Firebase updates
            };

            // View details button
            const viewBtn = card.querySelector(".view-business-btn");
            if (viewBtn) {
                viewBtn.onclick = () => {
                    // navigate to business detail page
                    window.location.href = `business.html?businessId=${businessId}`;
                };
            } 
            else {
                console.warn("viewBtn not found for", businessId);
            }

            container.appendChild(card);
        }
    });
}

// renderStars provided by businesses.js