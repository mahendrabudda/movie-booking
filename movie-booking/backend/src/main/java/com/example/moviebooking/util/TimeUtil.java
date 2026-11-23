package com.example.moviebooking.util;

import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;

public final class TimeUtil {

    public static final ZoneId IST_ZONE = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter IST_FORMATTER =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm a 'IST'").withZone(IST_ZONE);

    private TimeUtil() {}

    public static String formatIst(Instant utcInstant) {
        if (utcInstant == null) return "";
        return IST_FORMATTER.format(utcInstant);
    }
}
