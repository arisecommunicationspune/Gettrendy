"use client";

import { useEffect, useState } from "react";
import {
  Container,
  Row,
  Col,
  Button,
  Table,
  Spinner,
  Alert,
} from "react-bootstrap";
import "./CartPage.css";
import Footer from "../Footer/Footer";
import { useNavigate } from "react-router-dom";
import {
  authUtils,
  cartUtils,
  getImageUrl,
} from "../../Client/Comman/CommanConstans";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

const CartPage = () => {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Fetch cart items from server
  const fetchCartItems = async () => {
    if (!authUtils.isAuthenticated()) {
      toast.warning("Please login to view your cart");
      navigate("/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const items = await cartUtils.fetchCartItems();
      console.log("CartPage - Fetched cart items:", items);
      setCartItems(items || []);
    } catch (error) {
      console.error("Error fetching cart:", error);
      setError("Failed to load cart items");
      toast.error("Failed to load cart items");
    } finally {
      setLoading(false);
    }
  };

  // Fetch cart items when component mounts
  useEffect(() => {
    fetchCartItems();
  }, []);

  // Listen for cart changes
  useEffect(() => {
    const handleCartChange = async () => {
      console.log("Cart changed event received in CartPage");
      if (authUtils.isAuthenticated()) {
        try {
          const items = await cartUtils.fetchCartItems();
          setCartItems(items || []);
        } catch (error) {
          console.error("Error refreshing cart:", error);
        }
      }
    };

    window.addEventListener("cart-changed", handleCartChange);

    return () => {
      window.removeEventListener("cart-changed", handleCartChange);
    };
  }, []);

  // Calculate subtotal
  const subtotal = cartItems.reduce((acc, item) => {
    const productPrice =
      item?.productId?.discount_price &&
      item?.productId?.discount_price < item?.productId?.price
        ? item?.productId?.discount_price
        : item?.productId?.price || item?.product_price || item?.price || 0;
    return acc + productPrice * (item?.quantity || 1);
  }, 0);

  const handleSubmit = () => {
    if (cartItems.length === 0) {
      toast.warning("Your cart is empty");
      return;
    }

    navigate("/checkout");
  };

  const handleRemoveFromCart = async (item) => {
    setLoading(true);
    try {
      const productId = item?.productId?._id || item?.productId || item?._id;

      console.log(
        "Removing item with productId:",
        productId,
        "size:",
        item?.size,
        "color:",
        item?.color
      );

      const result = await cartUtils.removeFromCart(
        productId,
        item?.size,
        item?.color
      );

      if (result.success) {
        toast.success(result.message || "Item removed from cart", { autoClose: 1000 });
        // Dispatch cart change event to update navbar
        window.dispatchEvent(new CustomEvent("cart-changed"));
        // Refresh cart items
        await fetchCartItems();
      } else {
        toast.error(result.message || "Failed to remove item from cart", { autoClose: 1000 });
      }
    } catch (error) {
      console.error("Error removing item:", error);
      toast.error("Failed to remove item from cart", { autoClose: 1000 });
    } finally {
      setLoading(false);
    }
  };

  


  const handleUpdateQuantity = async (item, newQuantity) => {
    if (newQuantity < 1) return;

    setLoading(true);
    try {
      const productId = item?.productId?._id || item?.productId || item?._id;

      console.log(
        "Updating quantity for productId:",
        productId,
        "new quantity:",
        newQuantity
      );

      const result = await cartUtils.updateCartQuantity(
        productId,
        newQuantity,
        item?.size,
        item?.color
      );

      if (result.success) {
        toast.success("Quantity updated successfully", { autoClose: 1000 });
        // Dispatch cart change event to update navbar
        window.dispatchEvent(new CustomEvent("cart-changed"));
        // Refresh cart items
        await fetchCartItems();
      } else {
        toast.error(result.message || "Failed to update quantity", { autoClose: 1000 });
      }
    } catch (error) {
      console.error("Error updating quantity:", error);
      toast.error("Failed to update quantity", { autoClose: 1000 });
    } finally {
      setLoading(false);
    }
  };

  

  const handleClearCart = async () => {
    if (window.confirm("Are you sure you want to clear your cart?")) {
      setLoading(true);
      try {
        const result = await cartUtils.clearCart();
        if (result.success) {
          setCartItems([]);
          // Dispatch cart change event to update navbar
          window.dispatchEvent(new CustomEvent("cart-changed"));
          toast.success(result.message || "Cart cleared successfully!", {
            autoClose: 1000,
          });
        } else {
          toast.error(result.message || "Failed to clear cart", { autoClose: 1000});
        }
      } catch (error) {
        console.error("Error clearing cart:", error);
        toast.error("Failed to clear cart", { autoClose: 1000 });
      } finally {
        setLoading(false);
      }
    }
  };


  if (!authUtils.isAuthenticated()) {
    return (
      <Container className="cart-page" style={{ paddingTop: "150px" }}>
        <Alert variant="warning">
          <h4>Please Login</h4>
          <p>You need to be logged in to view your cart.</p>
          <Button variant="primary" onClick={() => navigate("/login")}>
            Go to Login
          </Button>
        </Alert>
        <Footer />
      </Container>
    );
  }

  return (
    <>
      <ToastContainer />
      <div className="Container-fluid bg-grey">
      <Container className="cart-page p-sm">
        <h2>Shopping Cart</h2>
        <p>Home • Cart</p>

        {error && (
          <Alert variant="danger">
            {error}
            <Button
              variant="outline-danger"
              className="ms-2"
              onClick={() => fetchCartItems()}
            >
              Retry
            </Button>
          </Alert>
        )}

        {loading ? (
          <div className="text-center py-5">
            <Spinner animation="border" variant="primary" />
            <p className="mt-2">Loading cart...</p>
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-5">
            <h3>Your cart is empty</h3>
            <p className="text-muted">
              Add some items to your cart to proceed.
            </p>
            <Button variant="primary" onClick={() => navigate("/shop")}>
              Continue Shopping
            </Button>
          </div>
        ) : (
          <Row>
            {/* desktop cart start  */}
            <Col className="desktop-cart" md={8}>
              <div
                style={{ maxHeight: "500px", overflowY: "auto", width: "100%" }}
              >
                <Table striped bordered hover responsive>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Price</th>
                      <th>Quantity</th>
                      <th>Total</th>
                      <th>Remove</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cartItems.map((item, index) => {
                      const productId =
                        item?.productId?._id || item?.productId || item?._id;
                      const productName =
                        item?.productId?.product_name ||
                        item?.productId?.name ||
                        item?.product_name ||
                        item?.name ||
                        "Unknown Product";
                      const productPrice =
                        item?.productId?.discount_price &&
                        item?.productId?.discount_price < item?.productId?.price
                          ? item?.productId?.discount_price
                          : item?.productId?.price ||
                            item?.product_price ||
                            item?.price ||
                            0;
                      const productImage =
                        item?.productId?.images?.[0] ||
                        item?.productId?.image ||
                        item?.product_image ||
                        item?.image;

                      return (
                        <tr
                          key={`${productId}-${item?.size}-${item?.color}-${index}`}
                        >
                          <td>
                            <Row>
                              <Col md={4}>
                                <img
                                  src={
                                    getImageUrl(productImage) ||
                                    "/placeholder.svg"
                                  }
                                  alt={productName}
                                  className="cart-product-image "
                                  style={{
                                    width: "80px",
                                    height: "80px",
                                    objectFit: "cover",
                                    borderRadius: "4px",
                                  }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/Images/placeholder.jpg";
                                  }}
                                />
                              </Col>
                              <Col className="pl-2" md={8}>
                                <h6 className="mb-1">{productName}</h6>
                                {item?.size && (
                                  <small className="text-muted d-block">
                                    Size: {item?.size}
                                  </small>
                                )}
                                {item?.color && (
                                  <small className="text-muted d-block">
                                    Color: {item?.color}
                                  </small>
                                )}
                              </Col>
                            </Row>
                          </td>
                          <td>₹{productPrice.toFixed(2)}</td>
                          <td>
                            <div className="quantity-selector d-flex align-items-center">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item,
                                    (item?.quantity || 1) - 1
                                  )
                                }
                                disabled={(item?.quantity || 1) <= 1 || loading}
                              >
                                -
                              </Button>
                              <span className="mx-2 fw-bold">
                                {item?.quantity || 1}
                              </span>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item,
                                    (item?.quantity || 1) + 1
                                  )
                                }
                                disabled={loading}
                              >
                                +
                              </Button>
                            </div>
                          </td>
                          <td>
                            ₹{(productPrice * (item?.quantity || 1)).toFixed(2)}
                          </td>
                          <td>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={() => handleRemoveFromCart(item)}
                              disabled={loading}
                            >
                              Remove
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </Table>
              </div>

              {cartItems.length > 0 && (
                <Button
                  variant="outline-danger"
                  className="mt-2 mb-4"
                  onClick={handleClearCart}
                  disabled={loading}
                >
                  Clear Cart
                </Button>
              )}
            </Col>
             {/* desktop cart end */}

            {/* mobile cart start  */}
            {/* <Col lg={8}> */}
            <Col className="mobile-cart" sm={12}>
              <div
                style={{ maxHeight: "500px", overflowX: "auto", width: "100%" }}
              >
                <div className="cart-card">
                  
                  <div>
                    {cartItems.map((item, index) => {
                      const productId =
                        item?.productId?._id || item?.productId || item?._id;
                      const productName =
                        item?.productId?.product_name ||
                        item?.productId?.name ||
                        item?.product_name ||
                        item?.name ||
                        "Unknown Product";
                      const productPrice =
                        item?.productId?.discount_price &&
                        item?.productId?.discount_price < item?.productId?.price
                          ? item?.productId?.discount_price
                          : item?.productId?.price ||
                            item?.product_price ||
                            item?.price ||
                            0;
                      const productImage =
                        item?.productId?.images?.[0] ||
                        item?.productId?.image ||
                        item?.product_image ||
                        item?.image;

                      return (
                        <div
                          key={`${productId}-${item?.size}-${item?.color}-${index}`}
                        >
                        
                            <div className="row">
                              <div className="col-sm-5" style={{width:"41%"}}>
                                <img
                                  src={
                                    getImageUrl(productImage) ||
                                    "/placeholder.svg"
                                  }
                                  alt={productName}
                                  className="cart-product-image "
                                  style={{
                                    width: "120px",
                                    height: "144px",
                                    objectFit: "cover",
                                    borderRadius: "4px",
                                  }}
                                  onError={(e) => {
                                    e.target.onerror = null;
                                    e.target.src = "/Images/placeholder.jpg";
                                  }}
                                />
                                
                              </div>
                              <div className="col-sm-7 pl-2" style={{width:"59%"}}>
                                <h6 className="mb-1 txt-wrap">{productName}</h6>
                                {item?.size && (
                                  <small className="text-muted d-block">
                                    item: {item?.size},  {item?.color}
                                  </small>
                                )}
                                {/* {item?.color && (
                                  <small className="text-muted d-block">
                                     {item?.color}
                                  </small>
                                )} */}
                                <div>₹{productPrice.toFixed(2)}</div>
                                 <div className="quantity-selector d-flex align-items-center">
                              <Button style={{marginLeft:"0px"}}
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item,
                                    (item?.quantity || 1) - 1
                                  )
                                }
                                disabled={(item?.quantity || 1) <= 1 || loading}
                              >
                                -
                              </Button>
                              <span className="mx-2 fw-bold">
                                {item?.quantity || 1}
                              </span>
                              <Button style={{marginLeft:"0px"}}
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(
                                    item,
                                    (item?.quantity || 1) + 1
                                  )
                                }
                                disabled={loading}
                              >
                                +
                              </Button>
                            </div>
                            <Button className="mt-2"
                              variant="danger"
                              onClick={() => handleRemoveFromCart(item)}
                              disabled={loading}
                            >
                              Remove
                            </Button>
                              </div>
                            </div>
                          <hr ></hr>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {cartItems.length > 0 && (
                <Button
                  variant="outline-danger"
                  className="mt-2 mb-4"
                  onClick={handleClearCart}
                  disabled={loading}
                >
                  Clear Cart
                </Button>
              )}
            </Col>
            {/* </Col> */}
            {/* mobile cart end  */}

            <Col lg={4} md={12}>
              <div className="subtotal-section p-3 shadow-sm border rounded">
                <h5>Order Summary</h5>
                <hr />
                <div className="d-flex justify-content-between">
                  <span>Subtotal:</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span>Shipping:</span>
                  <span>Free</span>
                </div>
                <hr />
                <div className="d-flex justify-content-between">
                  <h5>Total:</h5>
                  <h5>₹{subtotal.toFixed(2)}</h5>
                </div>
                <Button
                  variant="primary"
                  className="mt-3 w-100"
                  onClick={handleSubmit}
                  disabled={loading || cartItems.length === 0}
                  style={{ backgroundColor: "#E9272D", borderColor: "#E9272D" }}
                >
                  Proceed to Checkout
                </Button>
              </div>
            </Col>
          </Row>
        )}
      </Container>
      </div>
      <Footer />
    </>
  );
};

export default CartPage;
