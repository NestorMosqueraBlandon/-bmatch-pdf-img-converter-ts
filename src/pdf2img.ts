const fetch = (...args:any) => import('node-fetch').then(({default: fetch}) => fetch(args));
import isURL from "is-url";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.js";
import Canvas from "canvas";
import fs from "fs";
import assert from "assert";
import util from "util";

const readFile = util.promisify(fs.readFile);
interface CanvasAndContext {
  canvas: Canvas.Canvas;
  context: Canvas.CanvasRenderingContext2D;
}

class NodeCanvasFactory {
  create(width: number, height: number, pageNumbers: any[]): CanvasAndContext {
    assert(width > 0 && height > 0, "Invalid canvas size");
    const canvas = Canvas.createCanvas(width, height);
    const context = canvas.getContext("2d") as Canvas.CanvasRenderingContext2D;
    return {
      canvas,
      context,
    };
  }

  reset(canvasAndContext: CanvasAndContext, width: number, height: number) {
    assert(canvasAndContext.canvas, "Canvas is not specified");
    assert(width > 0 && height > 0, "Invalid canvas size");
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: CanvasAndContext) {
    assert(canvasAndContext.canvas, "Canvas is not specified");
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
    // canvasAndContext.canvas = undefined;
    // canvasAndContext.context = undefined;
  }
}

/**
 * Converts a PDF file to an image.
 * @param pdf Path to the PDF file.
 * @param conversionConfig Configuration options for the conversion.
 * @returns Promise that resolves with the path to the converted image.
 */
const convert = async (
  pdf: string | Buffer | Uint8Array,
  conversionConfig: { width: number, height: number, pageNumbers: any[], base64: any }
): Promise<Uint8Array[]> => {
  let data = pdf;
  if (typeof pdf === "string") {
    // Support for URL input
    if (
      isURL(pdf) ||
      pdf.startsWith("moz-extension://") ||
      pdf.startsWith("chrome-extension://") ||
      pdf.startsWith("file://")
    ) {
      const resp = await fetch(pdf);
      data = new Uint8Array(await resp.arrayBuffer());
    }
    // Support for base64 encoded pdf input
    else if (/data:pdf\/([a-zA-Z]*);base64,([^"]*)/.test(pdf)) {
      data = new Uint8Array(Buffer.from(pdf.split(",")[1] || "", "base64"));
    }
    // Support for filepath input
    else {
      data = new Uint8Array(await readFile(pdf));
     
    }
  } else if (Buffer.isBuffer(pdf)) {
    data = new Uint8Array(pdf);
  } else if (typeof pdf !== "object") {
    return pdf;
  }
  
   // At this point, we want to convert the pdf data into a 2D array representing
    // the images (indexed like array[page][pixel])
    const outputPages: Uint8Array[] = [];
    const loadingTask = await pdfjs.getDocument({ data: data, disableFontFace: true, verbosity: 0 });
    
    const pdfDocument = await loadingTask?.promise

    const canvasFactory = new NodeCanvasFactory();

    if (conversionConfig.height <= 0 || conversionConfig.width <= 0)
        console.error("Negative viewport dimension given. Defaulting to 100% scale.");

    // If there are page numbers supplied in the conversion config
    if (conversionConfig.pageNumbers)
        for (let i = 0; i < conversionConfig.pageNumbers.length; i++) {
            // This just pushes a render of the page to the array
            let currentPage = await doc_render(pdfDocument, conversionConfig.pageNumbers[i], canvasFactory, conversionConfig);
            if (currentPage != null) {
                // This allows for base64 conversion of output images
                if (conversionConfig.base64)
                    outputPages.push(currentPage.toString('base64'));
                else
                    outputPages.push(new Uint8Array(currentPage));
            }
        }
    // Otherwise just loop the whole doc
    else
        for (let i = 1; i <= pdfDocument?.numPages; i++) {
            let currentPage = await doc_render(pdfDocument, i, canvasFactory, conversionConfig)
            if (currentPage != null) {
                // This allows for base64 conversion of output images
                if (conversionConfig.base64)
                    outputPages.push(currentPage.toString('base64'));
                else
                    outputPages.push(new Uint8Array(currentPage));
            }
        }

  
  return outputPages;
};


async function doc_render(pdfDocument: any, pageNo:any, canvasFactory:any, conversionConfig:any) {

 // Page number sanity check
 if (pageNo < 1 || pageNo > pdfDocument.numPages) {
     console.error("Invalid page number " + pageNo);
     return
 }

 // Get the page
 let page = await pdfDocument.getPage(pageNo);

 // Create a viewport at 100% scale
 let outputScale = 1.0;
 let viewport = page.getViewport({ scale: outputScale });

 // Scale it up / down dependent on the sizes given in the config (if there
 // are any)
 if (conversionConfig.width)
     outputScale = conversionConfig.width / viewport.width;
 else if (conversionConfig.height)
     outputScale = conversionConfig.height / viewport.height;
 if (outputScale != 1 && outputScale > 0)
     viewport = page.getViewport({ scale: outputScale });

 let canvasAndContext = canvasFactory.create(
     viewport.width,
     viewport.height
 );

 let renderContext = {
     canvasContext: canvasAndContext.context,
     viewport: viewport,
     canvasFactory: canvasFactory
 };

 let renderTask = await page.render(renderContext).promise;

 // Convert the canvas to an image buffer.
 let image = canvasAndContext.canvas.toBuffer();

 return image;
} // doc_render


const PDF2img = async (input:any, options:any) => {
 const pages = [];
 var convertedImages = await convert(input, options);
 return convertedImages;
}

export default PDF2img;