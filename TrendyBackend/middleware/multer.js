const multer = require("multer")
const { CloudinaryStorage } = require("multer-storage-cloudinary")
const cloudinary = require("cloudinary").v2

// Configure Cloudinary directly here to ensure it's available
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// Test Cloudinary connection
const testConnection = async () => {
  try {
    const result = await cloudinary.api.ping()
    console.log("✅ Cloudinary connection successful in multer:", result)
  } catch (error) {
    console.error("❌ Cloudinary connection failed in multer:", error)
  }
}

// Test connection on startup
testConnection()

// Setup Cloudinary storage for multer - Products
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "getTrendy/products",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    resource_type: "image",
    // transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
    public_id: (req, file) => {
      // Generate unique filename
      const timestamp = Date.now()
      const originalName = file.originalname.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_")
      return `product_${timestamp}_${originalName}`
    },
  },
})

// Setup Cloudinary storage for multer - Categories
const categoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "getTrendy/categories",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    resource_type: "image",
    // transformation: [{ width: 400, height: 400, crop: "limit", quality: "auto" }],
    public_id: (req, file) => {
      const timestamp = Date.now()
      const originalName = file.originalname.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_")
      return `category_${timestamp}_${originalName}`
    },
  },
})

// Setup Cloudinary storage for multer - SubCategories
const subCategoryStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "getTrendy/subcategories",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    resource_type: "image",
    // transformation: [{ width: 400, height: 400, crop: "limit", quality: "auto" }],
    public_id: (req, file) => {
      const timestamp = Date.now()
      const originalName = file.originalname.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_")
      return `subcategory_${timestamp}_${originalName}`
    },
  },
})

// Setup Cloudinary storage for multer - General uploads
const generalStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "getTrendy/general",
    allowed_formats: ["jpg", "jpeg", "png", "webp", "gif", "avif"],
    resource_type: "image",
    transformation: [{ quality: "auto" }],
    public_id: (req, file) => {
      const timestamp = Date.now()
      const originalName = file.originalname.split(".")[0].replace(/[^a-zA-Z0-9]/g, "_")
      return `general_${timestamp}_${originalName}`
    },
  },
})

const productUpload = multer({
  storage: productStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 3, // Maximum 3 files
  },
  fileFilter: (req, file, cb) => {
    // Check file type
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

const categoryUpload = multer({
  storage: categoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

const subCategoryUpload = multer({
  storage: subCategoryStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

const generalUpload = multer({
  storage: generalStorage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Only image files are allowed!"), false)
    }
  },
})

module.exports = {
  productUpload,
  categoryUpload,
  subCategoryUpload,
  generalUpload,
}
