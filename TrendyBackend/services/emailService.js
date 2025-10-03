const nodemailer = require("nodemailer")

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  })
}

// Send email to user after successful order
const sendOrderConfirmationToUser = async (userEmail, orderData) => {
  try {
    console.log(`Sending order confirmation email to: ${userEmail}`)

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("Email service not configured, skipping email send")
      return { success: true, message: "Email service not configured" }
    }

    const transporter = createTransporter()

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: userEmail,
      subject: `Order Confirmation - ${orderData.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #E9272D; color: white; padding: 20px; text-align: center;">
            <h1>Order Confirmed!</h1>
          </div>
          
          <div style="padding: 20px;">
            <h2>Thank you for your order!</h2>
            <p>Dear ${orderData.address.fullName},</p>
            <p>Your order has been successfully placed and is being processed.</p>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> ${orderData.orderId}</p>
              <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${orderData.totalAmount}</p>
              <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
              <p><strong>Payment Status:</strong> ${orderData.paymentStatus}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Items Ordered:</h3>
              ${orderData.items
                .map(
                  (item) => `
                <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
                  <p><strong>${item.productName}</strong></p>
                  <p>Quantity: ${item.quantity} | Price: ₹${item.price}</p>
                  <p>Size: ${item.size} | Color: ${item.color}</p>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Shipping Address:</h3>
              <p>${orderData.address.fullName}</p>
              <p>${orderData.address.street}</p>
              ${orderData.address.apartment ? `<p>${orderData.address.apartment}</p>` : ""}
              <p>${orderData.address.city}, ${orderData.address.state} ${orderData.address.postcode}</p>
              <p>${orderData.address.country}</p>
              <p>Phone: ${orderData.address.phone}</p>
              <p>Email: ${orderData.address.email}</p>
            </div>
            
            <p>We'll send you another email when your order ships.</p>
            <p>If you have any questions, please contact us at ${process.env.EMAIL_USER}</p>
            
            <div style="text-align: center; margin-top: 30px;">
              <p>Thank you for shopping with GetTrendy!</p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666;">
            <p>&copy; 2025 GetTrendy. All rights reserved.</p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Order confirmation email sent to user:", userEmail)
    return { success: true }
  } catch (error) {
    console.error("Error sending order confirmation email to user:", error)
    return { success: false, error: error.message }
  }
}

// Send email to admin about new order
const sendNewOrderNotificationToAdmin = async (orderData) => {
  try {
    console.log("Sending new order notification to admin")

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("Email service not configured, skipping admin email")
      return { success: true, message: "Email service not configured" }
    }

    const transporter = createTransporter()

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New Order Received - ${orderData.orderId}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #28a745; color: white; padding: 20px; text-align: center;">
            <h1>New Order Received!</h1>
          </div>
          
          <div style="padding: 20px;">
            <h2>A new order has been placed</h2>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Order Details:</h3>
              <p><strong>Order ID:</strong> ${orderData.orderId}</p>
              <p><strong>Customer:</strong> ${orderData.address.fullName}</p>
              <p><strong>Email:</strong> ${orderData.address.email}</p>
              <p><strong>Phone:</strong> ${orderData.address.phone}</p>
              <p><strong>Order Date:</strong> ${new Date(orderData.createdAt).toLocaleDateString()}</p>
              <p><strong>Total Amount:</strong> ₹${orderData.totalAmount}</p>
              <p><strong>Payment Method:</strong> ${orderData.paymentMethod}</p>
              <p><strong>Payment Status:</strong> ${orderData.paymentStatus}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Items Ordered:</h3>
              ${orderData.items
                .map(
                  (item) => `
                <div style="border-bottom: 1px solid #ddd; padding: 10px 0;">
                  <p><strong>${item.productName}</strong></p>
                  <p>Quantity: ${item.quantity} | Price: ₹${item.price}</p>
                  <p>Size: ${item.size} | Color: ${item.color}</p>
                </div>
              `,
                )
                .join("")}
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Shipping Address:</h3>
              <p>${orderData.address.fullName}</p>
              <p>${orderData.address.street}</p>
              ${orderData.address.apartment ? `<p>${orderData.address.apartment}</p>` : ""}
              <p>${orderData.address.city}, ${orderData.address.state} ${orderData.address.postcode}</p>
              <p>${orderData.address.country}</p>
            </div>
            
            ${
              orderData.notes
                ? `
              <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Order Notes:</h3>
                <p>${orderData.notes}</p>
              </div>
            `
                : ""
            }
            
            <div style="text-align: center; margin-top: 30px;">
              <p>Please process this order as soon as possible.</p>
            </div>
          </div>
          
          <div style="background-color: #f8f9fa; padding: 20px; text-align: center; color: #666;">
            <p>&copy; 2025 GetTrendy Admin Panel</p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("New order notification email sent to admin")
    return { success: true }
  } catch (error) {
    console.error("Error sending new order notification email to admin:", error)
    return { success: false, error: error.message }
  }
}

// Send contact form email
const sendContactFormEmail = async (contactData) => {
  try {
    console.log("Sending contact form email to admin")

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("Email service not configured, skipping contact email")
      return { success: true, message: "Email service not configured" }
    }

    const transporter = createTransporter()

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject: `New Contact Message - ${contactData.subject || "No Subject"}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background-color: #17a2b8; color: white; padding: 20px; text-align: center;">
            <h1>New Contact Message</h1>
          </div>
          
          <div style="padding: 20px;">
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Contact Details:</h3>
              <p><strong>Name:</strong> ${contactData.name}</p>
              <p><strong>Email:</strong> ${contactData.email}</p>
              <p><strong>Subject:</strong> ${contactData.subject || "No Subject"}</p>
              <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3>Message:</h3>
              <p>${contactData.message}</p>
            </div>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)
    console.log("Contact form email sent to admin")
    return { success: true }
  } catch (error) {
    console.error("Error sending contact form email:", error)
    return { success: false, error: error.message }
  }
}

// Generic send email function (for backward compatibility)
const sendEmail = async (to, subject, text, html = null) => {
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      console.log("Email service not configured, skipping email send")
      return { success: true, message: "Email service not configured" }
    }

    const transporter = createTransporter()
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      text: text,
      html: html || text,
    }

    const result = await transporter.sendMail(mailOptions)
    console.log("Email sent successfully:", result.messageId)
    return { success: true, messageId: result.messageId }
  } catch (error) {
    console.error("Error sending email:", error)
    return { success: false, error: error.message }
  }
}

module.exports = {
  sendOrderConfirmationToUser,
  sendNewOrderNotificationToAdmin,
  sendContactFormEmail,
  sendEmail,
}
