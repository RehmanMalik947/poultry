const bwipjs = require('bwip-js');

/**
 * SKU se barcode image (Buffer) generate karne ke liye
 */
exports.generateBarcodeBuffer = async (text, type = 'code128') => {
    try {
        const buffer = await bwipjs.toBuffer({
            bcid: type,       // Barcode type (code128, ean13, etc.)
            text: text,       // SKU value
            scale: 3,         // Resolution/Scale
            height: 10,       // Bar height
            includetext: true, // Show human-readable text below bars
            textxalign: 'center',
        });
        return buffer;
    } catch (err) {
        console.error('Barcode Generation Error:', err);
        throw err;
    }
};