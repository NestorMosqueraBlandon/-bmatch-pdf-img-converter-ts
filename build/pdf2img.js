"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const fetch = (...args) => Promise.resolve().then(() => tslib_1.__importStar(require('node-fetch'))).then(({ default: fetch }) => fetch(args));
const is_url_1 = tslib_1.__importDefault(require("is-url"));
const pdfjs = tslib_1.__importStar(require("pdfjs-dist/legacy/build/pdf.js"));
const canvas_1 = tslib_1.__importDefault(require("canvas"));
const fs_1 = tslib_1.__importDefault(require("fs"));
const assert_1 = tslib_1.__importDefault(require("assert"));
const util_1 = tslib_1.__importDefault(require("util"));
const readFile = util_1.default.promisify(fs_1.default.readFile);
class NodeCanvasFactory {
    create(width, height, pageNumbers) {
        (0, assert_1.default)(width > 0 && height > 0, "Invalid canvas size");
        const canvas = canvas_1.default.createCanvas(width, height);
        const context = canvas.getContext("2d");
        return {
            canvas,
            context,
        };
    }
    reset(canvasAndContext, width, height) {
        (0, assert_1.default)(canvasAndContext.canvas, "Canvas is not specified");
        (0, assert_1.default)(width > 0 && height > 0, "Invalid canvas size");
        canvasAndContext.canvas.width = width;
        canvasAndContext.canvas.height = height;
    }
    destroy(canvasAndContext) {
        (0, assert_1.default)(canvasAndContext.canvas, "Canvas is not specified");
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
const convert = async (pdf, conversionConfig) => {
    let data = pdf;
    if (typeof pdf === "string") {
        // Support for URL input
        if ((0, is_url_1.default)(pdf) ||
            pdf.startsWith("moz-extension://") ||
            pdf.startsWith("chrome-extension://") ||
            pdf.startsWith("file://")) {
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
    }
    else if (Buffer.isBuffer(pdf)) {
        data = new Uint8Array(pdf);
    }
    else if (typeof pdf !== "object") {
        return pdf;
    }
    // At this point, we want to convert the pdf data into a 2D array representing
    // the images (indexed like array[page][pixel])
    const outputPages = [];
    const loadingTask = await pdfjs.getDocument({ data: data, disableFontFace: true, verbosity: 0 });
    const pdfDocument = await loadingTask?.promise;
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
            let currentPage = await doc_render(pdfDocument, i, canvasFactory, conversionConfig);
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
async function doc_render(pdfDocument, pageNo, canvasFactory, conversionConfig) {
    // Page number sanity check
    if (pageNo < 1 || pageNo > pdfDocument.numPages) {
        console.error("Invalid page number " + pageNo);
        return;
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
    let canvasAndContext = canvasFactory.create(viewport.width, viewport.height);
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
const PDF2img = async (input, options) => {
    const pages = [];
    var convertedImages = await convert(input, options);
    return convertedImages;
};
exports.default = PDF2img;
//# sourceMappingURL=pdf2img.js.map