// ============================================================
// FAQ Data — questions grouped by category
// ============================================================
const faqData = [
  // ── Reports ─────────────────────────────────────────────
  {
    category: "reports",
    label: "How Reports Work",
    question: "What is the Custom Report feature?",
    answer:
      "The Custom Report feature lets you build a personalized PDF containing business summaries, ratings, and charts based on your selections. Access it from \"Custom Report\" in the top navigation bar.",
  },
  {
    category: "reports",
    label: "How Reports Work",
    question: "What gets included in a report?",
    answer:
      "Your report can include business details, star ratings, trend charts comparing categories, and your favorited businesses. You choose which elements to add before generating.",
  },
  {
    category: "reports",
    label: "How Reports Work",
    question: "How do I generate a PDF?",
    answer:
      "Go to the Custom Report page, select the graphs and businesses you want included, then click \"Generate PDF.\" The file downloads directly to your device.",
  },
  {
    category: "reports",
    label: "How Reports Work",
    question: "Can I add charts to my report?",
    answer:
      "Yes! Visual charts comparing ratings and business categories are available. Select the chart types you want from the Custom Report page before generating.",
  },
  {
    category: "reports",
    label: "How Reports Work",
    question: "Is my report saved on Local Lift's servers?",
    answer:
      "No — reports are generated on demand and downloaded as a PDF. They are not stored on our servers, so make sure to save your file after downloading.",
  },

  // ── Authentication ───────────────────────────────────────
  {
    category: "auth",
    label: "Account & Sign-In",
    question: "How do I create an account?",
    answer:
      "Click \"Sign Up\" on the login page and fill in your name, email, and password. After submitting you'll be taken straight into the app.",
  },
  {
    category: "auth",
    label: "Account & Sign-In",
    question: "I forgot my password — what do I do?",
    answer:
      "Contact support at akhil.peddhapati@gmail.com and we'll help you reset it. A self-service reset flow is planned for a future update.",
  },
  {
    category: "auth",
    label: "Account & Sign-In",
    question: "How do I log out?",
    answer:
      "Just click the log out on the top right.",
  },
  {
    category: "auth",
    label: "Account & Sign-In",
    question: "Is my account information secure?",
    answer:
      "Yes. Passwords are securely hashed and your account is managed through Firebase Authentication, which follows industry-standard security practices.",
  },
  {
    category: "auth",
    label: "Account & Sign-In",
    question: "Can I edit my profile?",
    answer:
      "No - There is no display name so there is nothing to be edited",
  },

  // ── Business listings ────────────────────────────────────
  {
    category: "business",
    label: "Exploring Businesses",
    question: "How do I find local businesses?",
    answer:
      "Browse the Home page to see all listed businesses. Use the search bar and category filter to narrow results by name or type, and the sort control to order by rating.",
  },
  {
    category: "business",
    label: "Exploring Businesses",
    question: "How do I view full business details?",
    answer:
      "Click \"View\" on any business card to open its detail page, which includes a description, address, average rating, customer reviews, and an interactive map.",
  },
  {
    category: "business",
    label: "Exploring Businesses",
    question: "How do I leave a review?",
    answer:
      "Open a business's detail page, scroll to the review section, choose a star rating, add an optional comment, then click \"Submit.\" You must be signed in to post a review.",
  },
  {
    category: "business",
    label: "Exploring Businesses",
    question: "What does the favorite button do?",
    answer:
      "Clicking the favorite button on a business card saves it to your personal Favorites list, accessible from the Favorites page in the navbar.",
  },
  {
    category: "business",
    label: "Exploring Businesses",
    question: "Can guests browse without an account?",
    answer:
      "Yes! Guests can browse and view business listings without logging in. Leaving reviews, saving favorites, and generating reports all require a signed-in account.",
  },
];

// ============================================================
// Unique categories in order
// ============================================================
const categories = [
  { id: "reports",  label: "How Reports Work" },
  { id: "auth",     label: "Account & Sign-In" },
  { id: "business", label: "Exploring Businesses" },
];

// ============================================================
// Render helpers
// ============================================================
function renderCategories(container) {
  container.innerHTML = `
    <p class="faq-subtitle">Choose a category</p>
    <div class="faq-category-buttons">
      ${categories
        .map(
          (c) =>
            `<button class="faq-cat-btn" data-cat="${c.id}">${c.label}</button>`
        )
        .join("")}
    </div>
  `;

  container.querySelectorAll(".faq-cat-btn").forEach((btn) => {
    btn.addEventListener("click", () =>
      renderQuestions(container, btn.dataset.cat)
    );
  });
}

function renderQuestions(container, catId) {
  const cat = categories.find((c) => c.id === catId);
  const questions = faqData.filter((q) => q.category === catId);

  container.innerHTML = `
    <button class="faq-back-btn" id="faqBack">&#8592; Back</button>
    <p class="faq-subtitle">${cat.label}</p>
    <ul class="faq-question-list">
      ${questions
        .map(
          (q, i) =>
            `<li class="faq-question-item" data-index="${i}" data-cat="${catId}">${q.question}</li>`
        )
        .join("")}
    </ul>
  `;

  document
    .getElementById("faqBack")
    .addEventListener("click", () => renderCategories(container));

  container.querySelectorAll(".faq-question-item").forEach((item) => {
    item.addEventListener("click", () => {
      const idx = parseInt(item.dataset.index);
      const questionObj = questions[idx];
      renderAnswer(container, catId, questionObj);
    });
  });
}

function renderAnswer(container, catId, questionObj) {
  container.innerHTML = `
    <button class="faq-back-btn" id="faqBack">&#8592; Back</button>
    <div class="faq-answer-box">
      <p class="faq-answer-question">${questionObj.question}</p>
      <p class="faq-answer-text">${questionObj.answer}</p>
    </div>
  `;

  document
    .getElementById("faqBack")
    .addEventListener("click", () => renderQuestions(container, catId));
}

// ============================================================
// Mount
// ============================================================
function mountFaq(targetId) {
  const target = document.getElementById(targetId);
  if (!target) return;

  target.innerHTML = `
    <div class="faq-box">
      <h2 class="faq-heading">Have any questions?</h2>
      <div class="faq-body"></div>
    </div>
  `;

  const body = target.querySelector(".faq-body");
  renderCategories(body);
}

document.addEventListener("DOMContentLoaded", () => mountFaq("faq-section"));
