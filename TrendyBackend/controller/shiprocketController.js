const { getAllOrders, trackOrder, createOrder } = require("../services/shiprocketService")
const Order = require("../models/Order")

// GET /api/shiprocket/orders
// Return a paginated list of orders from Shiprocket
exports.fetchShiprocketOrders = async (req, res) => {
  try {
    const { page = 1, per_page = 10 } = req.query
    const orders = await getAllOrders(page, per_page)
    return res.status(200).json(orders)
  } catch (err) {
    console.error("Error fetching Shiprocket orders:", err.message)
    return res.status(500).json({ message: "Error fetching Shiprocket orders", error: err.message })
  }
}

// GET /api/shiprocket/track/:awb
// Track an order by AWB number
exports.fetchTracking = async (req, res) => {
  try {
    const { awb } = req.params
    const tracking = await trackOrder(awb)
    return res.status(200).json(tracking)
  } catch (err) {
    console.error("Error tracking Shiprocket order:", err.message)
    return res.status(500).json({ message: "Error tracking order", error: err.message })
  }
}

// POST /api/shiprocket/orders/shiprocket-order
// Create a new order in Shiprocket. Expects full payload in req.body.
exports.createShiprocketOrder = async (req, res) => {
  try {
    const result = await createOrder(req.body)
    return res.status(200).json({ success: true, data: result })
  } catch (err) {
    console.error("Error creating Shiprocket order:", err.message)
    return res.status(500).json({ success: false, message: err.message })
  }
}
