const express = require("express")
const router = express.Router()
const orderController = require("../controller/orderController")
const { auth, adminAuth } = require("../middleware/auth")

// ===============================
// ALL STATIC ROUTES FIRST
// ===============================

// User basic routes
router.post("/place", auth, orderController.placeOrder)
router.get("/myorders", auth, orderController.getUserOrders)

// User replacement routes (static)
router.get("/replacements/my", auth, orderController.getMyReplacementRequests)

// Admin replacement routes (static - before /:orderId)
router.get("/replacements", adminAuth, orderController.getReplacementRequests)
router.put("/replacements/:id/status", adminAuth, orderController.updateReplacementStatus)
router.post("/replacements", adminAuth, orderController.createReplacementForUser)

// User cancellation routes (static - CRITICAL)
router.get("/cancellations/my", auth, orderController.getMyCancellationRequests)

// Admin cancellation routes (static - before /:orderId)
router.get("/cancellations", adminAuth, orderController.getCancellationRequests)
router.put("/cancellations/:id/status", adminAuth, orderController.updateCancellationStatus)

// Other static routes
router.get("/user/:userId", orderController.getOrdersByUser)
router.put("/user/:userId/mark-seen", adminAuth, orderController.markOrdersAsSeen)
router.get("/admin/unseen-count", adminAuth, orderController.getUnseenOrdersCount)
router.get("/receipt/:orderId", orderController.downloadReceipt)
router.post("/shiprocket-order", orderController.createShiprocketOrder)
router.get("/", adminAuth, orderController.getAllOrders)

// ===============================
// DYNAMIC ROUTES WITH SPECIFIC ACTIONS
// ===============================

// User creates replacement request
router.post("/return/:orderId", auth, orderController.createReplacementRequest)

// User creates cancellation request (CRITICAL - specific path)
router.post("/:orderId/cancel-request", auth, orderController.createCancellationRequest)

// User directly cancels
router.post("/:orderId/cancel", auth, orderController.cancelOrderByUser)

// Admin updates order
router.put("/:orderId/status", adminAuth, orderController.updateOrderStatus)

// ===============================
// CATCH-ALL (LAST)
// ===============================

// Get specific order (MUST BE LAST)
router.get("/:orderId", auth, orderController.getOrderById)

module.exports = router
