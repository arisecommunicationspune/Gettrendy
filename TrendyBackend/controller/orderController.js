const Order = require("../models/Order")
const Cart = require("../models/Cart")
const User = require("../models/User")
const Product = require("../models/Product")
const mongoose = require("mongoose")
const PDFDocument = require("pdfkit")
const shiprocketService = require("../services/shiprocketService")
const { sendOrderConfirmationToUser, sendNewOrderNotificationToAdmin } = require("../services/emailService")
const crypto = require("crypto")
const ReplacementRequest = require("../models/ReplacementRequest")
const CancellationRequest = require("../models/CancellationRequest")

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

function isOrderCancelEligible(order) {
  const currentStatus = order.orderStatus || order.status
  if (["shipped", "delivered", "cancelled",  "returned", "completed"].includes(currentStatus)) {
    return { ok: false, reason: currentStatus }
  }
  const created = new Date(order.createdAt).getTime()
  if (Date.now() - created > TWO_DAYS_MS) {
    return { ok: false, reason: "window_expired" }
  }
  return { ok: true }
}

const placeOrder = async (req, res) => {
  try {
    const userId = req.user._id
    const { items, totalAmount, paymentMethod, address, notes } = req.body

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: "Order items are required" })
    }
    if (!totalAmount || totalAmount <= 0) {
      return res.status(400).json({ success: false, message: "Valid total amount is required" })
    }
    if (!address || !address.fullName || !address.street || !address.city || !address.phone) {
      return res.status(400).json({ success: false, message: "Complete address information is required" })
    }

    const user = await User.findById(userId)
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" })
    }

    for (const item of items) {
      if (!mongoose.Types.ObjectId.isValid(item.productId)) {
        return res.status(400).json({ success: false, message: `Invalid product ID: ${item.productId}` })
      }
      const product = await Product.findById(item.productId)
      if (!product) {
        return res.status(404).json({ success: false, message: `Product not found: ${item.productName}` })
      }
    }

    // Normalize payment method
const paymentMethodNormalized =
  paymentMethod === "RAZORPAY" ? "RAZORPAY" : paymentMethod || "CASH"

    const orderId = `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`

    const order = new Order({
      orderId,
      userId,
      userName: user.name,
      userEmail: user.email,
      items: items.map((i) => ({
        productId: i.productId,
        productName: i.productName,
        quantity: i.quantity,
        price: i.price,
        size: i.size || "M",
        color: i.color || "Default",
      })),
      totalAmount,
     paymentMethod: paymentMethodNormalized,
     paymentStatus: paymentMethodNormalized === "CASH" ? "paid" : "pending",
      status: "pending",
      orderStatus: "pending",
      address: {
        fullName: address.fullName,
        street: address.street,
        apartment: address.apartment || "",
        city: address.city,
        state: address.state || "",
        postcode: address.postcode,
        phone: address.phone,
        email: address.email,
        country: address.country || "India",
      },
      notes: notes || "",
    })

    await order.save()

    if (paymentMethod === "CASH") {
      try {
        const emailToSend = address.email || user.email
        await sendOrderConfirmationToUser(emailToSend, order)
        await sendNewOrderNotificationToAdmin(order)
        order.userEmailSent = true
        order.adminEmailSent = true
        order.userNotified = true
        order.adminNotified = true
        await order.save()
      } catch (err) {
        console.error("Email error:", err.message)
      }

      try {
        const shiprocketPayload = {
          order_id: order.orderId,
          order_date: new Date().toISOString(),
          pickup_location: "Warehouse",
          billing_customer_name: String(order.address.fullName),
          billing_last_name: "",
          billing_address: String(order.address.street),
          billing_city: String(order.address.city),
          billing_pincode: String(order.address.postcode),
          billing_state: String(order.address.state),
          billing_country: String(order.address.country),
          billing_email: String(order.address.email),
          billing_phone: String(order.address.phone),
          order_items: order.items.map((i) => ({
            name: String(i.productName),
            sku:
              typeof i.productId === "object" && i.productId !== null && i.productId._id
                ? String(i.productId._id)
                : String(i.productId),
            units: Number(i.quantity),
            selling_price: Number(i.price),
          })),
          payment_method: "COD",
          sub_total: Number(order.totalAmount),
          length: 10,
          breadth: 10,
          height: 10,
          weight: 1.0,
        }

        const shipRes = await shiprocketService.createOrder(shiprocketPayload)
        if (shipRes && shipRes.order_id) {
          order.shiprocketOrderId = shipRes.order_id
          order.shiprocketShipmentId = shipRes.shipment_id
          order.trackingNumber = shipRes.awb_code
          await order.save()
        }
      } catch (shipErr) {
        console.error("Shiprocket sync error:", shipErr.message)
      }
    }

    await Cart.findOneAndDelete({ userId })

    res.status(201).json({
      success: true,
      message: paymentMethod === "CASH" ? "COD order placed successfully" : "Online order created (awaiting payment)",
      data: order,
      orderId: order.orderId,
    })
  } catch (error) {
    console.error("Place order error:", error)
    res.status(500).json({ success: false, message: "Error placing order", error: error.message })
  }
}

const verifyPayment = async (req, res) => {
  try {
    const { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(razorpayOrderId + "|" + razorpayPaymentId)
      .digest("hex")

    if (expectedSignature !== razorpaySignature) {
      return res.status(400).json({ success: false, message: "Invalid Razorpay signature" })
    }

    const order = await Order.findOne({ orderId })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    order.paymentStatus = "paid"
    order.razorpayOrderId = razorpayOrderId
    order.razorpayPaymentId = razorpayPaymentId
    order.razorpaySignature = razorpaySignature
    await order.save()

    const emailToSend = order.address.email || order.userEmail
    await sendOrderConfirmationToUser(emailToSend, order)
    await sendNewOrderNotificationToAdmin(order)
    order.userEmailSent = true
    order.adminEmailSent = true
    order.userNotified = true
    order.adminNotified = true
    await order.save()

    try {
      const shiprocketPayload = {
        order_id: String(order.orderId),
        order_date: new Date().toISOString(),
        pickup_location: "Warehouse",
        billing_customer_name: String(order.address.fullName),
        billing_last_name: "",
        billing_address: String(order.address.street),
        billing_city: String(order.address.city),
        billing_pincode: String(order.address.postcode),
        billing_state: String(order.address.state),
        billing_country: String(order.address.country),
        billing_email: String(order.address.email),
        billing_phone: String(order.address.phone),
        order_items: order.items.map((i) => ({
          name: String(i.productName),
          sku:
            typeof i.productId === "object" && i.productId !== null && i.productId._id
              ? String(i.productId._id)
              : String(i.productId),
          units: Number(i.quantity),
          selling_price: Number(i.price),
        })),
        payment_method: "Prepaid",
        sub_total: Number(order.totalAmount),
        length: 10,
        breadth: 10,
        height: 10,
        weight: 1.0,
      }

      const shipRes = await shiprocketService.createOrder(shiprocketPayload)
      if (shipRes && shipRes.order_id) {
        order.shiprocketOrderId = shipRes.order_id
        order.shiprocketShipmentId = shipRes.shipment_id
        order.trackingNumber = shipRes.awb_code
        await order.save()
      }
    } catch (shipErr) {
      console.error("Shiprocket sync error:", shipErr.message)
    }

    res.json({ success: true, message: "Payment verified & order confirmed", order })
  } catch (err) {
    console.error("Verify payment error:", err)
    res.status(500).json({ success: false, message: "Error verifying payment" })
  }
}

const cancelOrderByUser = async (req, res) => {
  try {
    console.log("=== cancelOrderByUser ===")
    const userId = req.user._id
    const { orderId } = req.params
    console.log("userId:", userId)
    console.log("orderId:", orderId)

    const order = await Order.findOne({
      userId,
      $or: [{ orderId: orderId }, { _id: orderId }],
    })

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const eligible = isOrderCancelEligible(order)
    if (!eligible.ok) {
      const msg =
        eligible.reason === "window_expired"
          ? "Cancellation window (2 days) has expired"
          : `Order cannot be cancelled in '${eligible.reason}' status`
      return res.status(400).json({ success: false, message: msg })
    }

    order.status = "cancelled"
    order.orderStatus = "cancelled"
    order.cancelledAt = new Date()
    await order.save()

    return res.json({ success: true, message: "Order cancelled successfully", order })
  } catch (err) {
    console.error("cancelOrderByUser error:", err)
    res.status(500).json({ success: false, message: "Failed to cancel order" })
  }
}

const createCancellationRequest = async (req, res) => {
  try {
    console.log("=== createCancellationRequest START ===")
    const userId = req.user._id
    const { orderId } = req.params
    const { reason, note } = req.body

    console.log("Request params:", { userId, orderId, reason, note })

    if (!reason || reason.trim().length < 3) {
      console.log("Validation failed: reason too short")
      return res.status(400).json({ success: false, message: "Reason is required (min 3 chars)" })
    }

    const order = await Order.findOne({
      userId,
      $or: [{ _id: orderId }, { orderId }],
    })

    console.log("Order found:", order ? order._id : "NOT FOUND")

    if (!order) {
      console.log("Order not found in database")
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const eligible = isOrderCancelEligible(order)
    console.log("Eligibility:", eligible)

    if (!eligible.ok) {
      const msg =
        eligible.reason === "window_expired"
          ? "Cancellation window (2 days) has expired"
          : `Order cannot be cancelled in '${eligible.reason}' status`
      console.log("Not eligible:", msg)
      return res.status(400).json({ success: false, message: msg })
    }

    const existing = await CancellationRequest.findOne({ orderId: order._id, userId })
    console.log("Existing request:", existing ? existing._id : "NONE")

    if (existing) {
      console.log("Request already exists")
      return res.status(400).json({ success: false, message: "Cancellation request already submitted for this order" })
    }

    const reqDoc = await CancellationRequest.create({
      orderId: order._id,
      userId,
      reason,
      note: note || "",
      status: "pending",
    })

    console.log("Cancellation request created successfully:", reqDoc._id)
    console.log("=== createCancellationRequest END ===")

    return res.status(201).json({ success: true, message: "Cancellation request created", data: reqDoc })
  } catch (error) {
    console.error("=== createCancellationRequest ERROR ===", error)
    return res
      .status(500)
      .json({ success: false, message: "Failed to create cancellation request", error: error.message })
  }
}

const getMyCancellationRequests = async (req, res) => {
  try {
    console.log("=== getMyCancellationRequests ===")
    const userId = req.user._id
    console.log("userId:", userId)

    const rows = await CancellationRequest.find({ userId })
      .populate({ path: "orderId", select: "orderId createdAt totalAmount status orderStatus" })
      .sort({ createdAt: -1 })

    console.log("Found cancellation requests:", rows.length)

    return res.json({ success: true, rows })
  } catch (error) {
    console.error("getMyCancellationRequests error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Failed to get cancellation requests", error: error.message })
  }
}

const getCancellationRequests = async (req, res) => {
  try {
    console.log("=== getCancellationRequests (admin) ===")
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10
    const skip = (page - 1) * limit

    console.log("Query params:", { page, limit, skip })

    const rows = await CancellationRequest.find({})
      .populate({ path: "orderId", select: "orderId totalAmount createdAt userId status orderStatus" })
      .populate({ path: "userId", select: "name email" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const count = await CancellationRequest.countDocuments()

    console.log("Found admin cancellation requests:", rows.length, "total:", count)

    return res.json({ success: true, rows, count, pages_count: Math.ceil(count / limit), current_page: page })
  } catch (error) {
    console.error("getCancellationRequests error:", error)
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch cancellation requests", error: error.message })
  }
}

const updateCancellationStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    if (!["pending", "in_progress", "approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" })
    }

    const doc = await CancellationRequest.findById(id).populate({ path: "orderId" })
    if (!doc) {
      return res.status(404).json({ success: false, message: "Cancellation request not found" })
    }

    if (status === "approved") {
      const order = doc.orderId
      if (!order) {
        return res.status(404).json({ success: false, message: "Order not found for this request" })
      }

      const eligible = isOrderCancelEligible(order)
      if (!eligible.ok) {
        const msg =
          eligible.reason === "window_expired"
            ? "Cancellation window (2 days) has expired"
            : `Order cannot be cancelled in '${eligible.reason}' status`
        return res.status(400).json({ success: false, message: msg })
      }

      order.status = "cancelled"
      order.orderStatus = "cancelled"
      order.cancelledAt = new Date()
      await order.save()

      doc.status = "approved"
      doc.resolvedAt = new Date()
      await doc.save()

      return res.json({ success: true, message: "Request approved and order cancelled", request: doc })
    }

    doc.status = status
    if (status === "rejected" || status === "approved") {
      doc.resolvedAt = new Date()
    } else {
      doc.resolvedAt = undefined
    }
    await doc.save()

    return res.json({ success: true, request: doc })
  } catch (error) {
    console.error("updateCancellationStatus error:", error)
    return res.status(500).json({ success: false, message: "Failed to update cancellation request" })
  }
}

const getUserOrders = async (req, res) => {
  try {
    const userId = req.user._id
    const page = Number.parseInt(req.query.page) || 1
    const limit = Number.parseInt(req.query.limit) || 10
    const skip = (page - 1) * limit

    const orders = await Order.find({ userId })
      .populate("items.productId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const totalOrders = await Order.countDocuments({ userId })
    const totalPages = Math.ceil(totalOrders / limit)

    res.status(200).json({
      success: true,
      orders,
      count: totalOrders,
      pages_count: totalPages,
      current_page: page,
    })
  } catch (error) {
    console.error("Get user orders error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching orders",
      error: error.message,
    })
  }
}

const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params
    const userId = req.user._id

    const order = await Order.findOne({
      $or: [{ _id: orderId }, { orderId: orderId }],
      userId,
    }).populate("items.productId")

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    res.status(200).json({ success: true, data: order })
  } catch (error) {
    console.error("Get order by ID error:", error)
    res.status(500).json({
      success: false,
      message: "Error fetching order",
      error: error.message,
    })
  }
}

const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params
    const { status, paymentStatus } = req.body

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    if (status) {
      order.status = status
      order.orderStatus = status
      if (status === "cancelled") {
        order.cancelledAt = new Date()
      }
    }
    if (paymentStatus) {
      order.paymentStatus = paymentStatus
    }

    await order.save()

    res.status(200).json({
      success: true,
      message: "Order updated successfully",
      data: order,
    })
  } catch (error) {
    console.error("Update order status error:", error)
    res.status(500).json({
      success: false,
      message: "Error updating order",
      error: error.message,
    })
  }
}

const getOrdersByUser = async (req, res) => {
  try {
    const userId = req.params.userId
    const orders = await Order.find({ userId }).populate("items.productId").sort({ createdAt: -1 })
    res.json({ success: true, orders })
  } catch (error) {
    console.error("getOrdersByUser error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const getAllOrders = async (req, res) => {
  try {
    const orders = await Order.find({}).populate("userId").populate("items.productId").sort({ createdAt: -1 })
    res.status(200).json({ success: true, orders })
  } catch (error) {
    console.error("Get all orders error:", error)
    res.status(500).json({ success: false, message: error.message })
  }
}

const markOrdersAsSeen = async (req, res) => {
  try {
    const { userId } = req.params
    await Order.updateMany({ userId, seenByAdmin: false }, { $set: { seenByAdmin: true } })
    res.json({ success: true })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error marking orders as seen",
      error: error.message,
    })
  }
}

const getUnseenOrdersCount = async (req, res) => {
  try {
    const count = await Order.countDocuments({ seenByAdmin: false })
    res.json({ success: true, count })
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error getting unseen orders count",
      error: error.message,
    })
  }
}

const downloadReceipt = async (req, res) => {
  try {
    const { orderId } = req.params
    const order = await Order.findOne({ orderId }).populate("items.productId")

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader("Content-Disposition", `attachment; filename=receipt_${orderId}.pdf`)

    const doc = new PDFDocument()
    doc.pipe(res)

    doc.fontSize(20).text("Order Receipt", { align: "center" })
    doc.moveDown()

    doc.fontSize(12).text(`Order ID: ${order.orderId}`)
    doc.text(`Date: ${new Date(order.createdAt).toLocaleString()}`)
    doc.text(`Customer: ${order.address.fullName}`)
    doc.text(`Email: ${order.address.email}`)
    doc.text(
      `Address: ${order.address.street}, ${order.address.city}, ${order.address.postcode}, ${order.address.country}`,
    )

    doc.moveDown()
    doc.text("Items:", { underline: true })
    order.items.forEach((item, idx) => {
      doc.text(`${idx + 1}. ${item.productName} x${item.quantity} - ₹${item.price}`)
    })

    doc.moveDown()
    doc.text(`Total: ₹${order.totalAmount}`, { bold: true })

    doc.end()
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error generating receipt",
      error: error.message,
    })
  }
}

const createShiprocketOrder = async (req, res) => {
  try {
    const orderData = req.body

    if (!orderData.order_id || !orderData.billing_customer_name || !orderData.billing_phone) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields for Shiprocket order",
      })
    }

    const result = await shiprocketService.createOrder(orderData)

    if (result && result.order_id) {
      try {
        await Order.findOneAndUpdate(
          { orderId: orderData.order_id },
          {
            shiprocketOrderId: result.order_id,
            shiprocketShipmentId: result.shipment_id,
            trackingNumber: result.awb_code,
          },
        )
      } catch (updateError) {
        console.error("Error updating order with Shiprocket details:", updateError)
      }
    }

    res.json({ success: true, data: result })
  } catch (error) {
    console.error("Shiprocket order creation error:", error)
    res.status(500).json({
      success: false,
      message: error.message || "Failed to create Shiprocket order",
    })
  }
}

const createReplacementRequest = async (req, res) => {
  try {
    const userId = req.user._id
    const { orderId } = req.params
    const { productId, reason, note } = req.body

    if (!reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: "Reason is required (min 3 chars)" })
    }

    const order = await Order.findOne({
      $or: [{ _id: orderId }, { orderId }],
      userId,
    })
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const existing = await ReplacementRequest.findOne({
      orderId: order._id,
      productId: productId || null,
      userId,
    })
    if (existing) {
      return res.status(400).json({ success: false, message: "This product/order already has a replacement request" })
    }

    const request = await ReplacementRequest.create({
      orderId: order._id,
      productId: productId || undefined,
      userId,
      reason,
      note: note || "",
    })
    return res.status(201).json({ success: true, message: "Replacement request created", data: request })
  } catch (error) {
    console.error("createReplacementRequest error:", error)
    return res.status(500).json({ success: false, message: "Failed to create replacement request" })
  }
}

const createReplacementForUser = async (req, res) => {
  try {
    const { orderId, userId, productId, reason, note } = req.body
    if (!orderId || !userId || !reason || reason.trim().length < 3) {
      return res.status(400).json({ success: false, message: "orderId, userId and reason (min 3 chars) are required" })
    }

    let orderRef = orderId
    if (!mongoose.isValidObjectId(orderId)) {
      const orderDoc = await Order.findOne({ orderId })
      if (!orderDoc) {
        return res.status(404).json({ success: false, message: "Order not found" })
      }
      orderRef = orderDoc._id
    }

    const existing = await ReplacementRequest.findOne({
      orderId: orderRef,
      productId: productId || null,
      userId,
    })
    if (existing) {
      return res.status(400).json({ success: false, message: "Replacement already exists for this order/product/user" })
    }

    const request = await ReplacementRequest.create({
      orderId: orderRef,
      userId,
      productId: productId || undefined,
      reason,
      note: note || "",
    })

    return res.status(201).json({ success: true, message: "Replacement request created (admin)", data: request })
  } catch (error) {
    console.error("createReplacementForUser error:", error)
    return res.status(500).json({ success: false, message: "Failed to create replacement request" })
  }
}

const getReplacementRequests = async (req, res) => {
  const page = Number(req.query.page) || 1
  const limit = Number(req.query.limit) || 10
  const skip = (page - 1) * limit

  try {
    const rows = await ReplacementRequest.find({})
      .populate({ path: "orderId", select: "orderId totalAmount createdAt userId" })
      .populate({ path: "userId", select: "name email" })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const count = await ReplacementRequest.countDocuments()

    return res.json({ success: true, rows, count, pages_count: Math.ceil(count / limit), current_page: page })
  } catch (err) {
    console.error("getReplacementRequests error:", err)
    return res.status(500).json({ success: false, message: "Failed to fetch replacement requests" })
  }
}

const updateReplacementStatus = async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body

    const allowed = ["pending", "in_progress", "approved", "rejected", "resolved"]
    if (!allowed.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" })
    }

    const replacement = await ReplacementRequest.findByIdAndUpdate(id, { status }, { new: true })
    return res.json({ success: true, replacement })
  } catch (err) {
    console.error("updateReplacementStatus error:", err)
    res.status(500).json({ success: false, message: err.message })
  }
}

const getMyReplacementRequests = async (req, res) => {
  try {
    const userId = req.user._id

    const requests = await ReplacementRequest.find({ userId })
      .populate({ path: "orderId", select: "orderId totalAmount createdAt" })
      .sort({ createdAt: -1 })

    return res.json({ success: true, data: requests })
  } catch (error) {
    console.error("getMyReplacementRequests error:", error)
    return res.status(500).json({ success: false, message: "Failed to get replacement requests" })
  }
}

module.exports = {
  placeOrder,
  verifyPayment,
  getUserOrders,
  getOrderById,
  updateOrderStatus,
  getOrdersByUser,
  getAllOrders,
  markOrdersAsSeen,
  getUnseenOrdersCount,
  downloadReceipt,
  createShiprocketOrder,
  cancelOrderByUser,
  createCancellationRequest,
  getMyCancellationRequests,
  getCancellationRequests,
  updateCancellationStatus,
  createReplacementRequest,
  createReplacementForUser,
  getReplacementRequests,
  updateReplacementStatus,
  getMyReplacementRequests,
}
