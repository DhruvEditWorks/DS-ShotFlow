"use client";

export function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export async function uploadImageWithPreview(file: File, folder = "ds-shotflow") {
  const preview = await fileToDataUrl(file);

  try {
    const signatureResponse = await fetch("/api/uploads/signature", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ folder })
    });

    if (!signatureResponse.ok) return preview;

    const signature = (await signatureResponse.json()) as {
      timestamp: number;
      signature: string;
      apiKey: string;
      cloudName: string;
      upload_preset?: string;
      folder: string;
    };

    const formData = new FormData();
    formData.append("file", file);
    formData.append("api_key", signature.apiKey);
    formData.append("timestamp", String(signature.timestamp));
    formData.append("signature", signature.signature);
    formData.append("folder", signature.folder);
    if (signature.upload_preset) formData.append("upload_preset", signature.upload_preset);

    const upload = await fetch(`https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });

    if (!upload.ok) return preview;
    const result = (await upload.json()) as { secure_url?: string };
    return result.secure_url || preview;
  } catch {
    return preview;
  }
}
