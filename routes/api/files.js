const express = require("express");
const fileUpload = require("express-fileupload");
const moment = require("moment");

const folder = "./public/files";
const fs = require("fs");

const router = new express.Router();
router.use(fileUpload());

router.get("/", (req, res) => {
  fs.readdir(req.query.folder ? req.query.folder : folder, (err, files) => {
    res.status(200).json(files);
  });
});

router.post("/upload", (req, res) => {
  let uploadFile = req.files.file;
  let uploadFolder = folder;
  if (req.body.type && req.body.type === "logo") {
    uploadFolder = "./public/companyLogos";
  } else if (req.body.type && req.body.type === "news") {
    uploadFolder = "./public/news";
  }
  const fileName = `${moment().format("DD.MM.YYYY_HH_mm_ss")}_${
    req.files.file.name
  }`;
  uploadFile.mv(`${uploadFolder}/${fileName}`, function (err) {
    if (err) {
      return res.status(500).send(err);
    }

    res.status(200).json({
      file: `${uploadFolder}/${fileName}`,
    });
  });
});

router.get("/download", (req, res) => {
  let file = `${req.query.folder ? req.query.folder : folder}/${
    req.query.file
  }`;
  res.download(file);
});

router.get("/delete", (req, res) => {
  let file = `${req.query.folder ? req.query.folder : folder}/${
    req.query.file
  }`;
  fs.unlink(file, function () {
    res.status(200).json({ status: "deleted" });
  });
});

module.exports = router;
