import { PDFDocument, PDFRawStream, PDFName, PDFNumber, PDFRef } from 'pdf-lib';
import browserImageCompression from 'browser-image-compression';
import * as pdfjs from 'pdfjs-dist';

// Configure the worker for pdfjs-dist from CDN to avoid bundler issues [1, 6]
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

/**
 * Helper to compress raw JPEG bytes using HTML5 Canvas API [3].
 * This downsamples the image and re-encodes it at the specified quality [3].
 */
function compressJpegBytes(
  bytes: Uint8Array,
  quality: number,
  scale: number
): Promise<{ bytes: Uint8Array; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([bytes as any], { type: 'image/jpeg' });
    const url = URL.createObjectURL(blob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      // Calculate downsampled width and height
      const newWidth = Math.max(1, Math.round(img.width * scale));
      const newHeight = Math.max(1, Math.round(img.height * scale));
      canvas.width = newWidth;
      canvas.height = newHeight;

      // Draw the image onto the Canvas (effectively downsampling and stripping metadata) [3]
      ctx.drawImage(img, 0, 0, newWidth, newHeight);

      // Re-encode image to JPEG at target quality [3]
      canvas.toBlob(
        (compressedBlob) => {
          if (!compressedBlob) {
            reject(new Error('Canvas conversion to blob failed'));
            return;
          }

          const reader = new FileReader();
          reader.onloadend = () => {
            const arrayBuffer = reader.result as ArrayBuffer;
            resolve({
              bytes: new Uint8Array(arrayBuffer),
              width: newWidth,
              height: newHeight,
            });
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(compressedBlob);
        },
        'image/jpeg',
        quality
      );
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image in Canvas: ${String(e)}`));
    };

    img.src = url;
  });
}

/**
 * Core function to compress images using browser-image-compression [1].
 */
export async function compressImage(
  file: File,
  level: 1 | 2 | 3,
  stripMetadata: boolean,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  // Set parameters according to the selected compression level
  let maxSizeMB = 10;
  let maxWidthOrHeight = 4096;
  let initialQuality = 0.9;

  if (level === 2) {
    maxSizeMB = 2;
    maxWidthOrHeight = 2048;
    initialQuality = 0.7; // Medium Quality [1]
  } else if (level === 3) {
    maxSizeMB = 0.5;
    maxWidthOrHeight = 1024;
    initialQuality = 0.4; // Low Quality / Maximum Compression [1]
  }

  const options = {
    maxSizeMB,
    maxWidthOrHeight,
    useWebWorker: true,
    initialQuality,
    preserveExif: !stripMetadata, // Strip EXIF metadata if selected [3]
    onProgress: onProgress ? (progress: number) => onProgress(progress) : undefined,
  };

  const compressedFile = await browserImageCompression(file, options);
  return compressedFile;
}

/**
 * Core function to compress PDF files on Client-side (In-place method).
 * It traverses the PDF objects, extracts JPEG images, compresses them, and strips metadata [2, 4].
 */
export async function compressPdfInPlace(
  file: File,
  level: 1 | 2 | 3,
  stripMetadata: boolean,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  // Load the PDF document using pdf-lib [2]
  const pdfDoc = await PDFDocument.load(arrayBuffer);

  // Strip metadata if requested [4]
  if (stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setCreator('');
    pdfDoc.setProducer('');
    pdfDoc.setKeywords([]);

    try {
      // Clear document information dictionary (/Info) [4]
      const infoRef = pdfDoc.catalog.get(PDFName.of('Info'));
      if (infoRef instanceof PDFRef) {
        pdfDoc.context.delete(infoRef);
      }
      pdfDoc.catalog.delete(PDFName.of('Info'));

      // Clear XMP metadata stream from catalog (/Metadata) [4]
      const catalog = pdfDoc.catalog;
      if (catalog.has(PDFName.of('Metadata'))) {
        const metadataRef = catalog.get(PDFName.of('Metadata'));
        if (metadataRef instanceof PDFRef) {
          pdfDoc.context.delete(metadataRef);
        }
        catalog.delete(PDFName.of('Metadata'));
      }
    } catch (e) {
      console.warn('Failed to strip catalog metadata:', e);
    }
  }

  // Set parameters according to the selected compression level
  let quality = 0.9;
  let scale = 1.0;

  if (level === 2) {
    quality = 0.7; // ~144 DPI equivalent, medium JPEG quality
    scale = 0.7;
  } else if (level === 3) {
    quality = 0.4; // ~72 DPI equivalent, low JPEG quality, high compression
    scale = 0.4;
  }

  // Enumerate all indirect objects in the PDF [2]
  const enumeratedIndirectObjects = pdfDoc.context.enumerateIndirectObjects();
  const totalObjects = enumeratedIndirectObjects.length;
  let processedObjects = 0;

  for (const [, pdfObject] of enumeratedIndirectObjects) {
    processedObjects++;
    if (onProgress && processedObjects % 10 === 0) {
      onProgress(Math.round((processedObjects / totalObjects) * 85)); // Leave 15% for saving
    }

    if (!(pdfObject instanceof PDFRawStream)) continue;

    const { dict } = pdfObject;
    const subtype = dict.get(PDFName.of('Subtype'));
    const filter = dict.get(PDFName.of('Filter'));

    // We look for JPEG image streams (/Subtype: /Image, /Filter: /DCTDecode) [2]
    if (subtype === PDFName.of('Image') && filter === PDFName.of('DCTDecode')) {
      try {
        const originalBytes = pdfObject.contents;

        // Compress the image bytes [3]
        const { bytes: compressedBytes, width: newWidth, height: newHeight } =
          await compressJpegBytes(originalBytes, quality, scale);

        // Only overwrite if the compressed bytes are actually smaller
        if (compressedBytes.length < originalBytes.length) {
          (pdfObject as any).contents = compressedBytes;

          // Update width, height, and length in the PDF object dictionary [2]
          dict.set(PDFName.of('Width'), PDFNumber.of(newWidth));
          dict.set(PDFName.of('Height'), PDFNumber.of(newHeight));
          dict.set(PDFName.of('Length'), PDFNumber.of(compressedBytes.length));
        }
      } catch (err) {
        console.error('Error compressing embedded JPEG image:', err);
      }
    }
  }

  if (onProgress) onProgress(90);

  // Save the PDF using object stream compression to reduce structural overhead [2]
  const savedBytes = await pdfDoc.save({ useObjectStreams: true });

  if (onProgress) onProgress(100);

  return new Blob([savedBytes as any], { type: 'application/pdf' });
}

/**
 * Alternative function to compress PDF files by Rasterizing page-by-page.
 * Renders pages using pdfjs-dist and compiles them into a new document with pdf-lib [2].
 * Useful for scanned documents or complex vector PDFs to achieve max compression.
 */
export async function compressPdfByRasterization(
  file: File,
  level: 1 | 2 | 3,
  onProgress?: (progress: number) => void
): Promise<Blob> {
  const arrayBuffer = await file.arrayBuffer();
  // Load PDF with pdfjs-dist [2]
  const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;
  const numPages = pdf.numPages;

  // Create new pdf-lib PDF [2]
  const pdfDoc = await PDFDocument.create();

  // Define scaling and JPEG quality depending on level
  let scale = 1.0;
  let quality = 0.4;

  if (level === 1) {
    scale = 2.5; // High resolution rendering (~180 DPI)
    quality = 0.85;
  } else if (level === 2) {
    scale = 1.8; // Medium resolution rendering (~130 DPI)
    quality = 0.7;
  } else if (level === 3) {
    scale = 1.0; // Low resolution rendering (~72 DPI)
    quality = 0.4;
  }

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);

    // Get page viewport at specified scale
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas context not available');

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
      canvas: canvas,
    };
    
    // Render the page to Canvas [3]
    await page.render(renderContext).promise;

    // Convert page Canvas to JPEG data URL [3]
    const imgDataUrl = await new Promise<string>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Canvas toBlob failed'));
            return;
          }
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        },
        'image/jpeg',
        quality
      );
    });

    // Embed and draw page image [2]
    const pageImage = await pdfDoc.embedJpg(imgDataUrl);
    const newPage = pdfDoc.addPage([viewport.width / scale, viewport.height / scale]);
    newPage.drawImage(pageImage, {
      x: 0,
      y: 0,
      width: viewport.width / scale,
      height: viewport.height / scale,
    });

    if (onProgress) {
      onProgress(Math.round((pageNum / numPages) * 90));
    }
  }

  // Save document
  const savedBytes = await pdfDoc.save({ useObjectStreams: true });
  if (onProgress) onProgress(100);

  return new Blob([savedBytes as any], { type: 'application/pdf' });
}
