package com.example.moviebooking.util;

import com.example.moviebooking.model.Booking;
import com.lowagie.text.*;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import org.springframework.stereotype.Component;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

@Component
public class PdfTicketGenerator {

    private final QrCodeHelper qrCodeHelper;

    public PdfTicketGenerator(QrCodeHelper qrCodeHelper) {
        this.qrCodeHelper = qrCodeHelper;
    }

    public byte[] generateTicketPdf(Booking booking, List<String> seatLabels) {
        try {
            ByteArrayOutputStream out = new ByteArrayOutputStream();
            Document document = new Document(PageSize.A5, 28, 28, 28, 28);
            PdfWriter.getInstance(document, out);
            document.open();

            Font titleFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(20, 40, 80));
            Font labelFont = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, Color.DARK_GRAY);
            Font valueFont = FontFactory.getFont(FontFactory.HELVETICA, 10, Color.BLACK);

            Paragraph header = new Paragraph("MOVIE E-TICKET", titleFont);
            header.setAlignment(Element.ALIGN_CENTER);
            header.setSpacingAfter(14f);
            document.add(header);

            PdfPTable table = new PdfPTable(2);
            table.setWidthPercentage(100);
            table.setWidths(new float[]{1.2f, 2.0f});

            addRow(table, "Booking Reference:", booking.getBookingReference(), labelFont, valueFont);
            addRow(table, "Movie:", booking.getShow().getMovie().getTitle(), labelFont, valueFont);
            addRow(table, "Theatre:", booking.getShow().getScreen().getTheatre().getName()
                    + " (" + booking.getShow().getScreen().getTheatre().getCity() + ")", labelFont, valueFont);
            addRow(table, "Screen:", booking.getShow().getScreen().getName(), labelFont, valueFont);
            addRow(table, "Show Time (IST):", TimeUtil.formatIst(booking.getShow().getStartTime()), labelFont, valueFont);
            addRow(table, "Seats:", String.join(", ", seatLabels), labelFont, valueFont);
            addRow(table, "Total Paid:", "INR " + booking.getTotalAmount(), labelFont, valueFont);

            document.add(table);

            if (booking.getQrToken() != null) {
                byte[] qrPng = qrCodeHelper.generateQrPngBytes(booking.getQrToken(), 150, 150);
                Image qrImage = Image.getInstance(qrPng);
                qrImage.setAlignment(Element.ALIGN_CENTER);
                qrImage.setSpacingBefore(14f);
                document.add(qrImage);

                Paragraph qrCaption = new Paragraph("Present this QR code at the theatre entrance for one-time check-in.", valueFont);
                qrCaption.setAlignment(Element.ALIGN_CENTER);
                document.add(qrCaption);
            }

            document.close();
            return out.toByteArray();
        } catch (Exception ex) {
            throw new RuntimeException("Failed to generate PDF ticket", ex);
        }
    }

    private void addRow(PdfPTable table, String label, String value, Font labelFont, Font valueFont) {
        PdfPCell c1 = new PdfPCell(new Phrase(label, labelFont));
        c1.setPadding(6f);
        c1.setBorderColor(Color.LIGHT_GRAY);
        PdfPCell c2 = new PdfPCell(new Phrase(value != null ? value : "-", valueFont));
        c2.setPadding(6f);
        c2.setBorderColor(Color.LIGHT_GRAY);
        table.addCell(c1);
        table.addCell(c2);
    }
}
