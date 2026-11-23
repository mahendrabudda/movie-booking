package com.example.moviebooking.util;

import com.example.moviebooking.config.AppProperties;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import org.springframework.stereotype.Component;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Base64;

@Component
public class QrCodeHelper {

    private final String qrSecret;

    public QrCodeHelper(AppProperties appProperties) {
        this.qrSecret = appProperties.getTicket().getQrSecret();
    }

    /**
     * Generates a signed QR token containing only booking reference, show ID, and timestamp
     * (no personal data), signed with HMAC-SHA256.
     */
    public String generateSignedToken(String bookingReference, Long showId, long issuedAtEpochSec) {
        String payload = bookingReference + "|" + showId + "|" + issuedAtEpochSec;
        String signature = hmacSha256(payload, qrSecret);
        String combined = payload + "|" + signature;
        return Base64.getUrlEncoder().withoutPadding()
                .encodeToString(combined.getBytes(StandardCharsets.UTF_8));
    }

    /**
     * Verifies the HMAC-SHA256 signature of a QR token and returns the booking reference.
     */
    public String verifyAndExtractBookingRef(String token) {
        try {
            String decoded = new String(Base64.getUrlDecoder().decode(token), StandardCharsets.UTF_8);
            String[] parts = decoded.split("\\|");
            if (parts.length != 4) {
                throw new IllegalArgumentException("Malformed QR token");
            }
            String payload = parts[0] + "|" + parts[1] + "|" + parts[2];
            String expectedSig = hmacSha256(payload, qrSecret);
            if (! expectedSig.equals(parts[3])) {
                throw new IllegalArgumentException("Invalid QR token signature");
            }
            return parts[0];
        } catch (Exception ex) {
            throw new IllegalArgumentException("Invalid or tampered QR ticket token", ex);
        }
    }

    public byte[] generateQrPngBytes(String content, int width, int height) {
        try {
            QRCodeWriter writer = new QRCodeWriter();
            BitMatrix bitMatrix = writer.encode(content, BarcodeFormat.QR_CODE, width, height);
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(bitMatrix, "PNG", out);
            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate QR code image", ex);
        }
    }

    public static String hmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            byte[] raw = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(raw);
        } catch (Exception ex) {
            throw new RuntimeException("HMAC calculation failed", ex);
        }
    }
}
