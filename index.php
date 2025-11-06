<?php session_start(); ?>
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Coathli's Faith — Portal oficial</title>
  <meta name="description" content="Noticias, lore y comunidad del juego Coathli's Faith." />
  <link rel="preconnect" href="https://fonts.gstatic.com" />
  <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Inter:wght@400;600&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="portal_styles.css" />
</head>
<body>
  <header class="site-header">
    <div class="brand">
      <img src="assets/logo.svg" alt="Coathli's Faith" class="logo" />
      <h1>Coathli's Faith</h1>
    </div>
    <nav class="nav">
      <a href="#" data-section="home" class="active">Inicio</a>
      <a href="#" data-section="lore">Lore</a>
      <a href="#" data-section="media">Multimedia</a>
      <a href="#" data-section="community">Comunidad</a>
      <a href="#" data-section="store">Tienda</a>
      <!--  Enlaces dinámicos -->
      <?php if (!isset($_SESSION['usuario'])): ?>
        <a href="#" data-section="login">Iniciar sesión</a>
        <a href="#" data-section="register">Registrarse</a>
      <?php else: ?>
        <form action="logout.php" method="POST" style="display:inline;">
          <button type="submit" class="btn logout-btn">Cerrar sesión</button>
        </form>
      <?php endif; ?>
    </nav>
  </header>

  <main id="content">
    <!-- Sección de login -->
    <?php if (!isset($_SESSION['usuario'])): ?>
    <section id="login" class="section">
      <div class="login-box">
        <h2>Iniciar Sesión</h2>
        <form action="login.php" method="POST">
          <input type="text" name="username" placeholder="Usuario" required />
          <input type="password" name="password" placeholder="Contraseña" required />
          <button class="btn primary" type="submit">Entrar</button>
        </form>
      </div>
    </section>

    <!-- Sección de registro -->
    <section id="register" class="section">
      <div class="login-box">
        <h2>Registrarse</h2>
        <form action="register.php" method="POST">
          <input type="text" name="username" placeholder="Usuario" required />
          <input type="email" name="email" placeholder="Correo" required />
          <input type="password" name="password" placeholder="Contraseña" required />
          <button class="btn primary" type="submit">Crear cuenta</button>
        </form>
      </div>
    </section>
    <?php endif; ?>

    <!-- Sección de inicio -->
    <section id="home" class="section visible">
      <div class="hero">
        <div class="hero-text">
          <h2>No hay odio como el amor cristiano</h2>
          <p>Acompaña a Coatli en su travesía, descubriendo misterios de décadas, horrores que se pasean libremente entre los pasillos y  la manera de continuar aun en las situaciones más difíciles </p>
          <a class="btn primary" href="#news">Ver novedades</a>
        </div>
        <div class="hero-media">
      <video src="../novela1/videos/cinematica(1).mp4" controls></video>


        </div>
      </div>

      <!-- Botón de acceder al juego (solo si hay sesión) -->
    <?php if (isset($_SESSION["usuario"])) : ?>
    <div class="game-access">
     <h3>Bienvenido, <?php echo $_SESSION["usuario"]; ?></h3>
     <a href="../HTML/index.html" class="btn secondary">Acceder al juego</a>
      </div>
         <?php endif; ?>

      <!--  Noticias integradas justo debajo -->
      <div id="news" class="news-inline">
        <h2>Noticias</h2>
        <div class="news-grid">
          <article class="news-item">
           
            <h3> Avances </h3>
            <p>El capitulo 1 continua en desarrollo, con notables avances en el codigo y el ámbito artístico </p>
          </article>
          <article class="news-item">
            
            <h3>¿Quieres saber más?</h3>
            <p>Consigue contenido inédito de coatlis faith</p>
          </article>
        </div>
      </div>
    </section>

    <!-- Lore -->
    <section id="lore" class="section">
      <h2>Lore</h2>
      <div class="list" id="lore-list"></div>
    </section>

    <!-- Multimedia -->
    <section id="media" class="section">
      <h2>Multimedia</h2>
      <div class="media-grid">
        <img src="assets/concept-1.jpg" alt="Concept art 1" />
        <img src="assets/concept-2.jpg" alt="Concept art 2" />
        <audio controls src="assets/ost-track-1.mp3"></audio>
        <video controls src="assets/gameplay-1.mp4" poster="assets/gameplay.jpg"></video>
      </div>
    </section>

    <!-- Comunidad -->
    <section id="community" class="section">
      <h2>Comunidad</h2>
      <p>Comparte teorías, fanart y experiencias. Próximamente: foro integrado.</p>
      <div class="cta-row">
        <a class="btn outline" href="#" title="Discord">Entrar al Discord</a>
        <a class="btn outline" href="#" title="Encuestas">Votar en encuestas</a>
      </div>
    </section>

    <!-- Tienda -->
    <section id="store" class="section">
      <h2>Tienda</h2>
      <div class="store-grid">
        <div class="product">
          <img src="assets/shirt.jpg" alt="Playera Coathli" />
          <h4>Playera — Sello de Coathli</h4>
          <p>$349 MXN</p>
          <button class="btn primary">Agregar al ritual</button>
        </div>
        <div class="product">
          <img src="assets/poster.jpg" alt="Póster Coathli" />
          <h4>Póster — Santuario</h4>
          <p>$199 MXN</p>
          <button class="btn primary">Agregar al ritual</button>
        </div>
      </div>
    </section>
  </main>

  <footer class="site-footer">
    <div class="footer-grid">
      <div>
        <h5>Sobre el juego</h5>
        <p>Desarrollado por . Terror místico, decisiones con peso y un mundo que recuerda.</p>
      </div>
      <div>
        <h5>Legal</h5>
        <ul>
          <li><a href="#">Términos</a></li>
          <li><a href="#">Privacidad</a></li>
          <li><a href="#">Contacto</a></li>
        </ul>
      </div>
      <div>
        <h5>Síguenos</h5>
        <ul class="social">
          <li><a href="#">YouTube</a></li>
          <li><a href="#">X / Twitter</a></li>
          <li><a href="#">Instagram</a></li>
        </ul>
      </div>
    </div>
    <small>© 2025 Coathli's Faith</small>
  </footer>

<script src="portal_script.js"></script>
</body>
</html>