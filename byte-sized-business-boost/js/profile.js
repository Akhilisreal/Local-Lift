// js/profile.js
// Purpose: populate the profile page with the current user's information.
// This is a very small helper that reads `auth.currentUser` and writes
// a display name and email into the DOM if those elements exist.
import { auth } from './auth.js';

// Simple profile population: write displayName and email into DOM
const profileName = document.getElementById('profileName');
const profileEmail = document.getElementById('profileEmail');
if (auth.currentUser) {
  // only set when the elements exist on the page
  if (profileName) profileName.textContent = auth.currentUser.displayName || 'No Name';
  if (profileEmail) profileEmail.textContent = auth.currentUser.email || '';
}