// js/firebase.js
// Central Firebase initialization used by other modules. This keeps
// the configuration and initialization in one place so other files
// can import `auth` and `database` without reinitializing.
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/12.7.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyA655hz1iZMa2Qmg5DZWpIiQ0Q9p9DkbtY",
  authDomain: "bytesizedbusinessboost-fbeb6.firebaseapp.com",
  projectId: "bytesizedbusinessboost-fbeb6",
  storageBucket: "bytesizedbusinessboost-fbeb6.firebasestorage.app",
  messagingSenderId: "1033680545380",
  appId: "1:1033680545380:web:f8a2c99a5ea22355bc6171",
  databaseURL: "https://bytesizedbusinessboost-fbeb6-default-rtdb.firebaseio.com"
};

const app = initializeApp(firebaseConfig);

// Initialize and export core Firebase services for reuse by other modules
export const auth = getAuth(app);
export const database = getDatabase(app);