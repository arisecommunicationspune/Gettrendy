const mongoose = require("mongoose")

const replacementRequestSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
    },
    reason: {
      type: String,
      required: true,
    },
    note: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "approved", "rejected", "resolved"],
      default: "pending",
    },
    resolvedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

module.exports = mongoose.model("ReplacementRequest", replacementRequestSchema)
