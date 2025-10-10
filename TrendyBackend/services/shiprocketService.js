require("dotenv").config(); // make sure this is at the very top

const axios = require("axios")
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD
const SHIPROCKET_BASE_URL = "https://apiv2.shiprocket.in/v1/external"

let token = null
let tokenExpiry = null

// Authenticate with Shiprocket
async function authenticate() {
  try {
    // Check if token is still valid
    if (token && tokenExpiry && new Date() < tokenExpiry) {
      return token
    }

    console.log("Authenticating with Shiprocket...")
      // 🔍 Debug logs to check if .env is working
    console.log("EMAIL:", SHIPROCKET_EMAIL);
    console.log("PASSWORD:", SHIPROCKET_PASSWORD);

    if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
      throw new Error("Shiprocket credentials not configured")
    }

    const response = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
      email: SHIPROCKET_EMAIL,
      password: SHIPROCKET_PASSWORD,
    })

    if (response.data && response.data.token) {
      token = response.data.token
      // Set token expiry to 23 hours from now (tokens usually expire in 24 hours)
      tokenExpiry = new Date(Date.now() + 23 * 60 * 60 * 1000)
      console.log("Shiprocket authentication successful")
      return token
    } else {
      throw new Error("Invalid response from Shiprocket authentication")
    }
  } catch (error) {
    console.error("Shiprocket authentication error:", error.response?.data || error.message)
    token = null
    tokenExpiry = null
    throw new Error(`Shiprocket authentication failed: ${error.response?.data?.message || error.message}`)
  }
}

let defaultPickupLocation = null; // fallback

async function fetchPickupLocation() {
  try {
    const authToken = await authenticate();
    const response = await axios.get(`${SHIPROCKET_BASE_URL}/settings/company/pickup`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const pickups = response.data?.data?.shipping_address || [];
   if (pickups.length > 0) {
  defaultPickupLocation = pickups[0].id; // Use ID, not string
  console.log("✅ Default Pickup Location ID set to:", defaultPickupLocation);
} else {
      console.warn("⚠️ No pickup locations found, using fallback:", defaultPickupLocation);
    }
  } catch (err) {
    console.error("❌ Error fetching pickup location:", err.message);
  }
}

// call this once when your app boots (e.g. in index.js)
fetchPickupLocation();


// Create order in Shiprocket
async function createOrder(orderData) {
  try {
    console.log("ShiprocketService: Creating order with data:", JSON.stringify(orderData, null, 2));
    // Ensure we have a valid token
    const authToken = await authenticate()

    // Validate required fields
    if (!orderData.order_id || !orderData.billing_customer_name || !orderData.billing_phone) {
      throw new Error("Missing required order data for Shiprocket")
    }

    // Ensure order_items is properly formatted
    if (!orderData.order_items || !Array.isArray(orderData.order_items) || orderData.order_items.length === 0) {
      throw new Error("Order items are required and must be an array")
    }

    // Validate each order item
    orderData.order_items.forEach((item, index) => {
      if (!item.name || !item.sku || !item.units || !item.selling_price) {
        throw new Error(`Order item ${index + 1} is missing required fields (name, sku, units, selling_price)`)
      }
    })

    // Prepare the order data for Shiprocket API with proper formatting
    const shiprocketOrderData = {
      order_id: String(orderData.order_id), // Ensure it's a string
      order_date: orderData.order_date || new Date().toISOString().slice(0, 19).replace("T", " "),
     pickup_location: shiprocketService.defaultPickupLocation || 9007588, // fallback ID
      channel_id: "", // Leave empty for manual orders
      comment: orderData.comment || "Order from website",
      billing_customer_name: String(orderData.billing_customer_name).trim(),
      billing_last_name: String(orderData.billing_last_name || "").trim(),
      billing_address: String(orderData.billing_address).trim(),
      billing_address_2: String(orderData.billing_address_2 || "").trim(),
      billing_city: String(orderData.billing_city).trim(),
      billing_pincode: String(orderData.billing_pincode).trim(),
      billing_state: String(orderData.billing_state).trim(),
      billing_country: String(orderData.billing_country || "India").trim(),
      billing_email: String(orderData.billing_email).trim(),
      billing_phone: String(orderData.billing_phone).replace(/\D/g, ""), // Remove non-digits
      shipping_is_billing: orderData.shipping_is_billing !== false, // Default to true
      shipping_customer_name: String(orderData.shipping_customer_name || orderData.billing_customer_name).trim(),
      shipping_last_name: String(orderData.shipping_last_name || orderData.billing_last_name || "").trim(),
      shipping_address: String(orderData.shipping_address || orderData.billing_address).trim(),
      shipping_address_2: String(orderData.shipping_address_2 || orderData.billing_address_2 || "").trim(),
      shipping_city: String(orderData.shipping_city || orderData.billing_city).trim(),
      shipping_pincode: String(orderData.shipping_pincode || orderData.billing_pincode).trim(),
      shipping_country: String(orderData.shipping_country || orderData.billing_country || "India").trim(),
      shipping_state: String(orderData.shipping_state || orderData.billing_state).trim(),
      shipping_email: String(orderData.shipping_email || orderData.billing_email).trim(),
      shipping_phone: String(orderData.shipping_phone || orderData.billing_phone).replace(/\D/g, ""),
      order_items: orderData.order_items.map((item) => ({
        name: String(item.name).trim(),
        sku: String(item.sku).trim(),
        units: Number(item.units),
        selling_price: Number(item.selling_price),
        discount: Number(item.discount || 0),
        tax: Number(item.tax || 0),
        hsn: Number(item.hsn || 0),
      })),
      payment_method: orderData.payment_method || "Prepaid",
      shipping_charges: Number(orderData.shipping_charges || 0),
      giftwrap_charges: Number(orderData.giftwrap_charges || 0),
      transaction_charges: Number(orderData.transaction_charges || 0),
      total_discount: Number(orderData.total_discount || 0),
      sub_total: Number(orderData.sub_total),
      length: Number(orderData.length || 10),
      breadth: Number(orderData.breadth || 15),
      height: Number(orderData.height || 20),
      weight: Number(orderData.weight || 0.5),
    }

    // Additional validation
    if (shiprocketOrderData.billing_phone.length < 10) {
      throw new Error("Billing phone number must be at least 10 digits")
    }

    if (shiprocketOrderData.billing_pincode.length !== 6) {
      throw new Error("Billing pincode must be 6 digits")
    }

    console.log("Final Shiprocket order data:", JSON.stringify(shiprocketOrderData, null, 2))

    const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, shiprocketOrderData, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      timeout: 30000, // 30 second timeout
    })

    console.log("ShiprocketService: Shiprocket API response:", response.data);
    // Check if the response indicates success
    if (response.data && (response.data.order_id || response.data.shipment_id)) {
      return {
        success: true,
        order_id: response.data.order_id,
        shipment_id: response.data.shipment_id,
        awb_code: response.data.awb_code,
        courier_company_id: response.data.courier_company_id,
        courier_name: response.data.courier_name,
        response: response.data,
      }
    } else {
      console.error("Unexpected Shiprocket response:", response.data)
      throw new Error("Shiprocket order creation failed: Invalid response format")
    }
  } catch (error) {
    console.error("Shiprocket order creation error:", error.response?.data || error.message)

    // If authentication error, clear token and retry once
    if (error.response?.status === 401) {
      console.log("Token expired, retrying authentication...")
      token = null
      tokenExpiry = null

      // Retry once with new token
      try {
        const authToken = await authenticate()
        const response = await axios.post(`${SHIPROCKET_BASE_URL}/orders/create/adhoc`, orderData, {
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Content-Type": "application/json",
          },
          timeout: 30000,
        })

        if (response.data && (response.data.order_id || response.data.shipment_id)) {
          return {
            success: true,
            order_id: response.data.order_id,
            shipment_id: response.data.shipment_id,
            awb_code: response.data.awb_code,
            response: response.data,
          }
        }
      } catch (retryError) {
        console.error("Shiprocket retry failed:", retryError.response?.data || retryError.message)
        throw new Error(
          `Shiprocket order creation failed after retry: ${retryError.response?.data?.message || retryError.message}`,
        )
      }
    }

    // Provide more detailed error information
    let errorMessage = "Shiprocket order creation failed"
    if (error.response?.data?.message) {
      errorMessage += `: ${error.response.data.message}`
    } else if (error.response?.data?.errors) {
      errorMessage += `: ${JSON.stringify(error.response.data.errors)}`
    } else if (error.message) {
      errorMessage += `: ${error.message}`
    }

    throw new Error(errorMessage)
  }
}

// Get order tracking details
async function trackOrder(orderId) {
  try {
    const authToken = await authenticate()

    const response = await axios.get(`${SHIPROCKET_BASE_URL}/courier/track/awb/${orderId}`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })

    return response.data
  } catch (error) {
    console.error("Shiprocket tracking error:", error.response?.data || error.message)
    throw new Error(`Shiprocket tracking failed: ${error.response?.data?.message || error.message}`)
  }
}

// Cancel order
async function cancelOrder(orderId) {
  try {
    const authToken = await authenticate()

    const response = await axios.post(
      `${SHIPROCKET_BASE_URL}/orders/cancel`,
      { ids: [orderId] },
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
          "Content-Type": "application/json",
        },
      },
    )

    return response.data
  } catch (error) {
    console.error("Shiprocket cancel order error:", error.response?.data || error.message)
    throw new Error(`Shiprocket order cancellation failed: ${error.response?.data?.message || error.message}`)
  }
}

// Get all orders from Shiprocket
async function getAllOrders(page = 1, per_page = 10) {
  try {
    const authToken = await authenticate()

    const response = await axios.get(`${SHIPROCKET_BASE_URL}/orders`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
      params: {
        page,
        per_page,
      },
    })

    return response.data
  } catch (error) {
    console.error("Shiprocket get orders error:", error.response?.data || error.message)
    throw new Error(`Failed to get Shiprocket orders: ${error.response?.data?.message || error.message}`)
  }
}

module.exports = {
  authenticate,
  createOrder,
  trackOrder,
  cancelOrder,
  getAllOrders,
}
