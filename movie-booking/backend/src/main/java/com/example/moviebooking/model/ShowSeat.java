package com.example.moviebooking.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "show_seat", uniqueConstraints = {
    @UniqueConstraint(name = "uk_show_seat", columnNames = {"show_id", "seat_id"})
})
public class ShowSeat {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "show_id", nullable = false)
    private Show show;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "seat_id", nullable = false)
    private Seat seat;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ShowSeatStatus status = ShowSeatStatus.AVAILABLE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "held_by")
    private AppUser heldBy;

    @Column(name = "hold_expires_at")
    private Instant holdExpiresAt;

    @Column(name = "locked_price", precision = 10, scale = 2)
    private BigDecimal lockedPrice;

    @Version
    @Column(nullable = false)
    private Long version = 0L;

    public boolean isEffectivelyAvailable(Instant now) {
        if (status == ShowSeatStatus.AVAILABLE) {
            return true;
        }
        if (status == ShowSeatStatus.HELD && holdExpiresAt != null && holdExpiresAt.isBefore(now)) {
            return true;
        }
        return false;
    }

    public boolean isHeldByUser(Long userId, Instant now) {
        return status == ShowSeatStatus.HELD
                && heldBy != null
                && heldBy.getId().equals(userId)
                && holdExpiresAt != null
                && holdExpiresAt.isAfter(now);
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Show getShow() { return show; }
    public void setShow(Show show) { this.show = show; }
    public Seat getSeat() { return seat; }
    public void setSeat(Seat seat) { this.seat = seat; }
    public ShowSeatStatus getStatus() { return status; }
    public void setStatus(ShowSeatStatus status) { this.status = status; }
    public AppUser getHeldBy() { return heldBy; }
    public void setHeldBy(AppUser heldBy) { this.heldBy = heldBy; }
    public Instant getHoldExpiresAt() { return holdExpiresAt; }
    public void setHoldExpiresAt(Instant holdExpiresAt) { this.holdExpiresAt = holdExpiresAt; }
    public BigDecimal getLockedPrice() { return lockedPrice; }
    public void setLockedPrice(BigDecimal lockedPrice) { this.lockedPrice = lockedPrice; }
    public Long getVersion() { return version; }
    public void setVersion(Long version) { this.version = version; }
}
