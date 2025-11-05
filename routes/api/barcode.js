const express = require('express');
const bwipjs = require('bwip-js');
const fs = require("fs");

const router = new express.Router();

const path = "./public/images/barcodes"
 
router.get('/', (req, res) => {
	const barcode = req.query.barcode
	const scale = req.query.OS === 'Linux'?7:2
	bwipjs.toBuffer({
        bcid:        'code128',       // Barcode type
        text:        barcode,    // Text to encode
        scale:       scale,               // 3x scaling factor
        height:      15,              // Bar height, in millimeters
        includetext: true,            // Show human-readable text
        textxalign:  'center',        // Always good to set this
    }, function (err, png) {
        if (err) {
			return res.status(500).json("bwip-js error");
		} else {			
			res.writeHead(200, {'Content-Type': 'image/png'});				
			res.end(Buffer.from(png).toString('base64')); // Send the file data to the browser.

        }
    });
});

module.exports = router;
