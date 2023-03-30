"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const pdf2img_1 = tslib_1.__importDefault(require("./pdf2img"));
const main = async (pathPdf, width, height) => {
    const images = await (0, pdf2img_1.default)(pathPdf, {
        width,
        height
    });
};
main();
//# sourceMappingURL=index.js.map