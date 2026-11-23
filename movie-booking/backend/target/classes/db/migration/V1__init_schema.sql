-- =========================================================================
-- V1__init_schema.sql
-- Complete relational schema for Movie Ticket Booking with AI Dynamic Pricing
-- All timestamps stored as TIMESTAMPTZ (UTC). All money stored as NUMERIC(10,2).
-- =========================================================================

CREATE TABLE app_user (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(120) NOT NULL,
    role VARCHAR(30) NOT NULL CHECK (role IN ('CUSTOMER', 'MOVIE_REVIEWER', 'THEATRE_MANAGER', 'ADMIN')),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    approved BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE global_pricing_policy (
    id BIGSERIAL PRIMARY KEY,
    min_ticket_price NUMERIC(10, 2) NOT NULL DEFAULT 100.00,
    single_screen_max_price NUMERIC(10, 2) NOT NULL DEFAULT 350.00,
    multiplex_max_price NUMERIC(10, 2) NOT NULL DEFAULT 450.00,
    flop_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 0.750,
    below_average_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 0.900,
    average_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 1.000,
    hit_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 1.250,
    superhit_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 1.500,
    blockbuster_multiplier NUMERIC(6, 3) NOT NULL DEFAULT 1.650,
    industry_hit_uses_theatre_max BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE theatre (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    city VARCHAR(80) NOT NULL,
    address VARCHAR(255) NOT NULL,
    type VARCHAR(30) NOT NULL CHECK (type IN ('SINGLE_SCREEN', 'MULTIPLEX')),
    max_ticket_price NUMERIC(10, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manager_theatre (
    id BIGSERIAL PRIMARY KEY,
    manager_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    theatre_id BIGINT NOT NULL REFERENCES theatre(id) ON DELETE CASCADE,
    assigned_by BIGINT NOT NULL REFERENCES app_user(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_manager_theatre UNIQUE (manager_id, theatre_id)
);

CREATE TABLE screen (
    id BIGSERIAL PRIMARY KEY,
    theatre_id BIGINT NOT NULL REFERENCES theatre(id) ON DELETE CASCADE,
    name VARCHAR(80) NOT NULL,
    total_seats INT NOT NULL DEFAULT 0,
    CONSTRAINT uk_theatre_screen_name UNIQUE (theatre_id, name)
);

CREATE TABLE seat (
    id BIGSERIAL PRIMARY KEY,
    screen_id BIGINT NOT NULL REFERENCES screen(id) ON DELETE CASCADE,
    row_label VARCHAR(10) NOT NULL,
    seat_number INT NOT NULL,
    category VARCHAR(20) NOT NULL CHECK (category IN ('REGULAR', 'PREMIUM', 'RECLINER')),
    price_multiplier NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
    CONSTRAINT uk_screen_row_seat UNIQUE (screen_id, row_label, seat_number)
);

CREATE TABLE movie (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(180) NOT NULL,
    description TEXT,
    genre VARCHAR(60) NOT NULL,
    language VARCHAR(50) NOT NULL,
    duration_minutes INT NOT NULL CHECK (duration_minutes > 0),
    release_date DATE NOT NULL,
    predicted_category VARCHAR(30),
    predicted_multiplier NUMERIC(6, 3),
    override_price NUMERIC(10, 2),
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE movie_reviewer_assignment (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    assigned_by BIGINT NOT NULL REFERENCES app_user(id),
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_movie_reviewer_assignment UNIQUE (movie_id, reviewer_id)
);

CREATE TABLE reviewer_rating (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    reviewer_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 10),
    review_notes VARCHAR(500),
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_movie_reviewer_rating UNIQUE (movie_id, reviewer_id)
);

CREATE TABLE movie_prediction (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    ratings_snapshot VARCHAR(255) NOT NULL,
    mean_rating NUMERIC(5, 2) NOT NULL,
    median_rating NUMERIC(5, 2) NOT NULL,
    std_dev_rating NUMERIC(5, 2) NOT NULL,
    min_rating INT NOT NULL,
    max_rating INT NOT NULL,
    count_high_ratings INT NOT NULL,
    days_since_release INT NOT NULL,
    predicted_class VARCHAR(30) NOT NULL,
    confidence NUMERIC(5, 4) NOT NULL,
    model_version VARCHAR(50) NOT NULL,
    recommended_multiplier NUMERIC(6, 3) NOT NULL,
    reference_base_price NUMERIC(10, 2) NOT NULL,
    final_reference_price NUMERIC(10, 2) NOT NULL,
    triggered_by BIGINT NOT NULL REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE customer_review (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    user_id BIGINT NOT NULL REFERENCES app_user(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment VARCHAR(1000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uk_customer_movie_review UNIQUE (movie_id, user_id)
);

CREATE TABLE show_schedule (
    id BIGSERIAL PRIMARY KEY,
    movie_id BIGINT NOT NULL REFERENCES movie(id) ON DELETE CASCADE,
    screen_id BIGINT NOT NULL REFERENCES screen(id) ON DELETE CASCADE,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    base_price NUMERIC(10, 2) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_show_start_time ON show_schedule(start_time);

CREATE TABLE show_seat (
    id BIGSERIAL PRIMARY KEY,
    show_id BIGINT NOT NULL REFERENCES show_schedule(id) ON DELETE CASCADE,
    seat_id BIGINT NOT NULL REFERENCES seat(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL CHECK (status IN ('AVAILABLE', 'HELD', 'BOOKED')),
    held_by BIGINT REFERENCES app_user(id),
    hold_expires_at TIMESTAMPTZ,
    locked_price NUMERIC(10, 2),
    version BIGINT NOT NULL DEFAULT 0,
    CONSTRAINT uk_show_seat UNIQUE (show_id, seat_id)
);

CREATE INDEX idx_show_seat_show_status ON show_seat(show_id, status);

CREATE TABLE coupon (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(40) NOT NULL UNIQUE,
    discount_type VARCHAR(20) NOT NULL CHECK (discount_type IN ('PERCENTAGE', 'FLAT')),
    discount_value NUMERIC(10, 2) NOT NULL,
    max_discount NUMERIC(10, 2),
    min_order_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    expires_at TIMESTAMPTZ NOT NULL,
    usage_limit INT NOT NULL,
    used_count INT NOT NULL DEFAULT 0,
    active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE TABLE booking (
    id BIGSERIAL PRIMARY KEY,
    booking_reference VARCHAR(40) NOT NULL UNIQUE,
    idempotency_key VARCHAR(80) NOT NULL UNIQUE,
    user_id BIGINT NOT NULL REFERENCES app_user(id),
    show_id BIGINT NOT NULL REFERENCES show_schedule(id),
    status VARCHAR(25) NOT NULL CHECK (status IN ('HELD', 'PAYMENT_PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED', 'EXPIRED')),
    seat_subtotal NUMERIC(10, 2) NOT NULL,
    convenience_fee NUMERIC(10, 2) NOT NULL,
    gst_amount NUMERIC(10, 2) NOT NULL,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_amount NUMERIC(10, 2) NOT NULL,
    coupon_code VARCHAR(40),
    qr_token VARCHAR(512),
    checked_in BOOLEAN NOT NULL DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ,
    checked_in_by BIGINT REFERENCES app_user(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    confirmed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ
);

CREATE INDEX idx_booking_user_id ON booking(user_id);

CREATE TABLE booking_seat (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    show_id BIGINT NOT NULL REFERENCES show_schedule(id),
    seat_id BIGINT NOT NULL REFERENCES seat(id),
    seat_label VARCHAR(20) NOT NULL,
    price NUMERIC(10, 2) NOT NULL,
    confirmed_active BOOLEAN
);

-- Database-level protection: a seat cannot belong to two CONFIRMED bookings for the same show
CREATE UNIQUE INDEX uk_confirmed_show_seat
    ON booking_seat (show_id, seat_id)
    WHERE confirmed_active = TRUE;

CREATE TABLE booking_status_history (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    from_status VARCHAR(25),
    to_status VARCHAR(25) NOT NULL,
    note VARCHAR(255),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    idempotency_key VARCHAR(80) NOT NULL UNIQUE,
    provider VARCHAR(25) NOT NULL,
    gateway_order_id VARCHAR(100) NOT NULL UNIQUE,
    gateway_payment_id VARCHAR(100),
    gateway_signature VARCHAR(255),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(25) NOT NULL CHECK (status IN ('CREATED', 'SUCCESS', 'FAILED', 'REFUNDED')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_status_history (
    id BIGSERIAL PRIMARY KEY,
    payment_id BIGINT NOT NULL REFERENCES payment(id) ON DELETE CASCADE,
    from_status VARCHAR(25),
    to_status VARCHAR(25) NOT NULL,
    note VARCHAR(255),
    changed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE refund (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL UNIQUE REFERENCES booking(id) ON DELETE CASCADE,
    payment_id BIGINT NOT NULL REFERENCES payment(id),
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(25) NOT NULL CHECK (status IN ('INITIATED', 'PROCESSED', 'FAILED')),
    reason VARCHAR(255),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE email_notification (
    id BIGSERIAL PRIMARY KEY,
    booking_id BIGINT NOT NULL REFERENCES booking(id) ON DELETE CASCADE,
    recipient_email VARCHAR(150) NOT NULL,
    subject VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('PENDING', 'SENT', 'FAILED')),
    retry_count INT NOT NULL DEFAULT 0,
    last_error VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE audit_log (
    id BIGSERIAL PRIMARY KEY,
    action_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id BIGINT NOT NULL,
    actor_user_id BIGINT NOT NULL REFERENCES app_user(id),
    old_value TEXT,
    new_value TEXT,
    reason VARCHAR(500),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
