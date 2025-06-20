const express = require("express")
const router = express.Router()
const categoryController = require("../controller/categoryController")
const { auth, adminAuth } = require("../middleware/auth")

// Public routes
router.get("/", categoryController.getAllCategories)
router.get("/:id", categoryController.getCategoryById)

// Admin routes - with file upload middleware
router.post("/", adminAuth, categoryController.upload.single("category_image"), categoryController.createCategory)
router.put("/:id", adminAuth, categoryController.upload.single("category_image"), categoryController.updateCategory)
router.delete("/:id", adminAuth, categoryController.deleteCategory)

module.exports = router
