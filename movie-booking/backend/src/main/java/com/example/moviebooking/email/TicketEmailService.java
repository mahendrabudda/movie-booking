package com.example.moviebooking.email;

import com.example.moviebooking.config.AppProperties;
import com.example.moviebooking.model.Booking;
import com.example.moviebooking.model.BookingSeat;
import com.example.moviebooking.model.EmailNotification;
import com.example.moviebooking.model.NotificationStatus;
import com.example.moviebooking.repository.BookingRepository;
import com.example.moviebooking.repository.BookingSeatRepository;
import com.example.moviebooking.repository.EmailNotificationRepository;
import com.example.moviebooking.util.PdfTicketGenerator;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;

@Service
public class TicketEmailService {

    private static final Logger log = LoggerFactory.getLogger(TicketEmailService.class);

    private final JavaMailSender mailSender;
    private final EmailNotificationRepository notificationRepository;
    private final BookingRepository bookingRepository;
    private final BookingSeatRepository bookingSeatRepository;
    private final PdfTicketGenerator pdfTicketGenerator;
    private final EmailTemplateBuilder templateBuilder;
    private final AppProperties appProperties;

    public TicketEmailService(JavaMailSender mailSender,
                              EmailNotificationRepository notificationRepository,
                              BookingRepository bookingRepository,
                              BookingSeatRepository bookingSeatRepository,
                              PdfTicketGenerator pdfTicketGenerator,
                              EmailTemplateBuilder templateBuilder,
                              AppProperties appProperties) {
        this.mailSender = mailSender;
        this.notificationRepository = notificationRepository;
        this.bookingRepository = bookingRepository;
        this.bookingSeatRepository = bookingSeatRepository;
        this.pdfTicketGenerator = pdfTicketGenerator;
        this.templateBuilder = templateBuilder;
        this.appProperties = appProperties;
    }

    /**
     * Sends ticket confirmation asynchronously. Any SMTP failure is caught, logged,
     * and recorded as FAILED in email_notification so it NEVER breaks the booking transaction.
     */
    @Async
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendBookingConfirmationAsync(Long bookingId) {
        sendOrUpdateNotification(bookingId, null);
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void sendOrUpdateNotification(Long bookingId, EmailNotification existingNotification) {
        Booking booking = bookingRepository.findById(bookingId).orElse(null);
        if (booking == null) {
            return;
        }
        EmailNotification notification = existingNotification;
        if (notification == null) {
            notification = new EmailNotification();
            notification.setBooking(booking);
            notification.setRecipientEmail(booking.getUser().getEmail());
            notification.setSubject("Ticket Confirmed - " + booking.getBookingReference());
            notification.setStatus(NotificationStatus.PENDING);
            notification = notificationRepository.save(notification);
        }

        try {
            List<String> seatLabels = bookingSeatRepository.findByBookingId(booking.getId())
                    .stream().map(BookingSeat::getSeatLabel).toList();
            byte[] pdfBytes = pdfTicketGenerator.generateTicketPdf(booking, seatLabels);
            String html = templateBuilder.buildTicketConfirmationHtml(booking, seatLabels);

            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
            helper.setFrom(appProperties.getMail().getFrom());
            helper.setTo(notification.getRecipientEmail());
            helper.setSubject(notification.getSubject());
            helper.setText(html, true);
            helper.addAttachment("Ticket-" + booking.getBookingReference() + ".pdf",
                    new ByteArrayResource(pdfBytes));

            mailSender.send(mimeMessage);

            notification.setStatus(NotificationStatus.SENT);
            notification.setLastError(null);
            notification.setUpdatedAt(Instant.now());
            notificationRepository.save(notification);
        } catch (Exception ex) {
            log.warn("Email delivery failed for booking {}: {}", booking.getBookingReference(), ex.getMessage());
            notification.setStatus(NotificationStatus.FAILED);
            notification.setRetryCount(notification.getRetryCount() + 1);
            String errMsg = ex.getMessage() != null ? ex.getMessage() : "SMTP send error";
            notification.setLastError(errMsg.length() > 480 ? errMsg.substring(0, 480) : errMsg);
            notification.setUpdatedAt(Instant.now());
            notificationRepository.save(notification);
        }
    }

    /**
     * Scheduled retry job for FAILED email notifications (up to max-retries, default 3).
     */
    @Scheduled(fixedDelayString = "${app.mail.retry-interval-ms:60000}")
    @Transactional
    public void retryFailedEmails() {
        int maxRetries = appProperties.getMail().getMaxRetries();
        List<EmailNotification> failedList = notificationRepository
                .findByStatusAndRetryCountLessThan(NotificationStatus.FAILED, maxRetries);
        for (EmailNotification notification : failedList) {
            sendOrUpdateNotification(notification.getBooking().getId(), notification);
        }
    }
}
