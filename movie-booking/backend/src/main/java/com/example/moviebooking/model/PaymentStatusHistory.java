package com.example.moviebooking.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "payment_status_history")
public class PaymentStatusHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 25)
    private PaymentStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", nullable = false, length = 25)
    private PaymentStatus toStatus;

    @Column(length = 255)
    private String note;

    @Column(name = "changed_at", nullable = false)
    private Instant changedAt = Instant.now();

    public PaymentStatusHistory() {}

    public PaymentStatusHistory(Payment payment, PaymentStatus fromStatus, PaymentStatus toStatus, String note) {
        this.payment = payment;
        this.fromStatus = fromStatus;
        this.toStatus = toStatus;
        this.note = note;
        this.changedAt = Instant.now();
    }

    public Long getId() { return id; }
    public Payment getPayment() { return payment; }
    public PaymentStatus getFromStatus() { return fromStatus; }
    public PaymentStatus getToStatus() { return toStatus; }
    public String getNote() { return note; }
    public Instant getChangedAt() { return changedAt; }
}
