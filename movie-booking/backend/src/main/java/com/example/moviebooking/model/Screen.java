package com.example.moviebooking.model;

import jakarta.persistence.*;

@Entity
@Table(name = "screen", uniqueConstraints = {
    @UniqueConstraint(name = "uk_theatre_screen_name", columnNames = {"theatre_id", "name"})
})
public class Screen {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "theatre_id", nullable = false)
    private Theatre theatre;

    @Column(nullable = false, length = 80)
    private String name;

    @Column(name = "total_seats", nullable = false)
    private int totalSeats;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public Theatre getTheatre() { return theatre; }
    public void setTheatre(Theatre theatre) { this.theatre = theatre; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public int getTotalSeats() { return totalSeats; }
    public void setTotalSeats(int totalSeats) { this.totalSeats = totalSeats; }
}
