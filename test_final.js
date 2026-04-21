const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

try {
    const doc = new PDFDocument();
    doc.pipe(fs.createWriteStream('test_final.pdf'));
    doc.registerFont('Roboto', path.join(__dirname, 'public', 'fonts', 'Roboto-Regular.ttf'));
    doc.font('Roboto');
    doc.text('Rupee: ₹100');
    doc.on('error', (err) => {
        console.error('PDFKit async error:', err);
    });
    doc.end();
    console.log('PDF generation finished sync part.');
} catch (e) {
    console.error('Caught error: ', e);
}
