"use client";

import { useEffect, useState } from "react";
import "./Checkout.css";
import Footer from "../Footer/Footer";
import { BASEURL, authUtils, cartUtils, api } from "../Comman/CommanConstans";
import { toast, ToastContainer } from "react-toastify";
import { useNavigate } from "react-router-dom";

const Checkout = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [countries, setCountries] = useState([]);
  const [formData, setFormData] = useState({
    fullName: "",
    companyName: "",
    country: "India",
    address: "",
    apartment: "",
    city: "",
    state: "",
    postcode: "",
    phone: "",
    email: "",
    orderNotes: "",
  });

  const [errors, setErrors] = useState({});
  const [shipping, setShipping] = useState(50);
  const [loading, setLoading] = useState(false);

  // Calculate totals
  const subtotal = cartItems.reduce((acc, item) => {
    const productPrice =
      item.productId?.discount_price &&
      item.productId?.discount_price < item.productId?.price
        ? item.productId?.discount_price
        : item.productId?.price || item.product_price || item.price || 0;
    return acc + productPrice * (item.quantity || 1);
  }, 0);

  const total = subtotal + shipping;

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      if (/^\d{0,10}$/.test(value)) {
        setFormData({ ...formData, [name]: value });
        if (errors[name]) {
          setErrors({ ...errors, [name]: "" });
        }
      }
    } else {
      setFormData({ ...formData, [name]: value });
      if (errors[name]) {
        setErrors({ ...errors, [name]: "" });
      }
    }
  };

  // Validation function
  const validate = () => {
    const newErrors = {};
    if (!formData.fullName.trim()) newErrors.fullName = "Full Name is required";
    if (!formData.address.trim())
      newErrors.address = "Street Address is required";
    if (!formData.city.trim()) newErrors.city = "Town/City is required";
    if (!formData.postcode.trim())
      newErrors.postcode = "Postcode/ZIP is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone is required";
    if (!formData.email.trim()) newErrors.email = "Email is required";

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (formData.email && !emailRegex.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Phone validation
    if (formData.phone && formData.phone.length < 10) {
      newErrors.phone = "Phone number must be 10 digits";
    }

    return newErrors;
  };

  const getUserInfo = async () => {
    try {
      const token = authUtils.getToken();
      if (!token) return;

      console.log("Fetching user info...");
      const response = await api.get(`${BASEURL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      console.log("User info response:", response.data);

      if (response.data && response.data.success) {
        const userData = response.data.data || response.data;
        setFormData((prev) => ({
          ...prev,
          fullName: userData.name || "",
          phone: userData.phone || "",
          email: userData.email || "",
          postcode: userData.pincode || "",
        }));
      }
    } catch (error) {
      console.error("Error fetching user info:", error);
      if (error.response?.status === 404) {
        console.log("User profile endpoint not found, using fallback data");
        setFormData((prev) => ({
          ...prev,
          fullName: authUtils.getUserName() || "",
          email: localStorage.getItem("userEmail") || "",
        }));
      }
    }
  };

  const fetchCartItems = async () => {
    try {
      setLoading(true);
      const items = await cartUtils.fetchCartItems();
      console.log("Cart items for checkout:", items);
      setCartItems(items);
    } catch (error) {
      console.error("Error fetching cart items:", error);
      toast.error("Failed to load cart items");
    } finally {
      setLoading(false);
    }
  };

  // Initialize Razorpay payment
  const initializeRazorpayPayment = async () => {
    try {
      setLoading(true);
      console.log("[Checkout] Starting initializeRazorpayPayment");
      // Create Razorpay order
      const orderResponse = await api.post(
        `${BASEURL}/api/razorpay/create-order`,
        {
          amount: total,
          currency: "INR",
          receipt: `receipt_${Date.now()}`,
        },
        {
          headers: {
            Authorization: `Bearer ${authUtils.getToken()}`,
            "Content-Type": "application/json",
          },
        }
      );
      console.log("[Checkout] Razorpay orderResponse:", orderResponse);

      if (!orderResponse.data.success) {
        console.log(
          "[Checkout] Failed to create payment order:",
          orderResponse.data
        );
        throw new Error("Failed to create payment order");
      }

      const { order } = orderResponse.data;
      const key_id = orderResponse.data.key_id; // Get key_id from the response
      console.log("[Checkout] Razorpay order:", order, "key_id:", key_id);

      // Prepare order items for database
      const orderItems = cartItems.map((item) => {
        const productPrice =
          item.productId?.discount_price &&
          item.productId?.discount_price < item.productId?.price
            ? item.productId?.discount_price
            : item.productId?.price || item.product_price || item.price || 0;
        return {
          productId: item.productId?._id || item.productId,
          productName:
            item.productId?.product_name ||
            item.productId?.name ||
            item.product_name ||
            item.name,
          quantity: item.quantity,
          price: productPrice, // <-- now uses discounted price if available
          size: item.size || "M",
          color: item.color || "Default",
        };
      });
      console.log("[Checkout] Prepared orderItems:", orderItems);

      const orderData = {
        items: orderItems,
        totalAmount: total,
        address: {
          fullName: formData.fullName,
          phone: formData.phone,
          email: formData.email,
          apartment: formData.apartment,
          street: formData.address,
          city: formData.city,
          state: formData.state,
          postcode: formData.postcode,
          country: formData.country,
        },
        notes: formData.orderNotes,
        paymentMethod: "ONLINE",
      };
      console.log("[Checkout] Prepared orderData for backend:", orderData);

      // Razorpay options
      const options = {
        key: key_id,
        amount: order.amount,
        currency: order.currency,
        name: "GetTrendy",
        description: "Purchase from GetTrendy",
        order_id: order.id,
        handler: async function (response) {
          try {
            console.log("[Payment] Payment response received:", response);

            if (
              !response.razorpay_payment_id ||
              !response.razorpay_order_id ||
              !response.razorpay_signature
            ) {
              console.log("[Payment] Incomplete payment response:", response);
              throw new Error("Incomplete payment response from Razorpay");
            }

            console.log(
              "[Payment] Sending verification to backend...",
              orderData
            );
            // Send payment verification to your backend
            const verifyResponse = await api.post(
              `${BASEURL}/api/razorpay/verify-payment`,
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                orderData: orderData,
              },
              {
                headers: {
                  Authorization: `Bearer ${authUtils.getToken()}`,
                  "Content-Type": "application/json",
                },
              }
            );

            console.log(
              "[Payment] Verification response:",
              verifyResponse.data
            );

            if (verifyResponse.data && verifyResponse.data.success) {
              console.log(
                "[Payment] Payment verified successfully, clearing cart..."
              );
              // Clear the cart
              await cartUtils.clearCart();
              // --- Shiprocket Integration ---
              // Prepare Shiprocket order data
              const shiprocketOrderData = {
                order_id:
                  verifyResponse.data.orderId ||
                  verifyResponse.data.order?.orderId ||
                  `ORDER_${Date.now()}`,
                order_date: new Date().toISOString().slice(0, 19).replace("T", " "),
                pickup_location: "warehouse",
                billing_customer_name: String(formData.fullName),
                billing_last_name: "",
                billing_address: String(formData.address),
                billing_city: String(formData.city),
                billing_pincode: String(formData.postcode),
                billing_state: String(formData.state),
                billing_country: String(formData.country),
                billing_email: String(formData.email),
                billing_phone: String(formData.phone),
                order_items: cartItems.map((item) => ({
                  name: String(
                    item.productId?.product_name ||
                    item.product_name ||
                    item.name
                  ),
                  sku: String(
                    (item.productId && typeof item.productId === "object" && item.productId._id)
                      ? item.productId._id
                      : item.productId || item.sku
                  ),
                  units: Number(item.quantity),
                  selling_price: Number(
                    item.productId?.price ||
                    item.product_price ||
                    item.price
                  ),
                  // Do NOT add any extra fields here!
                })),
                payment_method: "Prepaid",
                shipping_charges: Number(shipping),
                giftwrap_charges: 0,
                transaction_charges: 0,
                total_discount: 0,
                sub_total: Number(subtotal),
                length: 10,
                breadth: 15,
                height: 20,
                weight: 0.5,
              };
              console.log(
                "[Payment] Shiprocket order data:",
                JSON.stringify(shiprocketOrderData, null, 2)
              );
              await createShiprocketOrder(shiprocketOrderData);
              // --- End Shiprocket Integration ---
              console.log("[Payment] Redirecting to success page...");
              // Redirect to success page with order details
              navigate("/success", {
                state: {
                  orderId: verifyResponse.data.order.orderId, // pass only orderId
                  paymentId: response.razorpay_payment_id,
                },
                replace: true, // This prevents going back to payment page
              });
            } else {
              const errorMsg =
                verifyResponse.data?.message || "Payment verification failed";
              console.error("[Payment] Verification failed:", errorMsg);
              throw new Error(errorMsg);
            }
          } catch (error) {
            console.error("[Payment] Error processing payment:", error);
            toast.error(
              error.message ||
                "Error processing payment. Please contact support."
            );
          } finally {
            setLoading(false);
            console.log(
              "[Payment] Payment handler finished, loading set to false"
            );
          }
        },
        prefill: {
          name: formData.fullName,
          email: formData.email,
          contact: formData.phone,
        },
        notes: {
          address: `${formData.address}, ${formData.city}, ${formData.state} - ${formData.postcode}`,
        },
        theme: {
          color: "#E9272D",
        },
        modal: {
          ondismiss: () => {
            console.log("Payment modal closed");
            setLoading(false);
          },
        },
      };
      console.log("[Checkout] Razorpay options:", options);

      // Open Razorpay checkout
      const rzp = new window.Razorpay(options);
      console.log("[Checkout] Razorpay instance created:", rzp);

      rzp.on("payment.failed", async (response) => {
        console.error("Payment failed:", response.error);

        try {
          await api.post(
            `${BASEURL}/api/razorpay/payment-failed`,
            {
              error: response.error,
              orderData: orderData,
            },
            {
              headers: {
                Authorization: `Bearer ${authUtils.getToken()}`,
                "Content-Type": "application/json",
              },
            }
          );
        } catch (error) {
          console.error("Error logging payment failure:", error);
        }

        toast.error(`Payment failed: ${response.error.description}`);
        setLoading(false);
        console.log("[Checkout] Payment failed, loading set to false");
      });

      rzp.open();
      console.log("[Checkout] Razorpay checkout opened");
    } catch (error) {
      console.error("Error initializing payment:", error);
      let message = "Failed to initialize payment";

      if (error.response?.data?.message) {
        message = error.response.data.message;
      } else if (error.response?.status === 401) {
        message = "Please login to make payment";
        navigate("/login");
      }

      toast.error(message);
      setLoading(false);
      console.log(
        "[Checkout] Error initializing payment, loading set to false"
      );
    }
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log("[Checkout] handleSubmit called");
    const formErrors = validate();
    console.log("[Checkout] Validation errors:", formErrors);

    if (Object.keys(formErrors).length === 0) {
      if (cartItems.length === 0) {
        toast.error("Your cart is empty");
        console.log("[Checkout] Cart is empty, aborting");
        return;
      }

      // Initialize Razorpay payment
      console.log("[Checkout] Initializing Razorpay payment...");
      await initializeRazorpayPayment();
    } else {
      setErrors(formErrors);
      toast.error("Please fill in all required fields correctly");
      console.log("[Checkout] Form errors found, aborting");
    }
  };

  const getCountries = async () => {
    try {
      const response = await api.get(
        "https://restcountries.com/v3.1/all?fields=name"
      );
      const countryList = response.data
        .map((country) => country.name.common)
        .sort();
      setCountries(countryList);
    } catch (error) {
      console.error("Error fetching country list: ", error);
      setCountries([
        "India",
        "United States",
        "United Kingdom",
        "Canada",
        "Australia",
      ]);
    }
  };

  const createShiprocketOrder = async (shiprocketOrderData) => {
    try {
      const response = await api.post(
        `${BASEURL}/api/orders/shiprocket-order`,
        shiprocketOrderData
      );
      if (response.data.success) {
        toast.success("Order shipped via Shiprocket!");
      } else {
        toast.error("Failed to create Shiprocket order");
      }
    } catch (error) {
      toast.error(
        "Shiprocket API error: " +
          (error.response?.data?.message || error.message)
      );
    }
  };

  useEffect(() => {
    if (!authUtils.isAuthenticated()) {
      toast.warning("Please login to proceed with checkout");
      navigate("/login");
      return;
    }

    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    getUserInfo();
    fetchCartItems();
    getCountries();

    // Fetch saved address
    const fetchSavedAddress = async () => {
      try {
        const response = await api.get(`${BASEURL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${authUtils.getToken()}`,
          },
        });
        if (response.data && response.data.user) {
          setFormData((prev) => ({
            ...prev,
            ...response.data.user, // or map the address fields as needed
          }));
        }
      } catch (error) {
        // No saved address, do nothing
      }
    };

    fetchSavedAddress();

    return () => {
      // Cleanup script
      const existingScript = document.querySelector(
        'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
      );
      if (existingScript) {
        document.body.removeChild(existingScript);
      }
    };
  }, [navigate]);

  return (
    <>
      <ToastContainer />
      <div className="container-fluid bg-grey">
      <div className="container checkout-page" >
        <h2>Checkout</h2>
        <p>Home &bull; Checkout</p>

        {loading && cartItems.length === 0 ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-5">
            <h3>Your cart is empty</h3>
            <p className="text-muted">
              Add some items to your cart to proceed with checkout.
            </p>
            <button
              className="btn btn-primary"
              onClick={() => navigate("/shop")}
            >
              Continue Shopping
            </button>
          </div>
        ) : (
          <div className="row">
            <div className="col-lg-8 col-md-12 col-sm-12 mb-4">
              <div className="billing-details">
                <h3>Billing Details</h3>
                <form onSubmit={handleSubmit} className="address-form">
                  {/* Full Name */}
                  <div className="col-lg-6 col-md-6 col-sm-12 form-group">
                    <label>
                      Full Name <span className="require">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        errors.fullName ? "is-invalid" : ""
                      }`}
                      placeholder="Full Name"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                    />
                    {errors.fullName && (
                      <div className="invalid-feedback">{errors.fullName}</div>
                    )}
                  </div>

                    {/* Phone */}
                  <div className="col-lg-6 col-md-6 col-sm-12 form-group">
                    <label>
                      Phone <span className="require">*</span>
                    </label>
                    <input
                      type="tel"
                      className={`form-control ${
                        errors.phone ? "is-invalid" : ""
                      }`}
                      placeholder="Phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      required
                    />
                    {errors.phone && (
                      <div className="invalid-feedback">{errors.phone}</div>
                    )}
                  </div>

                    {/* Email */}
                  <div className="col-lg-6 col-md-12 col-sm-12 form-group">
                    <label>
                      Email <span className="require">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-control ${
                        errors.email ? "is-invalid" : ""
                      }`}
                      placeholder="Email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                    {errors.email && (
                      <div className="invalid-feedback">{errors.email}</div>
                    )}
                  </div>

                  {/* Apartment */}
                  <div className="col-lg-6 col-md-12 col-sm-12 form-group">
                    <label>Apartment, suite  <span className="require">*</span> </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Apartment, suite, unit"
                      name="apartment"
                      value={formData.apartment}
                      onChange={handleChange}
                    />
                  </div>


                  {/* Street Address */}
                  <div className="col-lg-6 col-md-12 col-sm-12 form-group">
                    <label>
                      Street Address <span className="require">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        errors.address ? "is-invalid" : ""
                      }`}
                      placeholder="Street address"
                      name="address"
                      value={formData.address}
                      onChange={handleChange}
                      required
                    />
                    {errors.address && (
                      <div className="invalid-feedback">{errors.address}</div>
                    )}
                  </div>

                  

                  {/* City */}
                  <div className="col-lg-6 col-md-6 col-sm-12 form-group">
                    <label>
                      Town / City <span className="require">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        errors.city ? "is-invalid" : ""
                      }`}
                      placeholder="Town/City"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                    {errors.city && (
                      <div className="invalid-feedback">{errors.city}</div>
                    )}
                  </div>

                  {/* State */}
                  <div className="col-lg-4 col-md-6 col-sm-12 form-group">
                    <label>State (optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="State"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                    />
                  </div>

                  {/* Postcode */}
                  <div className="col-lg-4 col-md-6 col-sm-12 form-group">
                    <label>
                      Postcode / ZIP <span className="require">*</span>
                    </label>
                    <input
                      type="text"
                      className={`form-control ${
                        errors.postcode ? "is-invalid" : ""
                      }`}
                      placeholder="ZIP"
                      name="postcode"
                      value={formData.postcode}
                      onChange={handleChange}
                      required
                    />
                    {errors.postcode && (
                      <div className="invalid-feedback">{errors.postcode}</div>
                    )}
                  </div>

              
                  {/* Country */}
                  <div className="col-lg-4 col-md-6 col-sm-12 form-group">
                    <label>Country</label>
                    <select
                      className="form-control p-x"
                      name="country"
                      value={formData.country}
                      onChange={handleChange}
                    >
                      {countries.map((country, index) => (
                        <option key={index} value={country}>
                          {country}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Order Notes */}
                  <div className="col-lg-12 col-md-12 col-sm-12 form-group">
                    <label>Order notes (optional)</label>
                    <textarea
                      className="form-control"
                      placeholder="Notes about your order"
                      name="orderNotes"
                      value={formData.orderNotes}
                      onChange={handleChange}
                      rows="3"
                    />
                  </div>

                  {/* Order Notes */}
                  <div className="col-lg-12 form-group">
                    <img src="/images/ship.png" alt="Payment Methods" ></img>
                  </div>

                </form>
              </div>
            </div>

            <div className="col-lg-4 col-md-12 col-sm-12">
              <div className="order-summary">
                <h3>Your Order</h3>
                <div className="table-container">
                  <table className="table">
                    <thead>
                      <tr>
                        <th className="text-bold">Product</th>
                        <th className="text-bold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cartItems.map((item, index) => {
                        const productName =
                          item.productId?.product_name ||
                          item.productId?.name ||
                          item.product_name ||
                          item.name;
                          const productPrice =
                          item.productId?.discount_price &&
                          item.productId?.discount_price < item.productId?.price
                            ? item.productId?.discount_price
                            : item.productId?.price || item.product_price || item.price || 0;
                        
                        return (
                          <tr key={index}>
                            <td>
                              {productName} x {item.quantity}
                              <br />
                              <small className="text-muted">
                                Size: {item.size}, Color: {item.color}
                              </small>
                            </td>
                            <td>
                              ₹{(productPrice * item.quantity).toFixed(2)}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <table className="table">
                  <tbody>
                    <tr>
                      <td>
                        <strong>Subtotal</strong>
                      </td>
                      <td>₹{subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Shipping</strong>
                      </td>
                      <td>
                        <div>
                          <label>
                            <input
                              type="radio"
                              name="shipping"
                              value="flat"
                              checked={shipping === 50}
                              onChange={() => setShipping(50)}
                            />{" "}
                            Flat rate: ₹50.00
                          </label>
                          <br />
                          <label>
                            <input
                              type="radio"
                              name="shipping"
                              value="local"
                              checked={shipping === 25}
                              onChange={() => setShipping(25)}
                            />{" "}
                            Local pickup: ₹25.00
                          </label>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td>
                        <strong>Payment Method</strong>
                      </td>
                      <td>
                        <div className="payment-info">
                          <i
                            className="fas fa-credit-card"
                            style={{ color: "#E9272D", marginRight: "8px" }}
                          ></i>
                          <span>Secure Online Payment via Razorpay</span>
                          <br />
                          <small className="text-muted">
                            Supports Credit/Debit Cards, UPI, Net Banking,
                            Wallets
                          </small>
                        </div>
                      </td>
                    </tr>
                    <tr>
                      <td className="text-bold">Total</td>
                      <td className="text-bold">₹{total.toFixed(2)}</td>
                    </tr>
                  </tbody>
                </table>

                <button
                  className="btn w-100"
                  style={{ background: "#E9272D", color: "white" }}
                  onClick={handleSubmit}
                  disabled={loading || cartItems.length === 0}
                >
                  {loading ? (
                    <>
                      <span
                        className="spinner-border spinner-border-sm me-2"
                        role="status"
                        aria-hidden="true"
                      ></span>
                      Processing...
                    </>
                  ) : (
                    <>
                      <i className="fas fa-lock me-2"></i>
                      Pay Securely ₹{total.toFixed(2)}
                    </>
                  )}
                </button>

                <div className="text-center mt-3">
                  <small className="text-muted">
                    <i className="fas fa-shield-alt me-1"></i>
                    Your payment information is secure and encrypted
                  </small>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
      <Footer />
    </>
  );
};

export default Checkout;
