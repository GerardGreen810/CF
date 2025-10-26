-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Servidor: 127.0.0.1
-- Tiempo de generación: 22-10-2025 a las 14:56:44
-- Versión del servidor: 10.4.32-MariaDB
-- Versión de PHP: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Base de datos: `coatlis_faith`
--

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `assets`
--

CREATE TABLE `assets` (
  `id` int(10) UNSIGNED NOT NULL,
  `type` varchar(40) NOT NULL,
  `path` varchar(255) NOT NULL,
  `name` varchar(150) DEFAULT NULL,
  `meta` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `assets`
--

INSERT INTO `assets` (`id`, `type`, `path`, `name`, `meta`, `created_at`) VALUES
(1, 'background', 'img/escena1.png', 'bg_escena1', '{}', '2025-10-14 23:03:09'),
(2, 'background', 'img/escena2.png', 'bg_escena2', '{}', '2025-10-14 23:03:09'),
(3, 'background', 'img/escena4.png', 'escena4_dup', '{}', '2025-10-14 23:03:09'),
(4, 'video', 'videos/cinematica-inicio.mp4', 'cinematica_inicio', '{\"loop\":false}', '2025-10-14 23:03:09'),
(5, 'music', 'musica/Theme of Laura.mp3', 'theme_of_laura', '{\"loop\":true,\"volume\":0.6}', '2025-10-14 23:03:09'),
(6, 'background', 'img/escena3_slide1.png', 'escena3_slide1', '{}', '2025-10-14 23:03:09'),
(7, 'background', 'img/escena3_slide2.png', 'escena3_slide2', '{}', '2025-10-14 23:03:09'),
(8, 'background', 'img/escena3_slide3.png', 'escena3_slide3', '{}', '2025-10-14 23:03:09'),
(9, 'background', 'img/escena5_slide1.png', 'escena5_slide1', '{}', '2025-10-14 23:03:09'),
(10, 'background', 'img/escena5_slide2.png', 'escena5_slide2', '{}', '2025-10-14 23:03:09'),
(11, 'background', 'img/escena5_slide3.png', 'escena5_slide3', '{}', '2025-10-14 23:03:09'),
(12, 'background', 'img/escena5_slide4.png', 'escena5_slide4', '{}', '2025-10-14 23:03:09'),
(13, 'background', 'img/escena5_slide5.png', 'escena5_slide5', '{}', '2025-10-14 23:03:09'),
(14, 'background', 'img/escena5_slide6.png', 'escena5_slide6', '{}', '2025-10-14 23:03:09'),
(15, 'background', 'img/escena5_slide7.png', 'escena5_slide7', '{}', '2025-10-14 23:03:09'),
(16, 'background', 'img/escena5_slide8.png', 'escena5_slide8', '{}', '2025-10-14 23:03:09'),
(17, 'background', 'img/escena5_slide9.png', 'escena5_slide9', '{}', '2025-10-14 23:03:09'),
(18, 'background', 'img/escena6.png', 'bg_escena6', '{}', '2025-10-14 23:03:09'),
(1001, 'sfx', 'sfx/puertaAbiertaSFX.mp3', 'puerta_abierta', '{\"volume\":1.0}', '2025-10-15 11:07:48'),
(1002, 'sfx', 'sfx/puertaCerradaSFX.mp3', 'puerta_cerrada', '{\"volume\":1.0}', '2025-10-15 11:07:48'),
(1003, 'sfx', 'sfx/pasosSFX.mp3', 'pasos_sfx', '{\"volume\":0.4, \"loop\": false}', '2025-10-15 11:07:48'),
(1008, 'sfx', 'sfx/pasosAcercandoSFX.mp3', 'pasos_acercando', '{\"volume\":0.9}', '2025-10-15 11:54:02'),
(1009, 'sfx', 'sfx/portonAbiertoSFX.mp3', 'porton_abierto', '{\"volume\":0.9}', '2025-10-15 11:54:02'),
(1010, 'sfx', 'sfx/pasosAlejandoSFX.mp3', 'pasos_alejando', '{\"volume\":0.9}', '2025-10-15 11:54:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `assets_backup`
--

CREATE TABLE `assets_backup` (
  `id` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `type` varchar(40) NOT NULL,
  `path` varchar(255) NOT NULL,
  `name` varchar(150) DEFAULT NULL,
  `meta` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `assets_backup`
--

INSERT INTO `assets_backup` (`id`, `type`, `path`, `name`, `meta`, `created_at`) VALUES
(1, 'background', 'img/escena1.png', 'bg_escena1', '{}', '2025-10-14 23:03:09'),
(2, 'background', 'img/escena2.png', 'bg_escena2', '{}', '2025-10-14 23:03:09'),
(3, 'background', 'img/escena4.png', 'escena4_dup', '{}', '2025-10-14 23:03:09'),
(4, 'video', 'videos/cinematica-inicio.mp4', 'cinematica_inicio', '{\"loop\":false}', '2025-10-14 23:03:09'),
(5, 'music', 'musica/Theme of Laura.mp3', 'theme_of_laura', '{\"loop\":true,\"volume\":0.6}', '2025-10-14 23:03:09'),
(6, 'background', 'img/escena3_slide1.png', 'escena3_slide1', '{}', '2025-10-14 23:03:09'),
(7, 'background', 'img/escena3_slide2.png', 'escena3_slide2', '{}', '2025-10-14 23:03:09'),
(8, 'background', 'img/escena3_slide3.png', 'escena3_slide3', '{}', '2025-10-14 23:03:09'),
(9, 'background', 'img/escena5_slide1.png', 'escena5_slide1', '{}', '2025-10-14 23:03:09'),
(10, 'background', 'img/escena5_slide2.png', 'escena5_slide2', '{}', '2025-10-14 23:03:09'),
(11, 'background', 'img/escena5_slide3.png', 'escena5_slide3', '{}', '2025-10-14 23:03:09'),
(12, 'background', 'img/escena5_slide4.png', 'escena5_slide4', '{}', '2025-10-14 23:03:09'),
(13, 'background', 'img/escena5_slide5.png', 'escena5_slide5', '{}', '2025-10-14 23:03:09'),
(14, 'background', 'img/escena5_slide6.png', 'escena5_slide6', '{}', '2025-10-14 23:03:09'),
(15, 'background', 'img/escena5_slide7.png', 'escena5_slide7', '{}', '2025-10-14 23:03:09'),
(16, 'background', 'img/escena5_slide8.png', 'escena5_slide8', '{}', '2025-10-14 23:03:09'),
(17, 'background', 'img/escena5_slide9.png', 'escena5_slide9', '{}', '2025-10-14 23:03:09'),
(18, 'background', 'img/escena6.png', 'bg_escena6', '{}', '2025-10-14 23:03:09'),
(1001, 'sfx', 'sfx/puertaAbiertaSFX.mp3', 'puerta_abierta', '{\"volume\":1.0}', '2025-10-15 11:07:48'),
(1002, 'sfx', 'sfx/puertaCerradaSFX.mp3', 'puerta_cerrada', '{\"volume\":1.0}', '2025-10-15 11:07:48'),
(1003, 'sfx', 'sfx/pasosSFX.mp3', 'pasos_sfx', '{\"volume\":0.4, \"loop\": false}', '2025-10-15 11:07:48'),
(1008, 'sfx', 'sfx/pasosAcercandoSFX.mp3', 'pasos_acercando', '{\"volume\":0.9}', '2025-10-15 11:54:02'),
(1009, 'sfx', 'sfx/portonAbiertoSFX.mp3', 'porton_abierto', '{\"volume\":0.9}', '2025-10-15 11:54:02'),
(1010, 'sfx', 'sfx/pasosAlejandoSFX.mp3', 'pasos_alejando', '{\"volume\":0.9}', '2025-10-15 11:54:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `events`
--

CREATE TABLE `events` (
  `id` int(10) UNSIGNED NOT NULL,
  `scene_id` int(10) UNSIGNED NOT NULL,
  `trigger_type` varchar(60) NOT NULL,
  `trigger_signal` varchar(160) DEFAULT NULL,
  `conditions` text DEFAULT NULL,
  `actions` text DEFAULT NULL,
  `active` tinyint(1) NOT NULL DEFAULT 1,
  `ordering` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `saves`
--

CREATE TABLE `saves` (
  `id` int(10) UNSIGNED NOT NULL,
  `user_id` int(10) UNSIGNED NOT NULL,
  `scene_id` int(11) DEFAULT NULL,
  `state_json` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `saves`
--

INSERT INTO `saves` (`id`, `user_id`, `scene_id`, `state_json`, `created_at`, `updated_at`) VALUES
(11, 1, 4, '{\"scene_slug\":\"scene_4\",\"scene_index\":3,\"scene_id\":4,\"saved_at\":\"2025-10-22T12:37:01.998Z\"}', '2025-10-21 12:31:38', '2025-10-22 12:37:05');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `scenes`
--

CREATE TABLE `scenes` (
  `id` int(10) UNSIGNED NOT NULL,
  `slug` varchar(120) NOT NULL,
  `title` varchar(150) DEFAULT NULL,
  `description` text DEFAULT NULL,
  `format` varchar(40) NOT NULL DEFAULT 'side_scroll',
  `meta` text DEFAULT NULL,
  `ordering` int(11) DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `scenes`
--

INSERT INTO `scenes` (`id`, `slug`, `title`, `description`, `format`, `meta`, `ordering`, `created_at`) VALUES
(1, 'scene_1', 'Escena 1', 'Interior - escena 1', 'side_scroll', '{\"dialog_on_load\":\"intro_scene_1\"}', 1, '2025-10-14 23:03:09'),
(2, 'scene_2', 'Escena 2', 'Exterior - escena 2', 'side_scroll', '{\"dialog_on_load\":\"start_scene_2\"}', 2, '2025-10-14 23:03:09'),
(3, 'scene_3', 'Escena 3 (Slides)', 'Secuencia de slides para escena 3', 'slides', '{\"next_scene_slug\":\"scene_4\"}', 3, '2025-10-14 23:03:09'),
(4, 'scene_4', 'Escena 4', 'Escena 4 - formato libre (escena4.png)', 'free', NULL, 4, '2025-10-14 23:03:09'),
(5, 'scene_5', 'Escena 5 (Slides)', 'Secuencia de slides para escena 5', 'slides', NULL, 5, '2025-10-14 23:03:09'),
(6, 'scene_6', 'Escena 6', 'Escena 6 - formato libre (escena6.png)', 'free', NULL, 6, '2025-10-14 23:03:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `scene_assets`
--

CREATE TABLE `scene_assets` (
  `id` int(10) UNSIGNED NOT NULL,
  `scene_id` int(10) UNSIGNED NOT NULL,
  `asset_id` int(10) UNSIGNED NOT NULL,
  `role` varchar(80) NOT NULL,
  `ordering` int(11) DEFAULT 0,
  `extra` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `scene_assets`
--

INSERT INTO `scene_assets` (`id`, `scene_id`, `asset_id`, `role`, `ordering`, `extra`, `created_at`) VALUES
(1, 1, 1, 'background', 0, NULL, '2025-10-14 23:03:09'),
(2, 2, 2, 'background', 0, NULL, '2025-10-14 23:03:09'),
(3, 3, 2, 'background', 0, NULL, '2025-10-14 23:03:09'),
(4, 4, 3, 'background', 0, NULL, '2025-10-14 23:03:09'),
(5, 5, 9, 'slide', 1, NULL, '2025-10-14 23:03:09'),
(6, 5, 10, 'slide', 2, NULL, '2025-10-14 23:03:09'),
(7, 5, 11, 'slide', 3, NULL, '2025-10-14 23:03:09'),
(8, 5, 12, 'slide', 4, NULL, '2025-10-14 23:03:09'),
(9, 5, 13, 'slide', 5, NULL, '2025-10-14 23:03:09'),
(10, 5, 14, 'slide', 6, NULL, '2025-10-14 23:03:09'),
(11, 5, 15, 'slide', 7, NULL, '2025-10-14 23:03:09'),
(12, 5, 16, 'slide', 8, NULL, '2025-10-14 23:03:09'),
(13, 5, 17, 'slide', 9, NULL, '2025-10-14 23:03:09'),
(14, 6, 18, 'background', 0, NULL, '2025-10-14 23:03:09'),
(15, 3, 6, 'slide', 1, NULL, '2025-10-14 23:09:52'),
(16, 3, 7, 'slide', 2, NULL, '2025-10-14 23:09:53'),
(17, 3, 8, 'slide', 3, NULL, '2025-10-14 23:09:53'),
(23, 1, 1001, 'sfx_end', 0, NULL, '2025-10-15 11:16:42'),
(24, 1, 1002, 'sfx_start', 0, NULL, '2025-10-15 11:16:42'),
(25, 2, 1001, 'sfx_end', 0, NULL, '2025-10-15 11:16:42'),
(26, 2, 1002, 'sfx_start', 0, NULL, '2025-10-15 11:16:42'),
(27, 3, 1008, 'slide_sfx', 1, NULL, '2025-10-15 11:54:02'),
(28, 3, 1009, 'slide_sfx', 2, NULL, '2025-10-15 11:54:02'),
(29, 3, 1010, 'slide_sfx', 3, NULL, '2025-10-15 11:54:02'),
(30, 4, 1002, 'sfx_start', 0, NULL, '2025-10-15 11:54:02');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `scene_assets_backup`
--

CREATE TABLE `scene_assets_backup` (
  `id` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `scene_id` int(10) UNSIGNED NOT NULL,
  `asset_id` int(10) UNSIGNED NOT NULL,
  `role` varchar(80) NOT NULL,
  `ordering` int(11) DEFAULT 0,
  `extra` text DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `scene_assets_backup`
--

INSERT INTO `scene_assets_backup` (`id`, `scene_id`, `asset_id`, `role`, `ordering`, `extra`, `created_at`) VALUES
(1, 1, 1, 'background', 0, NULL, '2025-10-14 23:03:09'),
(2, 2, 2, 'background', 0, NULL, '2025-10-14 23:03:09'),
(3, 3, 2, 'background', 0, NULL, '2025-10-14 23:03:09'),
(4, 4, 3, 'background', 0, NULL, '2025-10-14 23:03:09'),
(5, 5, 9, 'slide', 1, NULL, '2025-10-14 23:03:09'),
(6, 5, 10, 'slide', 2, NULL, '2025-10-14 23:03:09'),
(7, 5, 11, 'slide', 3, NULL, '2025-10-14 23:03:09'),
(8, 5, 12, 'slide', 4, NULL, '2025-10-14 23:03:09'),
(9, 5, 13, 'slide', 5, NULL, '2025-10-14 23:03:09'),
(10, 5, 14, 'slide', 6, NULL, '2025-10-14 23:03:09'),
(11, 5, 15, 'slide', 7, NULL, '2025-10-14 23:03:09'),
(12, 5, 16, 'slide', 8, NULL, '2025-10-14 23:03:09'),
(13, 5, 17, 'slide', 9, NULL, '2025-10-14 23:03:09'),
(14, 6, 18, 'background', 0, NULL, '2025-10-14 23:03:09'),
(15, 3, 6, 'slide', 1, NULL, '2025-10-14 23:09:52'),
(16, 3, 7, 'slide', 2, NULL, '2025-10-14 23:09:53'),
(17, 3, 8, 'slide', 3, NULL, '2025-10-14 23:09:53'),
(23, 1, 1001, 'sfx_end', 0, NULL, '2025-10-15 11:16:42'),
(24, 1, 1002, 'sfx_start', 0, NULL, '2025-10-15 11:16:42'),
(25, 2, 1001, 'sfx_end', 0, NULL, '2025-10-15 11:16:42'),
(26, 2, 1002, 'sfx_start', 0, NULL, '2025-10-15 11:16:42'),
(27, 3, 1008, 'slide_sfx', 1, NULL, '2025-10-15 11:54:02'),
(28, 3, 1009, 'slide_sfx', 2, NULL, '2025-10-15 11:54:02'),
(29, 3, 1010, 'slide_sfx', 3, NULL, '2025-10-15 11:54:02'),
(30, 4, 1002, 'sfx_start', 0, NULL, '2025-10-15 11:54:02'),
(31, 3, 1008, 'slide_sfx', 1, NULL, '2025-10-15 12:14:56'),
(32, 3, 1009, 'slide_sfx', 2, NULL, '2025-10-15 12:14:56'),
(33, 3, 1010, 'slide_sfx', 3, NULL, '2025-10-15 12:14:56'),
(34, 4, 1002, 'sfx_start', 0, NULL, '2025-10-15 12:14:56');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `settings`
--

CREATE TABLE `settings` (
  `key` varchar(120) NOT NULL,
  `value` text DEFAULT NULL,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `settings`
--

INSERT INTO `settings` (`key`, `value`, `updated_at`) VALUES
('default_music_volume', '{\"volume\":0.6}', '2025-10-14 23:03:09'),
('schema_version', '2', '2025-10-14 23:03:09');

-- --------------------------------------------------------

--
-- Estructura de tabla para la tabla `users`
--

CREATE TABLE `users` (
  `id` int(10) UNSIGNED NOT NULL,
  `username` varchar(100) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `last_login` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Volcado de datos para la tabla `users`
--

INSERT INTO `users` (`id`, `username`, `email`, `password_hash`, `is_admin`, `created_at`, `last_login`) VALUES
(1, 'UsuarioDeEjemplo', NULL, '$2y$10$6ot59yeYCuaogdi6uWtk8O31HA3THUjTOr9O6biwFsWE95vad87va', 0, '2025-10-14 23:22:46', '2025-10-21 12:31:32');

--
-- Índices para tablas volcadas
--

--
-- Indices de la tabla `assets`
--
ALTER TABLE `assets`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_assets_path` (`path`);

--
-- Indices de la tabla `events`
--
ALTER TABLE `events`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_events_scene` (`scene_id`,`active`,`ordering`);

--
-- Indices de la tabla `saves`
--
ALTER TABLE `saves`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_saves_user` (`user_id`),
  ADD KEY `idx_saves_user` (`user_id`);

--
-- Indices de la tabla `scenes`
--
ALTER TABLE `scenes`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `slug` (`slug`);

--
-- Indices de la tabla `scene_assets`
--
ALTER TABLE `scene_assets`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_sceneassets_asset` (`asset_id`),
  ADD KEY `idx_scene_assets_scene_role` (`scene_id`,`role`,`ordering`);

--
-- Indices de la tabla `settings`
--
ALTER TABLE `settings`
  ADD PRIMARY KEY (`key`);

--
-- Indices de la tabla `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- AUTO_INCREMENT de las tablas volcadas
--

--
-- AUTO_INCREMENT de la tabla `assets`
--
ALTER TABLE `assets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=1013;

--
-- AUTO_INCREMENT de la tabla `events`
--
ALTER TABLE `events`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT de la tabla `saves`
--
ALTER TABLE `saves`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT de la tabla `scenes`
--
ALTER TABLE `scenes`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT de la tabla `scene_assets`
--
ALTER TABLE `scene_assets`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=41;

--
-- AUTO_INCREMENT de la tabla `users`
--
ALTER TABLE `users`
  MODIFY `id` int(10) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- Restricciones para tablas volcadas
--

--
-- Filtros para la tabla `events`
--
ALTER TABLE `events`
  ADD CONSTRAINT `fk_events_scene` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `saves`
--
ALTER TABLE `saves`
  ADD CONSTRAINT `fk_saves_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Filtros para la tabla `scene_assets`
--
ALTER TABLE `scene_assets`
  ADD CONSTRAINT `fk_sceneassets_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_sceneassets_scene` FOREIGN KEY (`scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
