const mongoose = require("mongoose")

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      required: true,
      unique: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    items: [
      {
        productId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true,
        },
        productName: {
          type: String,
          required: true,
        },
        quantity: {
          type: Number,
          required: true,
          min: 1,
        },
        price: {
          type: Number,
          required: true,
        },
        size: {
          type: String,
          default: "M",
        },
        color: {
          type: String,
          default: "Default",
        },
      },
    ],
    totalAmount: {
      type: Number,
      required: true,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["CASH", "ONLINE", "COD"],
      default: "CASH",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "paid", "failed"],
      default: "pending",
    },
    status: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    orderStatus: {
      type: String,
      enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
      default: "pending",
    },
    address: {
      fullName: {
        type: String,
        required: true,
      },
      street: {
        type: String,
        required: true,
      },
      apartment: String,
      city: {
        type: String,
        required: true,
      },
      state: String,
      postcode: {
        type: String,
        required: true,
      },
      phone: {
        type: String,
        required: true,
      },
      email: {
        type: String,
        required: true,
      },
      country: {
        type: String,
        default: "India",
      },
    },
    notes: String,
    razorpayOrderId: String,
    razorpayPaymentId: String,
    razorpaySignature: String,
    shiprocketOrderId: String,
    shiprocketShipmentId: String,
    trackingNumber: String,
    cancelledAt: Date,
    seenByAdmin: {
      type: Boolean,
      default: false,
    },
    userNotified: {
      type: Boolean,
      default: false,
    },
    adminNotified: {
      type: Boolean,
      default: false,
    },
    userEmailSent: {
      type: Boolean,
      default: false,
    },
    adminEmailSent: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("Order", orderSchema)
