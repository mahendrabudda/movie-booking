package com.example.moviebooking.service;

import com.example.moviebooking.config.AppProperties;
import com.example.moviebooking.util.QrCodeHelper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Default Mock Payment Gateway for development and portfolio demonstration.
 * Uses server-side HMAC-SHA256 verification.
 */
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "MOCK", matchIfMissing = true)
public class MockPaymentGateway implements PaymentGateway {

    private final String mockSecret;

    public MockPaymentGateway(AppProperties appProperties) {
        this.mockSecret = appProperties.getPayment().getMockSecret();
    }

    @Override
    public String getProviderName() {
        return "MOCK";
    }

    @Override
    public GatewayOrder createOrder(String bookingReference, BigDecimal amount) {
        String orderId = "mock_order_" + bookingReference + "_" + UUID.randomUUID().toString().substring(0, 8);
        String defaultPaymentId = "mock_pay_demo";
        String sampleSignature = computeSignature(orderId, defaultPaymentId);
        return new GatewayOrder("MOCK", orderId, amount, sampleSignature);
    }

    @Override
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        if (signature == null || orderId == null || paymentId == null) {
            return false;
        }
        String expected = computeSignature(orderId, paymentId);
        return expected.equals(signature);
    }

    public String computeSignature(String orderId, String paymentId) {
        return QrCodeHelper.hmacSha256(orderId + "|" + paymentId, mockSecret);
    }
}
