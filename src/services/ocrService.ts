import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import type { OcrExtractionResult } from '../types/document';

// Configure PDF.js worker for browser execution (local bundled worker with CDN fallback)
try {
  if (typeof window !== 'undefined') {
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      pdfWorker || `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
  }
} catch {
  // worker fallback handled by pdfjs
}

export type ProgressCallback = (progress: number, status: string) => void;

/**
 * Real Document Text Extraction
 * Supports: PDF (digital & scanned), JPG, JPEG, PNG, WebP
 */
export async function extractTextFromDocument(
  file: File,
  onProgress?: ProgressCallback
): Promise<OcrExtractionResult> {
  const fileType = file.type || '';

  // Retain preview URL for user verification
  let previewUrl: string | undefined;
  try {
    previewUrl = URL.createObjectURL(file);
  } catch {
    // ignore
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const formattedSize = formatFileSize(file.size);

  const isText = fileType === 'text/plain' || file.name.toLowerCase().endsWith('.txt');
  const isPdf = !isText && (fileType.includes('pdf') || file.name.toLowerCase().endsWith('.pdf'));
  const isImage = !isText && (fileType.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name));

  // Handle plain text clinical documents or test fixtures
  if (isText) {
    if (onProgress) onProgress(20, 'Reading document text...');
    try {
      const text = await file.text();
      const trimmed = text ? text.trim() : '';
      if (onProgress) onProgress(100, 'Text extraction complete');

      if (!trimmed || trimmed.length < 15) {
        return {
          success: false,
          rawText: trimmed,
          charCount: trimmed.length,
          fileType: 'text/plain',
          fileName: file.name,
          fileSize: formattedSize,
          previewUrl,
          error:
            'Document appears unreadable or blank. Could not detect legible clinical text.',
        };
      }

      return {
        success: true,
        rawText: trimmed,
        charCount: trimmed.length,
        fileType: 'text/plain',
        fileName: file.name,
        fileSize: formattedSize,
        previewUrl,
      };
    } catch (err: any) {
      return {
        success: false,
        rawText: '',
        charCount: 0,
        fileType: 'text/plain',
        fileName: file.name,
        fileSize: formattedSize,
        previewUrl,
        error: `Failed to read document: ${err?.message || 'Read error'}`,
      };
    }
  }

  if (!isPdf && !isImage) {
    return {
      success: false,
      rawText: '',
      charCount: 0,
      fileType: file.type || 'unknown',
      fileName: file.name,
      fileSize: formattedSize,
      error: `Unsupported document format (${file.name}). Please upload a PDF, JPG, JPEG, or PNG document.`,
    };
  }

  // Handle PDF extraction
  if (isPdf) {
    return await extractFromPdf(file, formattedSize, previewUrl, onProgress);
  }

  // Handle Image OCR extraction
  return await extractFromImage(file, formattedSize, previewUrl, onProgress);
}

/**
 * Real OCR on Images using Tesseract.js
 */
async function extractFromImage(
  file: File,
  fileSize: string,
  previewUrl?: string,
  onProgress?: ProgressCallback
): Promise<OcrExtractionResult> {
  try {
    if (onProgress) onProgress(10, 'Initializing Tesseract OCR engine...');

    const result = await Tesseract.recognize(file, 'eng', {
      logger: (m) => {
        if (m.status === 'recognizing text' && onProgress) {
          const progressPercent = Math.min(95, Math.max(15, Math.round(m.progress * 100)));
          onProgress(progressPercent, `Recognizing characters (${progressPercent}%)...`);
        }
      },
    });

    const text = result.data.text ? result.data.text.trim() : '';

    if (onProgress) onProgress(100, 'OCR text extraction complete');

    if (!text || text.length < 15) {
      return {
        success: false,
        rawText: text,
        charCount: text.length,
        fileType: file.type,
        fileName: file.name,
        fileSize,
        previewUrl,
        error:
          'Document appears unreadable, blank, or excessively blurry. Optical Character Recognition could not detect legible clinical text.',
      };
    }

    return {
      success: true,
      rawText: text,
      charCount: text.length,
      fileType: file.type,
      fileName: file.name,
      fileSize,
      previewUrl,
    };
  } catch (err: any) {
    return {
      success: false,
      rawText: '',
      charCount: 0,
      fileType: file.type,
      fileName: file.name,
      fileSize,
      previewUrl,
      error: `Optical Character Recognition failed: ${err?.message || 'Unknown processing error'}`,
    };
  }
}

/**
 * Real Text Extraction from PDFs (handles both digital text layers and scanned image pages)
 */
async function extractFromPdf(
  file: File,
  fileSize: string,
  previewUrl?: string,
  onProgress?: ProgressCallback
): Promise<OcrExtractionResult> {
  try {
    if (onProgress) onProgress(10, 'Loading PDF document...');

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const numPages = pdf.numPages;

    if (onProgress) onProgress(25, `Reading PDF pages (Total: ${numPages})...`);

    // First attempt: Extract digital text layer
    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str || '')
        .join(' ');
      fullText += pageText + '\n';
    }

    fullText = fullText.trim();

    // If digital text layer is sufficient (> 30 characters), return it directly
    if (fullText.length >= 30) {
      if (onProgress) onProgress(100, 'Digital PDF text extraction complete');
      return {
        success: true,
        rawText: fullText,
        charCount: fullText.length,
        fileType: 'application/pdf',
        fileName: file.name,
        fileSize,
        previewUrl,
        isScannedPdf: false,
      };
    }

    // Otherwise, document is a SCANNED PDF: render pages to canvas and run Tesseract OCR
    if (onProgress) onProgress(35, 'Detected scanned PDF. Rendering pages for OCR...');

    let scannedOcrText = '';
    const maxPagesToOcr = Math.min(numPages, 3); // OCR first 3 pages to maintain fast performance

    for (let pageNum = 1; pageNum <= maxPagesToOcr; pageNum++) {
      if (onProgress) {
        const stepProgress = Math.round(35 + (pageNum / maxPagesToOcr) * 55);
        onProgress(stepProgress, `Running OCR on scanned page ${pageNum} of ${maxPagesToOcr}...`);
      }

      const page = await pdf.getPage(pageNum);
      const viewport = page.getViewport({ scale: 1.5 });

      if (typeof document !== 'undefined') {
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');

        if (context) {
          await (page as any).render({ canvasContext: context, viewport, canvas }).promise;

          const ocrResult = await Tesseract.recognize(canvas, 'eng');
          if (ocrResult?.data?.text) {
            scannedOcrText += ocrResult.data.text + '\n';
          }
        }
      }
    }

    scannedOcrText = scannedOcrText.trim();

    if (onProgress) onProgress(100, 'Scanned PDF OCR complete');

    if (scannedOcrText.length < 15) {
      return {
        success: false,
        rawText: scannedOcrText,
        charCount: scannedOcrText.length,
        fileType: 'application/pdf',
        fileName: file.name,
        fileSize,
        previewUrl,
        isScannedPdf: true,
        error:
          'Scanned PDF pages could not be recognized. The scan may be blank, illegible, or of insufficient resolution.',
      };
    }

    return {
      success: true,
      rawText: scannedOcrText,
      charCount: scannedOcrText.length,
      fileType: 'application/pdf',
      fileName: file.name,
      fileSize,
      previewUrl,
      isScannedPdf: true,
    };
  } catch (err: any) {
    return {
      success: false,
      rawText: '',
      charCount: 0,
      fileType: 'application/pdf',
      fileName: file.name,
      fileSize,
      previewUrl,
      error: `PDF document processing failed: ${err?.message || 'Corrupt or unreadable PDF file'}`,
    };
  }
}
