import * as pdfjs from 'pdfjs-dist';
// Use Vite's ?url import to get the path to the worker in the build
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map((item: any) => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return fullText.trim();
}
