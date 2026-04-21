const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

function testFont(fontFileName, outFileName) {
    try {
        const doc = new PDFDocument();
        const fontPath = path.join(__dirname, 'public', 'fonts', fontFileName);
        doc.pipe(fs.createWriteStream(outFileName));
        doc.registerFont('TestFont', fontPath);
        doc.font('TestFont');
        doc.text('Rupee is here: ₹100');
        doc.end();
        console.log(`Success for ${fontFileName}`);
    } catch (e) {
        console.error(`Error for ${fontFileName}:`, e.message);
    }
}

testFont('Roboto-Rupee.ttf', 'test_rupee.pdf');
testFont('Roboto-Regular.ttf', 'test_regular.pdf');
