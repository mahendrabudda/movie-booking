package com.example.moviebooking.service;

import com.example.moviebooking.config.AppProperties;
import com.example.moviebooking.util.QrCodeHelper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.UUID;

/**
 * Optional Razorpay test-mode gateway enabled when app.payment.provider=RAZORPAY.
 */
@Component
@ConditionalOnProperty(name = "app.payment.provider", havingValue = "RAZORPAY")
public class RazorpayPaymentGateway implements PaymentGateway {

    private final String keySecret;

    public RazorpayPaymentGateway(AppProperties appProperties) {
        this.keySecret = appProperties.getPayment().getRazorpayKeySecret();
    }

    @Override
    public String getProviderName() {
        return "RAZORPAY";
    }

    @Override
    public GatewayOrder createOrder(String bookingReference, BigDecimal amount) {
        String orderId = "order_rzp_" + UUID.randomUUID().toString().replace("-", "").substring(0, 14);
        return new GatewayOrder("RAZORPAY", orderId, amount, null);
    }

    @Override
    public boolean verifySignature(String orderId, String paymentId, String signature) {
        String expected = QrCodeHelper.hmacSha256(orderId + "|" + paymentId, keySecret);
        return expected.equals(signature);
    }
}
