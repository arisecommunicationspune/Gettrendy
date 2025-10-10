const crypto = require("crypto")
const Razorpay = require("razorpay")
const Order = require("../models/Order")
const Cart = require("../models/Cart")
const User = require("../models/User")
const { sendOrderConfirmationToUser, sendNewOrderNotificationToAdmin } = require("../services/emailService")
const shiprocketService = require("../services/shiprocketService")

// Test endpoint to check if controller is working
const testRazorpay = async (req, res) => {
  try {
    console.log("Test endpoint called")
    console.log("Environment variables:")
    console.log("- RAZORPAY_KEY_ID:", process.env.RAZORPAY_KEY_ID ? "Present" : "Missing")
    console.log("- RAZORPAY_KEY_SECRET:", process.env.RAZORPAY_KEY_SECRET ? "Present" : "Missing")
    res.json({
      success: true,
      message: "Test endpoint working",
      environment: {
        razorpay_key_id: process.env.RAZORPAY_KEY_ID ? "Present" : "Missing",
        razorpay_key_secret: process.env.RAZORPAY_KEY_SECRET ? "Present" : "Missing",
      },
    })
  } catch (error) {
    console.error("Test endpoint error:", error)
    res.status(500).json({
      success: false,
      message: "Test endpoint failed",
      error: error.message,
    })
  }
}

// Create Razorpay order
const createRazorpayOrder = async (req, res) => {
  try {
    console.log("=== CREATE RAZORPAY ORDER START ===")
    console.log("Request body:", JSON.stringify(req.body, null, 2))
    console.log("User from middleware:", req.user)

    // Check environment variables
    if (!process.env.RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
      console.error("Missing Razorpay credentials")
      return res.status(500).json({
        success: false,
        message: "Razorpay credentials not configured",
        debug: {
          key_id: process.env.RAZORPAY_KEY_ID ? "Present" : "Missing",
          key_secret: process.env.RAZORPAY_KEY_SECRET ? "Present" : "Missing",
        },
      })
    }

    // Validate request body
    const { amount, currency = "INR", receipt } = req.body
    console.log("Extracted values:")
    console.log("- amount:", amount)
    console.log("- currency:", currency)
    console.log("- receipt:", receipt)

    if (!amount || amount <= 0) {
      console.error("Invalid amount:", amount)
      return res.status(400).json({
        success: false,
        message: "Valid amount is required",
        received_amount: amount,
      })
    }

    // Initialize Razorpay
    console.log("Initializing Razorpay...")
    let razorpay
    try {
      razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      })
      console.log("Razorpay instance created successfully")
    } catch (razorpayError) {
      console.error("Failed to create Razorpay instance:", razorpayError)
      return res.status(500).json({
        success: false,
        message: "Failed to initialize payment gateway",
        error: razorpayError.message,
      })
    }

    // Prepare order options
    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency: currency,
      receipt: receipt || `receipt_${Date.now()}`,
    }

    console.log("Order options:", JSON.stringify(options, null, 2))

    // Create order with Razorpay
    console.log("Calling Razorpay API...")
    const order = await razorpay.orders.create(options)
    console.log("Razorpay order created successfully:", JSON.stringify(order, null, 2))

    const response = {
      success: true,
      message: "Order created successfully",
      order: order,
      key_id: process.env.RAZORPAY_KEY_ID,
    }

    console.log("Sending response:", JSON.stringify(response, null, 2))
    console.log("=== CREATE RAZORPAY ORDER END ===")

    res.status(200).json(response)
  } catch (error) {
    console.error("=== CREATE RAZORPAY ORDER ERROR ===")
    console.error("Error details:", error)
    console.error("Error message:", error.message)
    console.error("Error stack:", error.stack)

    let errorMessage = "Failed to create payment order"
    let statusCode = 500

    if (error.statusCode === 401) {
      errorMessage = "Invalid Razorpay credentials"
      console.error("Authentication failed with Razorpay")
    } else if (error.statusCode === 400) {
      errorMessage = "Invalid order parameters"
      statusCode = 400
      console.error("Bad request to Razorpay API")
    }

    const errorResponse = {
      success: false,
      message: errorMessage,
      error: error.message,
      statusCode: error.statusCode,
      debug:
        process.env.NODE_ENV === "development"
          ? {
              stack: error.stack,
              razorpay_error: error,
            }
          : undefined,
    }

    console.log("Sending error response:", JSON.stringify(errorResponse, null, 2))
    console.log("=== CREATE RAZORPAY ORDER ERROR END ===")

    res.status(statusCode).json(errorResponse)
  }
}

// Verify Razorpay payment
const verifyRazorpayPayment = async (req, res) => {
  try {
    console.log("=== VERIFY RAZORPAY PAYMENT START ===")
    console.log("verifyRazorpayPayment req.body:", req.body)
    console.log("verifyRazorpayPayment req.user:", req.user)

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, orderData } = req.body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: "Missing required payment verification parameters",
      })
    }

    if (!orderData) {
      return res.status(400).json({
        success: false,
        message: "Order data is required",
      })
    }

    // Verify user is authenticated
    if (!req.user || !req.user._id) {
      return res.status(401).json({
        success: false,
        message: "User authentication required",
      })
    }

    console.log("Authenticated user ID:", req.user._id)

    // Get user details
    const user = await User.findById(req.user._id)
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      })
    }

    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body.toString())
      .digest("hex")

    const isAuthentic = expectedSignature === razorpay_signature

    if (!isAuthentic) {
      console.error("Payment signature verification failed")
      return res.status(400).json({
        success: false,
        message: "Payment verification failed",
      })
    }

    console.log("Payment signature verified successfully")

    // Validate order items
    if (!orderData.items || !Array.isArray(orderData.items) || orderData.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Order items are required",
      })
    }

    // Validate address
    if (!orderData.address || !orderData.address.fullName || !orderData.address.phone) {
      return res.status(400).json({
        success: false,
        message: "Complete address information is required",
      })
    }

    // Create order in database
    const newOrder = new Order({
      orderId: `ORD${Date.now()}${Math.floor(Math.random() * 1000)}`,
      userId: req.user._id, // Use the authenticated user's ID
      userName: user.name,
      userEmail: user.email,
      items: orderData.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        quantity: item.quantity,
        price: item.price,
        size: item.size || "M",
        color: item.color || "Default",
      })),
      totalAmount: orderData.totalAmount,
      paymentMethod: "RAZORPAY",
      paymentStatus: "paid",
      orderStatus: "processing",
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
      address: {
        fullName: orderData.address.fullName,
        street: orderData.address.street,
        apartment: orderData.address.apartment || "",
        city: orderData.address.city,
        state: orderData.address.state || "",
        postcode: orderData.address.postcode,
        phone: orderData.address.phone,
        email: orderData.address.email || user.email, // Use address email or fallback to user email
        country: orderData.address.country || "India",
      },
      notes: orderData.notes || "",
    })

    console.log("About to save order:", JSON.stringify(newOrder, null, 2))

    const savedOrder = await newOrder.save()
    console.log("Order saved successfully:", savedOrder._id)

    // Send emails
    try {
      // Use address email if provided, otherwise use user's registered email
      const emailToSend = orderData.address.email || user.email
      console.log("Sending confirmation email to:", emailToSend)

      // Send confirmation email to user
      const userEmailResult = await sendOrderConfirmationToUser(emailToSend, savedOrder)
      if (userEmailResult.success) {
        savedOrder.userEmailSent = true
        savedOrder.userNotified = true
        console.log("User email sent successfully")
      } else {
        console.error("Failed to send user email:", userEmailResult.error)
      }

      // Send notification email to admin
      const adminEmailResult = await sendNewOrderNotificationToAdmin(savedOrder)
      if (adminEmailResult.success) {
        savedOrder.adminEmailSent = true
        savedOrder.adminNotified = true
        console.log("Admin email sent successfully")
      } else {
        console.error("Failed to send admin email:", adminEmailResult.error)
      }

      await savedOrder.save()
      console.log("Order updated with email status")
    } catch (emailError) {
      console.error("Error sending emails:", emailError)
      // Don't fail the order if email sending fails
    }

    // Create Shiprocket order with improved data formatting
    try {
      const shiprocketOrderData = {
        order_id: savedOrder.orderId,
        order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
        pickup_location: shiprocketService.defaultPickupLocation || 9007588, // fallback ID
        billing_customer_name: savedOrder.address.fullName.split(" ")[0] || savedOrder.address.fullName,
        billing_last_name: savedOrder.address.fullName.split(" ").slice(1).join(" ") || "",
        billing_address: savedOrder.address.street,
        billing_address_2: savedOrder.address.apartment || "",
        billing_city: savedOrder.address.city,
        billing_pincode: savedOrder.address.postcode,
        billing_state: savedOrder.address.state || "Maharashtra", // Default state if not provided
        billing_country: savedOrder.address.country,
        billing_email: savedOrder.address.email,
        billing_phone: savedOrder.address.phone,
        order_items: savedOrder.items.map((item, index) => ({
          name: item.productName,
          sku: `SKU${item.productId}${index}`, // Create a unique SKU
          units: item.quantity,
          selling_price: item.price,
          discount: 0,
          tax: 0,
          hsn: 0,
        })),
        payment_method: "Prepaid",
        shipping_charges: 50, // You can make this dynamic
        giftwrap_charges: 0,
        transaction_charges: 0,
        total_discount: 0,
        sub_total: savedOrder.totalAmount - 50, // Subtract shipping charges
        length: 10,
        breadth: 15,
        height: 20,
        weight: 0.5,
      }

      console.log("Creating Shiprocket order with data:", JSON.stringify(shiprocketOrderData, null, 2))
      const shiprocketResult = await shiprocketService.createOrder(shiprocketOrderData)
      console.log("Shiprocket API result:", JSON.stringify(shiprocketResult, null, 2)) // <--- Add this line

      if (shiprocketResult && shiprocketResult.success) {
        savedOrder.shiprocketOrderId = shiprocketResult.order_id
        savedOrder.shiprocketShipmentId = shiprocketResult.shipment_id
        savedOrder.trackingNumber = shiprocketResult.awb_code
        await savedOrder.save()
        console.log("Shiprocket order created successfully:", shiprocketResult)
      } else {
        console.error("Shiprocket order creation failed:", shiprocketResult)
        return res.status(500).json({
          success: false,
          message: "Shiprocket order creation failed",
          shiprocketError: shiprocketResult,
        });
      }
    } catch (shiprocketError) {
      console.error("Error creating Shiprocket order:", shiprocketError)
      // Don't fail the order if Shiprocket fails, but log the error
    }

    // Clear user's cart after successful order
    try {
      await Cart.findOneAndDelete({ userId: req.user._id })
      console.log("Cart cleared for user:", req.user._id)
    } catch (cartError) {
      console.error("Error clearing cart:", cartError)
      // Don't fail the order if cart clearing fails
    }

    console.log("=== VERIFY RAZORPAY PAYMENT END ===")

    res.status(200).json({
      success: true,
      message: "Payment verified and order created successfully",
      order: savedOrder,
      orderId: savedOrder.orderId,
      paymentId: razorpay_payment_id,
    })
  } catch (error) {
    console.error("=== VERIFY RAZORPAY PAYMENT ERROR ===")
    console.error("Error verifying payment:", error)
    console.error("Error stack:", error.stack)

    res.status(500).json({
      success: false,
      message: "Payment verification failed",
      error: error.message,
    })
  }
}

// Handle payment failure
const handlePaymentFailure = async (req, res) => {
  try {
    console.log("Handling payment failure...")
    const { error, orderData } = req.body
    console.log("Payment failed:", error)

    res.status(400).json({
      success: false,
      message: "Payment failed",
      error: error,
    })
  } catch (error) {
    console.error("Error handling payment failure:", error)
    res.status(500).json({
      success: false,
      message: "Error handling payment failure",
    })
  }
}

// Get payment details
const getPaymentDetails = async (req, res) => {
  try {
    console.log("Getting payment details...")
    const razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    })

    const { paymentId } = req.params
    const payment = await razorpay.payments.fetch(paymentId)

    res.status(200).json({
      success: true,
      payment: payment,
    })
  } catch (error) {
    console.error("Error fetching payment details:", error)
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment details",
      error: error.message,
    })
  }
}

module.exports = {
  testRazorpay,
  createRazorpayOrder,
  verifyRazorpayPayment,
  handlePaymentFailure,
  getPaymentDetails,
}
