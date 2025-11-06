// Navegación básica entre secciones
const navLinks = document.querySelectorAll('.nav a');
const sections = document.querySelectorAll('.section');

navLinks.forEach(link => {
  link.addEventListener('click', (e) => {
    e.preventDefault();
    const target = link.getAttribute('data-section');

    // Ocultar todas las secciones
    sections.forEach(s => s.classList.remove('visible'));

    // Mostrar la sección seleccionada
    const activeSection = document.getElementById(target);
    if (activeSection) activeSection.classList.add('visible');

    // Si es "home", también mostrar el bloque de destacados
    const destacados = document.getElementById('destacados');
    if (target === 'home' && destacados) {
      destacados.style.display = 'block';
    } else if (destacados) {
      destacados.style.display = 'none';
    }

    // Actualizar navegación
    navLinks.forEach(l => l.classList.remove('active'));
    link.classList.add('active');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
});

// Render de posts desde JSON
async function loadPosts() {
  try {
    const res = await fetch('data/posts.json');
    const posts = await res.json();

    // destacados para portada
    const featured = posts.find(p => p.featured);
    const others = posts.filter(p => !p.featured).slice(0, 2);

    renderCard('featured-post', featured);
    renderCard('home-post-1', others[0]);
    renderCard('home-post-2', others[1]);

    // noticias
    const news = posts.filter(p => p.category === 'Noticias');
    renderList('news-list', news);

    // lore
    const lore = posts.filter(p => p.category === 'Lore');
    renderList('lore-list', lore);

  } catch (err) {
    console.error('Error cargando posts', err);
  }
}

function renderCard(elId, post) {
  const el = document.getElementById(elId);
  if (!post || !el) return;
  el.innerHTML = `
    <img src="${post.cover}" alt="${post.title}" />
    <h3>${post.title}</h3>
    <div class="meta">${post.date} • ${post.category}</div>
    <p>${post.excerpt}</p>
    <a class="btn outline" href="post.html?p=${post.slug}">Leer más</a>
  `;
}

function renderList(elId, posts) {
  const el = document.getElementById(elId);
  el.innerHTML = posts.map(p => `
    <article class="card">
      <img src="${p.cover}" alt="${p.title}" />
      <h3>${p.title}</h3>
      <div class="meta">${p.date} • ${p.category}</div>
      <p>${p.excerpt}</p>
      <a class="btn outline" href="post.html?p=${p.slug}">Leer más</a>
    </article>
  `).join('');
}

// Newsletter (dummy)
const form = document.getElementById('newsletter-form');
if (form) {
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    alert('Gracias por suscribirte. Pronto habrá rituales y noticias.');
    form.reset();
  });
}

loadPosts();

// Animaciones al hacer scroll
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('animate-fadeUp');
      observer.unobserve(entry.target); // solo una vez
    }
  });
}, { threshold: 0.2 });

document.querySelectorAll('.card, .hero, .newsletter, .product').forEach(el => {
  observer.observe(el);
});