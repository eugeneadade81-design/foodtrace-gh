package com.foodtrace.api.service;

import com.foodtrace.api.config.AppProperties;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.MultiFormatWriter;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import org.springframework.stereotype.Service;

@Service
public class QrCodeService {
  private final String uploadsDir;
  private final String publicApiUrl;

  public QrCodeService(AppProperties properties) {
    this.uploadsDir = properties.uploadsDir() != null ? properties.uploadsDir() : "uploads";
    this.publicApiUrl = properties.publicApiUrl() != null && !properties.publicApiUrl().isBlank()
        ? properties.publicApiUrl()
        : "http://localhost:3000";
  }

  public String generateAndSave(String codeString) {
    try {
      BitMatrix matrix = new MultiFormatWriter().encode(codeString, BarcodeFormat.QR_CODE, 300, 300);
      Path dir = Paths.get(uploadsDir, "qr");
      Files.createDirectories(dir);
      String filename = codeString.replaceAll("[^A-Za-z0-9_-]", "_") + ".png";
      Path file = dir.resolve(filename);
      try (OutputStream out = Files.newOutputStream(file)) {
        MatrixToImageWriter.writeToStream(matrix, "PNG", out);
      }
      return publicApiUrl + "/uploads/qr/" + filename;
    } catch (Exception e) {
      return null;
    }
  }
}
