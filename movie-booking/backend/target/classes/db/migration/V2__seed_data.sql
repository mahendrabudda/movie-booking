-- =========================================================================
-- V2__seed_data.sql
-- Seeded DEVELOPMENT ONLY accounts, global pricing policy, theatres,
-- screens, seats, movies, 10 reviewer assignments, and sample shows.
-- All dev accounts use password: Password@123
-- =========================================================================

INSERT INTO global_pricing_policy (
    id, min_ticket_price, single_screen_max_price, multiplex_max_price,
    flop_multiplier, below_average_multiplier, average_multiplier,
    hit_multiplier, superhit_multiplier, blockbuster_multiplier, industry_hit_uses_theatre_max
) VALUES (
    1, 100.00, 350.00, 450.00,
    0.750, 0.900, 1.000,
    1.250, 1.500, 1.650, TRUE
);

-- Seed Primary Accounts (1 per role + 9 extra reviewers for 10-reviewer flow)
-- Password for all seeded accounts (DEV ONLY): Password@123
INSERT INTO app_user (id, email, password_hash, full_name, role, active, approved) VALUES
    (1, 'admin@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'System Admin', 'ADMIN', TRUE, TRUE),
    (2, 'manager@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Ravi Kumar (Manager)', 'THEATRE_MANAGER', TRUE, TRUE),
    (3, 'customer@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Ananya Sharma (Customer)', 'CUSTOMER', TRUE, TRUE),
    (4, 'reviewer1@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 1', 'MOVIE_REVIEWER', TRUE, TRUE),
    (5, 'reviewer2@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 2', 'MOVIE_REVIEWER', TRUE, TRUE),
    (6, 'reviewer3@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 3', 'MOVIE_REVIEWER', TRUE, TRUE),
    (7, 'reviewer4@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 4', 'MOVIE_REVIEWER', TRUE, TRUE),
    (8, 'reviewer5@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 5', 'MOVIE_REVIEWER', TRUE, TRUE),
    (9, 'reviewer6@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 6', 'MOVIE_REVIEWER', TRUE, TRUE),
    (10, 'reviewer7@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 7', 'MOVIE_REVIEWER', TRUE, TRUE),
    (11, 'reviewer8@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 8', 'MOVIE_REVIEWER', TRUE, TRUE),
    (12, 'reviewer9@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 9', 'MOVIE_REVIEWER', TRUE, TRUE),
    (13, 'reviewer10@moviebooking.local', '$2a$10$8.UnVuG9HHgffUDAlk8qfOuVGkqRzgVymGe07xd00DMxs.AQubh4a', 'Critic Reviewer 10', 'MOVIE_REVIEWER', TRUE, TRUE);

SELECT setval('app_user_id_seq', (SELECT MAX(id) FROM app_user));

-- Seed Theatres (1 Multiplex, 1 Single Screen)
INSERT INTO theatre (id, name, city, address, type, max_ticket_price, active) VALUES
    (1, 'Orion Multiplex IMAX', 'Hyderabad', 'Banjara Hills Road No 12, Hyderabad', 'MULTIPLEX', 450.00, TRUE),
    (2, 'Sudarshan 35MM Single Screen', 'Hyderabad', 'RTC X Roads, Hyderabad', 'SINGLE_SCREEN', 350.00, TRUE);

SELECT setval('theatre_id_seq', (SELECT MAX(id) FROM theatre));

-- Assign Theatre Manager (id=2) to Orion Multiplex (id=1)
INSERT INTO manager_theatre (manager_id, theatre_id, assigned_by) VALUES (2, 1, 1);

-- Seed Screens
INSERT INTO screen (id, theatre_id, name, total_seats) VALUES
    (1, 1, 'Screen 1 - Dolby Atmos', 12),
    (2, 2, 'Main Auditorium', 10);

SELECT setval('screen_id_seq', (SELECT MAX(id) FROM screen));

-- Seed Seats for Screen 1 (Rows A: REGULAR, B: PREMIUM, C: RECLINER)
INSERT INTO seat (id, screen_id, row_label, seat_number, category, price_multiplier) VALUES
    (1, 1, 'A', 1, 'REGULAR', 1.00),
    (2, 1, 'A', 2, 'REGULAR', 1.00),
    (3, 1, 'A', 3, 'REGULAR', 1.00),
    (4, 1, 'A', 4, 'REGULAR', 1.00),
    (5, 1, 'B', 1, 'PREMIUM', 1.15),
    (6, 1, 'B', 2, 'PREMIUM', 1.15),
    (7, 1, 'B', 3, 'PREMIUM', 1.15),
    (8, 1, 'B', 4, 'PREMIUM', 1.15),
    (9, 1, 'C', 1, 'RECLINER', 1.30),
    (10, 1, 'C', 2, 'RECLINER', 1.30),
    (11, 1, 'C', 3, 'RECLINER', 1.30),
    (12, 1, 'C', 4, 'RECLINER', 1.30);

-- Seed Seats for Screen 2
INSERT INTO seat (id, screen_id, row_label, seat_number, category, price_multiplier) VALUES
    (13, 2, 'A', 1, 'REGULAR', 1.00),
    (14, 2, 'A', 2, 'REGULAR', 1.00),
    (15, 2, 'A', 3, 'REGULAR', 1.00),
    (16, 2, 'A', 4, 'REGULAR', 1.00),
    (17, 2, 'A', 5, 'REGULAR', 1.00),
    (18, 2, 'B', 1, 'PREMIUM', 1.10),
    (19, 2, 'B', 2, 'PREMIUM', 1.10),
    (20, 2, 'B', 3, 'PREMIUM', 1.10),
    (21, 2, 'B', 4, 'PREMIUM', 1.10),
    (22, 2, 'B', 5, 'PREMIUM', 1.10);

SELECT setval('seat_id_seq', (SELECT MAX(id) FROM seat));

-- Seed Movies
INSERT INTO movie (id, title, description, genre, language, duration_minutes, release_date, predicted_category, predicted_multiplier, active) VALUES
    (1, 'Devara: Storm Horizon', 'High-octane coastal action drama featuring epic naval sequences.', 'ACTION', 'Telugu', 165, CURRENT_DATE - INTERVAL '3 days', NULL, NULL, TRUE),
    (2, 'Cyber Protocol 2099', 'Sci-fi thriller exploring rogue AI networks in Neo-Bengaluru.', 'SCI_FI', 'English', 140, CURRENT_DATE - INTERVAL '7 days', 'SUPERHIT', 1.500, TRUE);

SELECT setval('movie_id_seq', (SELECT MAX(id) FROM movie));

-- Assign all 10 Reviewers to Movie 1 (9 pre-submitted ratings so Reviewer 10 can submit the 10th rating in demo!)
INSERT INTO movie_reviewer_assignment (movie_id, reviewer_id, assigned_by) VALUES
    (1, 4, 1), (1, 5, 1), (1, 6, 1), (1, 7, 1), (1, 8, 1),
    (1, 9, 1), (1, 10, 1), (1, 11, 1), (1, 12, 1), (1, 13, 1);

INSERT INTO reviewer_rating (movie_id, reviewer_id, rating, review_notes) VALUES
    (1, 4, 9, 'Outstanding cinematography and background score.'),
    (1, 5, 8, 'Strong pacing and lead performance.'),
    (1, 6, 9, 'Crowd-pleasing action blocks.'),
    (1, 7, 8, 'Well-crafted interval sequence.'),
    (1, 8, 9, 'Impressive visual effects.'),
    (1, 9, 8, 'Solid theatrical experience.'),
    (1, 10, 9, 'Great direction and production design.'),
    (1, 11, 8, 'Engaging second half.'),
    (1, 12, 9, 'Must-watch in theatres.');

-- Seed Sample Shows (24 hours and 48 hours in the future so cancellation cutoff is well ahead)
INSERT INTO show_schedule (id, movie_id, screen_id, start_time, end_time, base_price, active) VALUES
    (1, 1, 1, CURRENT_TIMESTAMP + INTERVAL '24 hours', CURRENT_TIMESTAMP + INTERVAL '27 hours', 200.00, TRUE),
    (2, 2, 1, CURRENT_TIMESTAMP + INTERVAL '30 hours', CURRENT_TIMESTAMP + INTERVAL '32 hours 30 minutes', 200.00, TRUE),
    (3, 1, 2, CURRENT_TIMESTAMP + INTERVAL '26 hours', CURRENT_TIMESTAMP + INTERVAL '29 hours', 200.00, TRUE);

SELECT setval('show_schedule_id_seq', (SELECT MAX(id) FROM show_schedule));

-- Initialize show_seat rows for each show
INSERT INTO show_seat (show_id, seat_id, status, version)
SELECT 1, id, 'AVAILABLE', 0 FROM seat WHERE screen_id = 1;

INSERT INTO show_seat (show_id, seat_id, status, version)
SELECT 2, id, 'AVAILABLE', 0 FROM seat WHERE screen_id = 1;

INSERT INTO show_seat (show_id, seat_id, status, version)
SELECT 3, id, 'AVAILABLE', 0 FROM seat WHERE screen_id = 2;

-- Seed Sample Coupons
INSERT INTO coupon (code, discount_type, discount_value, max_discount, min_order_amount, expires_at, usage_limit, used_count, active) VALUES
    ('WELCOME10', 'PERCENTAGE', 10.00, 100.00, 150.00, CURRENT_TIMESTAMP + INTERVAL '90 days', 500, 0, TRUE),
    ('FLAT50', 'FLAT', 50.00, 50.00, 250.00, CURRENT_TIMESTAMP + INTERVAL '60 days', 200, 0, TRUE);
