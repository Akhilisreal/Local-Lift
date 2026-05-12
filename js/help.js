// ============================================================
// FAQ Data — questions grouped by category
// ============================================================
const faqData = [
  // ── Reports ─────────────────────────────────────────────
  {
    category: "reports",
    label: "Cómo Funcionan los Reportes",
    question: "¿Qué es la función de Reporte Personalizado?",
    answer:
      "La función de Reporte Personalizado te permite crear un PDF personalizado con resúmenes de negocios, calificaciones y gráficas según tus selecciones. Accede desde \"Reporte Personalizado\" en la barra de navegación superior.",
  },
  {
    category: "reports",
    label: "Cómo Funcionan los Reportes",
    question: "¿Qué se incluye en un reporte?",
    answer:
      "Tu reporte puede incluir detalles de negocios, calificaciones con estrellas, gráficas de tendencias por categoría y tus negocios favoritos. Tú decides qué elementos agregar antes de generar el reporte.",
  },
  {
    category: "reports",
    label: "Cómo Funcionan los Reportes",
    question: "¿Cómo genero un PDF?",
    answer:
      "Ve a la página de Reporte Personalizado, selecciona las gráficas y negocios que deseas incluir, luego haz clic en \"Descargar Reporte PDF\". El archivo se descarga directamente en tu dispositivo.",
  },
  {
    category: "reports",
    label: "Cómo Funcionan los Reportes",
    question: "¿Puedo agregar gráficas a mi reporte?",
    answer:
      "¡Sí! Hay gráficas visuales que comparan calificaciones y categorías de negocios. Selecciona los tipos de gráfica que deseas desde la página de Reporte Personalizado antes de generar.",
  },
  {
    category: "reports",
    label: "Cómo Funcionan los Reportes",
    question: "¿Mi reporte se guarda en los servidores de Local Lift?",
    answer:
      "No — los reportes se generan bajo demanda y se descargan como PDF. No se almacenan en nuestros servidores, así que asegúrate de guardar tu archivo después de descargarlo.",
  },

  // ── Authentication ───────────────────────────────────────
  {
    category: "auth",
    label: "Cuenta e Inicio de Sesión",
    question: "¿Cómo creo una cuenta?",
    answer:
      "Haz clic en \"Registrarse\" en la página de inicio de sesión y completa tu nombre, correo y contraseña. Después de enviar, serás llevado directamente a la aplicación.",
  },
  {
    category: "auth",
    label: "Cuenta e Inicio de Sesión",
    question: "Olvidé mi contraseña — ¿qué hago?",
    answer:
      "Contacta al soporte en akhil.peddhapati@gmail.com y te ayudaremos a restablecerla. Está planeada una función de restablecimiento automático para una actualización futura.",
  },
  {
    category: "auth",
    label: "Cuenta e Inicio de Sesión",
    question: "¿Cómo cierro sesión?",
    answer:
      "Haz clic en el botón \"Cerrar Sesión\" en la parte superior derecha.",
  },
  {
    category: "auth",
    label: "Cuenta e Inicio de Sesión",
    question: "¿Es segura mi información de cuenta?",
    answer:
      "Sí. Las contraseñas se almacenan de forma segura mediante hash y tu cuenta es gestionada por Firebase Authentication, que sigue prácticas de seguridad estándar de la industria.",
  },
  {
    category: "auth",
    label: "Cuenta e Inicio de Sesión",
    question: "¿Puedo editar mi perfil?",
    answer:
      "No - No hay nombre de usuario que editar en este momento.",
  },

  // ── Business listings ────────────────────────────────────
  {
    category: "business",
    label: "Explorar Negocios",
    question: "¿Cómo encuentro negocios locales?",
    answer:
      "Explora la página de Inicio para ver todos los negocios listados. Usa la barra de búsqueda y el filtro de categoría para acotar resultados por nombre o tipo, y el control de ordenamiento para ordenar por calificación.",
  },
  {
    category: "business",
    label: "Explorar Negocios",
    question: "¿Cómo veo los detalles completos de un negocio?",
    answer:
      "Haz clic en \"Ver Detalles\" en cualquier tarjeta de negocio para abrir su página de detalles, que incluye descripción, dirección, calificación promedio, reseñas de clientes y un mapa interactivo.",
  },
  {
    category: "business",
    label: "Explorar Negocios",
    question: "¿Cómo dejo una reseña?",
    answer:
      "Abre la página de detalles de un negocio, desplázate a la sección de reseñas, elige una calificación con estrellas, agrega un comentario opcional y haz clic en \"Enviar\". Debes haber iniciado sesión para publicar una reseña.",
  },
  {
    category: "business",
    label: "Explorar Negocios",
    question: "¿Qué hace el botón de favorito?",
    answer:
      "Hacer clic en el botón de favorito en una tarjeta de negocio lo guarda en tu lista personal de Favoritos, accesible desde la página de Favoritos en la barra de navegación.",
  },
  {
    category: "business",
    label: "Explorar Negocios",
    question: "¿Pueden los invitados explorar sin cuenta?",
    answer:
      "¡Sí! Los invitados pueden explorar y ver los listados de negocios sin iniciar sesión. Dejar reseñas, guardar favoritos y generar reportes requieren una cuenta con sesión iniciada.",
  },
];

// ============================================================
// Unique categories in order
// ============================================================
const categories = [
  { id: "reports",  label: "Cómo Funcionan los Reportes" },
  { id: "auth",     label: "Cuenta e Inicio de Sesión" },
  { id: "business", label: "Explorar Negocios" },
];

// ============================================================
// Render helpers
// ============================================================
function renderCategories(container) {
  container.innerHTML = `
    <p class="faq-subtitle">Elige una categoría</p>
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
    <button class="faq-back-btn" id="faqBack">&#8592; Volver</button>
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
    <button class="faq-back-btn" id="faqBack">&#8592; Volver</button>
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
      <h2 class="faq-heading">¿Tienes alguna pregunta?</h2>
      <div class="faq-body"></div>
    </div>
  `;

  const body = target.querySelector(".faq-body");
  renderCategories(body);
}

document.addEventListener("DOMContentLoaded", () => mountFaq("faq-section"));
