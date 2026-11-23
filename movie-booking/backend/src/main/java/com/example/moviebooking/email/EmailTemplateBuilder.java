package com.example.moviebooking.email;

import com.example.moviebooking.model.Booking;
import com.example.moviebooking.util.TimeUtil;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class EmailTemplateBuilder {

    public String buildTicketConfirmationHtml(Booking booking, List<String> seatLabels) {
        return """
            <!DOCTYPE html>
            <html>
            <body style="font-family: Arial, sans-serif; color: #1e293b; line-height: 1.5;">
                <div style="max-width: 560px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 20px;">
                    <h2 style="color: #0f172a; margin-top: 0;">Booking Confirmed!</h2>
                    <p>Hi <strong>%s</strong>, your movie ticket booking is confirmed. Your PDF e-ticket with QR code is attached.</p>
                    <table style="width: 100%%; border-collapse: collapse; margin: 16px 0;">
                        <tr><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;"><strong>Booking Ref</strong></td><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">%s</td></tr>
                        <tr><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;"><strong>Movie</strong></td><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">%s</td></tr>
                        <tr><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;"><strong>Theatre & Screen</strong></td><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">%s - %s</td></tr>
                        <tr><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;"><strong>Showtime (IST)</strong></td><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">%s</td></tr>
                        <tr><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;"><strong>Seats</strong></td><td style="padding: 6px; border-bottom: 1px solid #e2e8f0;">%s</td></tr>
                        <tr><td style="padding: 6px;"><strong>Total Paid</strong></td><td style="padding: 6px;">INR %s</td></tr>
                    </table>
                    <p style="font-size: 12px; color: #64748b;">Present the QR code on the attached PDF ticket at the theatre entrance.</p>
                </div>
            </body>
            </html>
            """.formatted(
                booking.getUser().getFullName(),
                booking.getBookingReference(),
                booking.getShow().getMovie().getTitle(),
                booking.getShow().getScreen().getTheatre().getName(),
                booking.getShow().getScreen().getName(),
                TimeUtil.formatIst(booking.getShow().getStartTime()),
                String.join(", ", seatLabels),
                booking.getTotalAmount()
        );
    }
}
