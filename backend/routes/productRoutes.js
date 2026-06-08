const express = require("express");
const router = express.Router();
const productController = require("../controllers/productController");
const { protectStaffOrOrganization } = require("../middleware/authMiddleware");
const { product } = require("../middleware/validation");
const { generateBarcodeBuffer } = require('../utils/barCodeGenerator');

const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadRoot = path.join(__dirname, "..", "uploads", "products");
fs.mkdirSync(uploadRoot, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadRoot);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext);
    const unique = `${base}-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, unique);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.get('/barcode/:sku', async (req, res) => {
  try {
    const { sku } = req.params;
    const barcodeBuffer = await generateBarcodeBuffer(sku);

    res.writeHead(200, { 'Content-Type': 'image/png' });
    res.end(barcodeBuffer);
  } catch (error) {
    res.status(500).json({ success: false, message: "Barcode generation failed" });
  }
});

router.use(protectStaffOrOrganization);

router.get("/search", productController.searchProducts);
router.get("/next-sku", productController.getNextSku);
router.get("/", productController.getAllProducts);
router.post("/", upload.any(), product.create, productController.createProduct);
router.get("/:id", productController.getProductById);
router.put("/:id", upload.any(), product.update, productController.updateProduct);
router.delete("/:id", productController.deleteProduct);


module.exports = router;