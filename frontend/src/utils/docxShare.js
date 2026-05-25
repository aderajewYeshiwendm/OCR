import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

function base64ToBytes(base64) {
  const binary = globalThis.atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export async function shareDocxFromBase64(docxBase64, filename = "journal_ocr.docx") {
  const file = new File(Paths.cache, filename);
  file.write(base64ToBytes(docxBase64));

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error("Sharing is not available on this device");
  }

  await Sharing.shareAsync(file.uri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    dialogTitle: "Export journal to Word",
  });

  return file.uri;
}
