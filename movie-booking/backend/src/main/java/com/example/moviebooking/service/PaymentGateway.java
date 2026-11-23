package com.example.moviebooking.service;

import java.math.BigDecimal;

public interface PaymentGateway {

    record GatewayOrder(String provider, String orderId, BigDecimal amount, String signatureHint) {}

    String getProviderName();

    GatewayOrder createOrder(String bookingReference, BigDecimal amount);

    boolean verifySignature(String orderId, String paymentId, String signature);
}
