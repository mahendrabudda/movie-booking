package com.example.moviebooking.repository;

import com.example.moviebooking.model.ShowSeat;
import com.example.moviebooking.model.ShowSeatStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.List;

public interface ShowSeatRepository extends JpaRepository<ShowSeat, Long> {

    List<ShowSeat> findByShowIdOrderBySeatRowLabelAscSeatSeatNumberAsc(Long showId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ss FROM ShowSeat ss JOIN FETCH ss.seat WHERE ss.show.id = :showId AND ss.seat.id IN :seatIds ORDER BY ss.seat.id ASC")
    List<ShowSeat> findAndLockByShowIdAndSeatIds(@Param("showId") Long showId, @Param("seatIds") List<Long> seatIds);

    @Modifying
    @Query("""
        UPDATE ShowSeat ss
        SET ss.status = 'AVAILABLE', ss.heldBy = null, ss.holdExpiresAt = null, ss.lockedPrice = null
        WHERE ss.status = 'HELD' AND ss.holdExpiresAt < :now
    """)
    int releaseExpiredHolds(@Param("now") Instant now);

    long countByShowIdAndStatus(Long showId, ShowSeatStatus status);
}
