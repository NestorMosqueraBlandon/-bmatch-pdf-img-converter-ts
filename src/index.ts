import PDF2img from './pdf2img';

const main = async(pathPdf?: any, width?: number, height?:number) => { 
 const images =  await PDF2img(pathPdf, {
  width,
  height
 });
 
 return images;
}

main();