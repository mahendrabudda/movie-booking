package com.example.moviebooking.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

import java.math.BigDecimal;
import java.util.HashMap;
import java.util.Map;

@Configuration
@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private final Jwt jwt = new Jwt();
    private final Ticket ticket = new Ticket();
    private final Mail mail = new Mail();
    private final MlService mlService = new MlService();
    private final Payment payment = new Payment();
    private final Booking booking = new Booking();
    private final Pricing pricing = new Pricing();

    public static class Jwt {
        private String secret = "dev-only-jwt-secret-key-change-in-prod-9876543210abcdef";
        private long expirationMs = 3600000L;
        public String getSecret() { return secret; }
        public void setSecret(String secret) { this.secret = secret; }
        public long getExpirationMs() { return expirationMs; }
        public void setExpirationMs(long expirationMs) { this.expirationMs = expirationMs; }
    }

    public static class Ticket {
        private String qrSecret = "dev-only-qr-hmac-secret-key-change-in-prod-1234567890";
        public String getQrSecret() { return qrSecret; }
        public void setQrSecret(String qrSecret) { this.qrSecret = qrSecret; }
    }

    public static class Mail {
        private String from = "no-reply@moviebooking.local";
        private int maxRetries = 3;
        public String getFrom() { return from; }
        public void setFrom(String from) { this.from = from; }
        public int getMaxRetries() { return maxRetries; }
        public void setMaxRetries(int maxRetries) { this.maxRetries = maxRetries; }
    }

    public static class MlService {
        private String url = "http://localhost:8000";
        private int timeoutMs = 5000;
        public String getUrl() { return url; }
        public void setUrl(String url) { this.url = url; }
        public int getTimeoutMs() { return timeoutMs; }
        public void setTimeoutMs(int timeoutMs) { this.timeoutMs = timeoutMs; }
    }

    public static class Payment {
        private String provider = "MOCK";
        private String mockSecret = "dev-mock-payment-hmac-secret-key";
        private String razorpayKeyId = "rzp_test_placeholder";
        private String razorpayKeySecret = "rzp_test_secret_placeholder";
        public String getProvider() { return provider; }
        public void setProvider(String provider) { this.provider = provider; }
        public String getMockSecret() { return mockSecret; }
        public void setMockSecret(String mockSecret) { this.mockSecret = mockSecret; }
        public String getRazorpayKeyId() { return razorpayKeyId; }
        public void setRazorpayKeyId(String razorpayKeyId) { this.razorpayKeyId = razorpayKeyId; }
        public String getRazorpayKeySecret() { return razorpayKeySecret; }
        public void setRazorpayKeySecret(String razorpayKeySecret) { this.razorpayKeySecret = razorpayKeySecret; }
    }

    public static class Booking {
        private int holdExpiryMinutes = 5;
        private int cancellationCutoffHours = 2;
        private BigDecimal convenienceFeePercent = new BigDecimal("5.0");
        private BigDecimal gstPercent = new BigDecimal("18.0");
        public int getHoldExpiryMinutes() { return holdExpiryMinutes; }
        public void setHoldExpiryMinutes(int holdExpiryMinutes) { this.holdExpiryMinutes = holdExpiryMinutes; }
        public int getCancellationCutoffHours() { return cancellationCutoffHours; }
        public void setCancellationCutoffHours(int cancellationCutoffHours) { this.cancellationCutoffHours = cancellationCutoffHours; }
        public BigDecimal getConvenienceFeePercent() { return convenienceFeePercent; }
        public void setConvenienceFeePercent(BigDecimal convenienceFeePercent) { this.convenienceFeePercent = convenienceFeePercent; }
        public BigDecimal getGstPercent() { return gstPercent; }
        public void setGstPercent(BigDecimal gstPercent) { this.gstPercent = gstPercent; }
    }

    public static class Pricing {
        private BigDecimal defaultMinPrice = new BigDecimal("100.00");
        private BigDecimal singleScreenDefaultMax = new BigDecimal("350.00");
        private BigDecimal multiplexDefaultMax = new BigDecimal("450.00");
        private Map<String, BigDecimal> multipliers = new HashMap<>();
        public BigDecimal getDefaultMinPrice() { return defaultMinPrice; }
        public void setDefaultMinPrice(BigDecimal defaultMinPrice) { this.defaultMinPrice = defaultMinPrice; }
        public BigDecimal getSingleScreenDefaultMax() { return singleScreenDefaultMax; }
        public void setSingleScreenDefaultMax(BigDecimal singleScreenDefaultMax) { this.singleScreenDefaultMax = singleScreenDefaultMax; }
        public BigDecimal getMultiplexDefaultMax() { return multiplexDefaultMax; }
        public void setMultiplexDefaultMax(BigDecimal multiplexDefaultMax) { this.multiplexDefaultMax = multiplexDefaultMax; }
        public Map<String, BigDecimal> getMultipliers() { return multipliers; }
        public void setMultipliers(Map<String, BigDecimal> multipliers) { this.multipliers = multipliers; }
    }

    public Jwt getJwt() { return jwt; }
    public Ticket getTicket() { return ticket; }
    public Mail getMail() { return mail; }
    public MlService getMlService() { return mlService; }
    public Payment getPayment() { return payment; }
    public Booking getBooking() { return booking; }
    public Pricing getPricing() { return pricing; }
}
