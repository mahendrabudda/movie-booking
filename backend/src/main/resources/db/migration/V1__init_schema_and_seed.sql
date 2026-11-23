-- ============================================================================
-- V1__init_schema_and_seed.sql
-- Database schema and initial seed data for Movie Booking with AI Dynamic Pricing
-- ============================================================================

-- 1. APP_USER
CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(160) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER', 'ADMIN')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_app_user_email ON app_user(email);

-- 2. MOVIE
CREATE TABLE movie (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    genre VARCHAR(60) NOT NULL,
    language VARCHAR(60) NOT NULL,
    duration INTEGER NOT NULL CHECK (duration > 0),
    release_date DATE NOT NULL,
    poster_url VARCHAR(500) NOT NULL,
    rating NUMERIC(3, 1) NOT NULL CHECK (rating >= 0.0 AND rating <= 10.0),
    base_price NUMERIC(10, 2) NOT NULL DEFAULT 200.00 CHECK (base_price > 0),
    approved_dynamic_price NUMERIC(10, 2),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movie_title ON movie(LOWER(title));

-- 3. THEATRE
CREATE TABLE theatre (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(180) NOT NULL,
    city VARCHAR(100) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('SINGLE_SCREEN', 'MULTIPLEX')),
    max_ticket_price NUMERIC(10, 2) NOT NULL CHECK (max_ticket_price > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 4. SCREEN
CREATE TABLE screen (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    total_seats INTEGER NOT NULL CHECK (total_seats > 0),
    theatre_id BIGINT NOT NULL REFERENCES theatre(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_screen_theatre_id ON screen(theatre_id);

-- 5. SEAT
CREATE TABLE seat (
    id BIGSERIAL PRIMARY KEY,
    screen_id BIGINT NOT NULL REFERENCES screen(id) ON DELETE CASCADE,
    seat_number VARCHAR(15) NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('REGULAR', 'PREMIUM')),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE')),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_screen_seat_number UNIQUE (screen_id, seat_number)
);

CREATE INDEX idx_seat_screen_id ON seat(screen_id);

-- 6. MOVIE_SHOW
CREATE TABLE movie_show (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    screen_id BIGINT NOT NULL REFERENCES screen(id) ON DELETE CASCADE,
    show_date_time TIMESTAMP NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price > 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movie_show_movie_id ON movie_show(movie_id);
CREATE INDEX idx_movie_show_screen_id ON movie_show(screen_id);
CREATE INDEX idx_movie_show_datetime ON movie_show(show_date_time);

-- 7. BOOKING
CREATE TABLE booking (
    id BIGSERIAL PRIMARY KEY,
    booking_reference VARCHAR(64) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    show_id BIGINT NOT NULL REFERENCES movie_show(id) ON DELETE CASCADE,
    total_amount NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
    booking_status VARCHAR(30) NOT NULL CHECK (booking_status IN ('CONFIRMED', 'CANCELLED')),
    payment_reference VARCHAR(80),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_booking_user_id ON booking(user_id);
CREATE INDEX idx_booking_show_id ON booking(show_id);

-- 8. BOOKING_SEAT (Enforces unique constraint preventing duplicate seat bookings per show)
CREATE TABLE booking_seat (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    show_id BIGINT NOT NULL REFERENCES movie_show(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL REFERENCES seat(id) ON DELETE CASCADE,
    seat_number VARCHAR(15) NOT NULL,
    seat_category VARCHAR(30) NOT NULL,
    price NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_booking_seat_show_seat UNIQUE (show_id, seat_id)
);

CREATE INDEX idx_booking_seat_booking_id ON booking_seat(booking_id);
CREATE INDEX idx_booking_seat_show_id ON booking_seat(show_id);

-- 9. MOVIE_PREDICTION
CREATE TABLE movie_prediction (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    average_movie_rating NUMERIC(3, 1) NOT NULL,
    genre VARCHAR(60) NOT NULL,
    language VARCHAR(60) NOT NULL,
    days_since_release INTEGER NOT NULL,
    movie_duration INTEGER NOT NULL,
    expected_demand NUMERIC(5, 2) NOT NULL,
    current_occupancy NUMERIC(5, 2) NOT NULL,
    predicted_category VARCHAR(40) NOT NULL,
    confidence NUMERIC(6, 4) NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    recommended_price NUMERIC(10, 2) NOT NULL,
    approved_price NUMERIC(10, 2),
    approved BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_movie_prediction_movie_id ON movie_prediction(movie_id);

-- ============================================================================
-- SEED DATA: 5 Sample Movies, 2 Theatres (1 SINGLE_SCREEN, 1 MULTIPLEX),
-- Screens, Seats, and Sample Shows (Users are seeded by DataInitializer with BCrypt)
-- ============================================================================

INSERT INTO movie (id, title, description, genre, language, duration, release_date, poster_url, rating, base_price, approved_dynamic_price)
VALUES
(1, 'Kalki 2898 AD', 'A modern-day avatar of Vishnu descends to Earth to protect the world from dark forces in a dystopian future city of Kasi.', 'SCI_FI', 'TELUGU', 181, '2026-10-25', 'https://image.tmdb.org/t/p/w500/rstc42x211tT2H2P3hG7A5n513k.jpg', 8.7, 250.00, NULL),
(2, 'Dune: Part Two', 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.', 'SCI_FI', 'ENGLISH', 166, '2026-11-01', 'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg', 8.9, 280.00, NULL),
(3, 'Salaar: Part 1 – Ceasefire', 'A gang leader tries to keep a promise made to his dying friend and takes on the other criminal gangs in Khansaar.', 'ACTION', 'TELUGU', 175, '2026-10-18', 'https://image.tmdb.org/t/p/w500/c5Z5tC7P2wP7Q5G3v8Z9k1L2M4N.jpg', 8.2, 220.00, NULL),
(4, 'Oppenheimer', 'The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb.', 'DRAMA', 'ENGLISH', 180, '2026-09-20', 'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg', 9.0, 260.00, NULL),
(5, 'Stree 2: Sarkate Ka Aatank', 'After the events of Stree, the town of Chanderi is haunted again by a headless entity abducting women.', 'COMEDY', 'HINDI', 149, '2026-11-05', 'https://image.tmdb.org/t/p/w500/k42Owka8v91trK1qMYwCQCNwJKr.jpg', 7.9, 200.00, NULL);

SELECT setval('movie_id_seq', (SELECT MAX(id) FROM movie));

-- 2 Theatres: 1 SINGLE_SCREEN (max ₹350.00) and 1 MULTIPLEX (max ₹450.00)
INSERT INTO theatre (id, name, city, type, max_ticket_price)
VALUES
(1, 'Sudarshan 35MM Dolby Atmos', 'Hyderabad', 'SINGLE_SCREEN', 350.00),
(2, 'PVR Inorbit IMAX Multiplex', 'Hyderabad', 'MULTIPLEX', 450.00);

SELECT setval('theatre_id_seq', (SELECT MAX(id) FROM theatre));

-- 3 Screens across the 2 theatres
INSERT INTO screen (id, name, total_seats, theatre_id)
VALUES
(1, 'Main Hall 70MM', 24, 1),
(2, 'Audi 1 - IMAX Laser', 24, 2),
(3, 'Audi 2 - Gold Class', 20, 2);

SELECT setval('screen_id_seq', (SELECT MAX(id) FROM screen));

-- Seed Seats for Screen 1 (24 seats: Rows A-B Regular, Row C Premium)
INSERT INTO seat (screen_id, seat_number, category, status)
VALUES
(1, 'A1', 'REGULAR', 'ACTIVE'), (1, 'A2', 'REGULAR', 'ACTIVE'), (1, 'A3', 'REGULAR', 'ACTIVE'), (1, 'A4', 'REGULAR', 'ACTIVE'),
(1, 'A5', 'REGULAR', 'ACTIVE'), (1, 'A6', 'REGULAR', 'ACTIVE'), (1, 'A7', 'REGULAR', 'ACTIVE'), (1, 'A8', 'REGULAR', 'ACTIVE'),
(1, 'B1', 'REGULAR', 'ACTIVE'), (1, 'B2', 'REGULAR', 'ACTIVE'), (1, 'B3', 'REGULAR', 'ACTIVE'), (1, 'B4', 'REGULAR', 'ACTIVE'),
(1, 'B5', 'REGULAR', 'ACTIVE'), (1, 'B6', 'REGULAR', 'ACTIVE'), (1, 'B7', 'REGULAR', 'ACTIVE'), (1, 'B8', 'REGULAR', 'ACTIVE'),
(1, 'C1', 'PREMIUM', 'ACTIVE'), (1, 'C2', 'PREMIUM', 'ACTIVE'), (1, 'C3', 'PREMIUM', 'ACTIVE'), (1, 'C4', 'PREMIUM', 'ACTIVE'),
(1, 'C5', 'PREMIUM', 'ACTIVE'), (1, 'C6', 'PREMIUM', 'ACTIVE'), (1, 'C7', 'PREMIUM', 'ACTIVE'), (1, 'C8', 'PREMIUM', 'ACTIVE');

-- Seed Seats for Screen 2 (24 seats: Rows A-B Regular, Row C Premium)
INSERT INTO seat (screen_id, seat_number, category, status)
VALUES
(2, 'A1', 'REGULAR', 'ACTIVE'), (2, 'A2', 'REGULAR', 'ACTIVE'), (2, 'A3', 'REGULAR', 'ACTIVE'), (2, 'A4', 'REGULAR', 'ACTIVE'),
(2, 'A5', 'REGULAR', 'ACTIVE'), (2, 'A6', 'REGULAR', 'ACTIVE'), (2, 'A7', 'REGULAR', 'ACTIVE'), (2, 'A8', 'REGULAR', 'ACTIVE'),
(2, 'B1', 'REGULAR', 'ACTIVE'), (2, 'B2', 'REGULAR', 'ACTIVE'), (2, 'B3', 'REGULAR', 'ACTIVE'), (2, 'B4', 'REGULAR', 'ACTIVE'),
(2, 'B5', 'REGULAR', 'ACTIVE'), (2, 'B6', 'REGULAR', 'ACTIVE'), (2, 'B7', 'REGULAR', 'ACTIVE'), (2, 'B8', 'REGULAR', 'ACTIVE'),
(2, 'C1', 'PREMIUM', 'ACTIVE'), (2, 'C2', 'PREMIUM', 'ACTIVE'), (2, 'C3', 'PREMIUM', 'ACTIVE'), (2, 'C4', 'PREMIUM', 'ACTIVE'),
(2, 'C5', 'PREMIUM', 'ACTIVE'), (2, 'C6', 'PREMIUM', 'ACTIVE'), (2, 'C7', 'PREMIUM', 'ACTIVE'), (2, 'C8', 'PREMIUM', 'ACTIVE');

-- Seed Seats for Screen 3 (20 seats: Rows A-B Regular, Row C Premium)
INSERT INTO seat (screen_id, seat_number, category, status)
VALUES
(3, 'A1', 'REGULAR', 'ACTIVE'), (3, 'A2', 'REGULAR', 'ACTIVE'), (3, 'A3', 'REGULAR', 'ACTIVE'), (3, 'A4', 'REGULAR', 'ACTIVE'),
(3, 'A5', 'REGULAR', 'ACTIVE'), (3, 'A6', 'REGULAR', 'ACTIVE'), (3, 'A7', 'REGULAR', 'ACTIVE'), (3, 'A8', 'REGULAR', 'ACTIVE'),
(3, 'B1', 'REGULAR', 'ACTIVE'), (3, 'B2', 'REGULAR', 'ACTIVE'), (3, 'B3', 'REGULAR', 'ACTIVE'), (3, 'B4', 'REGULAR', 'ACTIVE'),
(3, 'B5', 'REGULAR', 'ACTIVE'), (3, 'B6', 'REGULAR', 'ACTIVE'),
(3, 'C1', 'PREMIUM', 'ACTIVE'), (3, 'C2', 'PREMIUM', 'ACTIVE'), (3, 'C3', 'PREMIUM', 'ACTIVE'), (3, 'C4', 'PREMIUM', 'ACTIVE'),
(3, 'C5', 'PREMIUM', 'ACTIVE'), (3, 'C6', 'PREMIUM', 'ACTIVE');

-- Sample Shows
INSERT INTO movie_show (id, movie_id, screen_id, show_date_time, base_price)
VALUES
(1, 1, 1, '2026-11-18 18:30:00', 220.00),
(2, 1, 2, '2026-11-18 21:15:00', 280.00),
(3, 2, 2, '2026-11-18 17:45:00', 300.00),
(4, 3, 1, '2026-11-19 14:00:00', 200.00),
(5, 4, 3, '2026-11-19 19:30:00', 260.00),
(6, 5, 3, '2026-11-19 22:00:00', 210.00);

SELECT setval('movie_show_id_seq', (SELECT MAX(id) FROM movie_show));
