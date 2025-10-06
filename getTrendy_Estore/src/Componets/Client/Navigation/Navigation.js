"use client"
import { useEffect, useState, useCallback } from "react"
import { Navbar, Nav, NavDropdown, Container, Row, Col, Button, Modal } from "react-bootstrap"
import { FaShoppingCart, FaSignInAlt, FaSignOutAlt, FaRegUserCircle, FaTruck } from "react-icons/fa"
import "./Navigation.css"
import { useLocation, useNavigate } from "react-router-dom"
import { BASEURL, authUtils, cartUtils, getImageUrl } from "../Comman/CommanConstans"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faUser } from "@fortawesome/free-solid-svg-icons"
import { ToastContainer } from "react-toastify"
import caticon from "../../../image/category.png"
import axios from "axios"

const Navigation = () => {
  // All useState, useEffect, etc.
  const [allCategoryList, setAllCategoryList] = useState([])
  const [cartItems, setCartItems] = useState([])
  const [cartQuantity, setCartQuantity] = useState(0)
  const [show, setShow] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [navbarExpanded, setNavbarExpanded] = useState(false)

  const location = useLocation()
  const navigate = useNavigate()

  // Helper to determine if current route is admin
  const isAdminRoute = () => {
    return (
      location.pathname.startsWith("/admin-") ||
      location.pathname === "/unauthorized" ||
      location.pathname === "/categories" ||
      location.pathname === "/confirm-order" ||
      location.pathname === "/delivery-home"
    )
  }

  // FIXED: Remove the onToggle prop and handle manually
  const handleNavbarToggle = useCallback(() => {
    setNavbarExpanded((prev) => !prev)
  }, [])

  // Close navbar when clicking on nav items
  const handleNavClick = useCallback(() => {
    setNavbarExpanded(false)
  }, [])

  useEffect(() => {
    fetchCategories()
    fetchCartItems()

    // Listen for auth changes
    const handleAuthChange = () => {
      fetchCartItems()
    }

    // Listen for cart changes
    const handleCartChange = () => {
      fetchCartItems()
    }

    window.addEventListener("auth-changed", handleAuthChange)
    window.addEventListener("cart-changed", handleCartChange)

    return () => {
      window.removeEventListener("auth-changed", handleAuthChange)
      window.removeEventListener("cart-changed", handleCartChange)
    }
  }, [])

  useEffect(() => {
    const totalQuantity =
      cartItems?.reduce((sum, item) => {
        const quantity = item?.quantity || 0
        return sum + quantity
      }, 0) || 0
    setCartQuantity(totalQuantity)
  }, [cartItems])

  // Conditional rendering AFTER all hooks
  if (isAdminRoute()) {
    return null
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${BASEURL}/api/category`)
      if (response && response.data) {
        // Handle different response formats
        if (response.data.rows) {
          setAllCategoryList(response.data.rows)
        } else if (Array.isArray(response.data)) {
          setAllCategoryList(response.data)
        } else {
          console.error("Unexpected category data format:", response.data)
          setAllCategoryList([])
        }
      } else {
        setAllCategoryList([])
      }
      setLoading(false)
    } catch (error) {
      console.error("Error fetching categories:", error)
      setLoading(false)
      setAllCategoryList([])
    }
  }

  // Fetch cart items
  const fetchCartItems = async () => {
    if (isAuthenticated) {
      try {
        const items = await cartUtils.fetchCartItems()
        setCartItems(items || [])
      } catch (error) {
        console.error("Error fetching cart:", error)
        setCartItems([])
      }
    } else {
      setCartItems([])
    }
  }

  const handleClose = () => setShow(false)
  const handleShow = () => setShow(true)

  // Check if user is authenticated
  const isAuthenticated = authUtils.isAuthenticated()
  const userToken = authUtils.getToken()
  const userName = authUtils.getUserName() || ""
  const userProfileImage = authUtils.getProfileImage() || ""

  const toggleSidebar = () => {
    setIsOpen(!isOpen)
  }

  const moveToCart = () => {
    navigate("/cartPage")
    setIsOpen(false)
    window.scroll(0, 0)
  }

  const moveToCheckout = () => {
    navigate("/checkout")
    setIsOpen(false)
    window.scroll(0, 0)
  }

  const handleLogout = () => {
    authUtils.logout()
    navigate("/login")
    handleClose()
  }

  const navigateToShop = (categoryId) => {
    navigate("/shop", {
      state: { category: categoryId },
      replace: true,
    })
    window.scroll(0, 0)
  }

  // Helper function to safely render category name
  const renderCategoryName = (category) => {
    if (!category) return "Category"
    if (typeof category === "string") return category
    return category.category_name || category.name || "Category"
  }

  return (
    <div>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />

      {/* FIXED: Removed onToggle prop to prevent the error */}
      <Navbar expand="lg" expanded={navbarExpanded} fixed="top" className="navigation text-white bg-navbar">
        <Container style={{ maxWidth: "1450px" }}>
          <Navbar.Brand href="/" onClick={handleNavClick}>
            <div className="logo-img">
              <img src="/Images/logo.jpg" alt="GetTrendy Logo" />
            </div>
          </Navbar.Brand>

          {/* FIXED: Manual toggle button instead of Navbar.Toggle */}
          <button
            className="navbar-toggler"
            type="button"
            onClick={handleNavbarToggle}
            aria-controls="navbar-nav"
            aria-expanded={navbarExpanded}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <Navbar.Collapse id="navbar-nav" className="justify-content-between">
            <Nav className="me-auto mx-auto">
              <Nav.Link href="/" active={location.pathname === "/"} onClick={handleNavClick}>
                <svg width="25" height="26" viewBox="0 0 25 26" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M24.5 12.5V24.5C24.5 24.7652 24.3946 25.0196 24.2071 25.2071C24.0196 25.3946 23.7652 25.5 23.5 25.5H16.5C16.2348 25.5 15.9804 25.3946 15.7929 25.2071C15.6054 25.0196 15.5 24.7652 15.5 24.5V18C15.5 17.8674 15.4473 17.7402 15.3536 17.6464C15.2598 17.5527 15.1326 17.5 15 17.5H10C9.86739 17.5 9.74021 17.5527 9.64645 17.6464C9.55268 17.7402 9.5 17.8674 9.5 18V24.5C9.5 24.7652 9.39464 25.0196 9.20711 25.2071C9.01957 25.3946 8.76522 25.5 8.5 25.5H1.5C1.23478 25.5 0.98043 25.3946 0.792893 25.2071C0.605357 25.0196 0.5 24.7652 0.5 24.5V12.5C0.500246 11.9696 0.711121 11.4611 1.08625 11.0862L11.0863 1.08624C11.4613 0.711449 11.9698 0.500916 12.5 0.500916C13.0302 0.500916 13.5387 0.711449 13.9137 1.08624L23.9137 11.0862C24.2889 11.4611 24.4998 11.9696 24.5 12.5Z"
                    fill="black"
                  />
                </svg>
                &nbsp; Home
              </Nav.Link>

              <Nav.Link href="/shop" active={location.pathname === "/shop"} onClick={handleNavClick}>
                <svg width="27" height="23" viewBox="0 0 27 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M24.5 0.5H2.5C1.96957 0.5 1.46086 0.710714 1.08579 1.08579C0.710714 1.46086 0.5 1.96957 0.5 2.5V20.5C0.5 21.0304 0.710714 21.5391 1.08579 21.9142C1.46086 22.2893 1.96957 22.5 2.5 22.5H24.5C25.0304 22.5 25.5391 22.2893 25.9142 21.9142C26.2893 21.5391 26.5 21.0304 26.5 20.5V2.5C26.5 1.96957 26.2893 1.46086 25.9142 1.08579C25.5391 0.710714 25.0304 0.5 24.5 0.5ZM13.5 15.5C11.9092 15.4983 10.384 14.8657 9.25919 13.7408C8.13433 12.616 7.50165 11.0908 7.5 9.5C7.5 9.23478 7.60536 8.98043 7.79289 8.79289C7.98043 8.60536 8.23478 8.5 8.5 8.5C8.76522 8.5 9.01957 8.60536 9.20711 8.79289C9.39464 8.98043 9.5 9.23478 9.5 9.5C9.5 10.5609 9.92143 11.5783 10.6716 12.3284C11.4217 13.0786 12.4391 13.5 13.5 13.5C14.5609 13.5 15.5783 13.0786 16.3284 12.3284C17.0786 11.5783 17.5 10.5609 17.5 9.5C17.5 9.23478 17.6054 8.98043 17.7929 8.79289C17.9804 8.60536 18.2348 8.5 18.5 8.5C18.7652 8.5 19.0196 8.60536 19.2071 8.79289C19.3946 8.98043 19.5 9.23478 19.5 9.5C19.4983 11.0908 18.8657 12.616 17.7408 13.7408C16.616 14.8657 15.0908 15.4983 13.5 15.5ZM2.5 4.5V2.5H24.5V4.5H2.5Z"
                    fill="black"
                  />
                </svg>
                &nbsp; Shop
              </Nav.Link>

              {/* Categories Dropdown */}
              <NavDropdown
                title={
                  <span className="d-flex align-items-center" style={{ padding: "10px"}}>
                    {" "}
                    {/* 👇 Add SVG Icon */}
                    <img
                      src={caticon}
                      alt="Categories Icon"
                      style={{ width: "40px", height: "auto", marginRight: "6px" }}
                    />
                    Categories
                  </span>
                }
                id="categories-dropdown"
              >
                {allCategoryList && allCategoryList.length > 0 ? (
                  allCategoryList.map((category) => (
                    <NavDropdown.Item
                      key={category._id}
                      onClick={() => {
                        navigateToShop(category._id)
                        handleNavClick()
                      }}
                      className="category-item" 
                    >
                      <div className="d-flex align-items-center">
                        <span className="category-name">{renderCategoryName(category)}</span>
                      </div>
                    </NavDropdown.Item>
                  ))
                ) : (
                  <NavDropdown.Item>No categories found</NavDropdown.Item>
                )}
              </NavDropdown>

              <Nav.Link href="/contact" active={location.pathname === "/contact"} onClick={handleNavClick}>
                <svg width="26" height="27" viewBox="0 0 26 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="M17.5 11.5C17.5 12.0933 17.3241 12.6734 16.9944 13.1667C16.6648 13.6601 16.1962 14.0446 15.6481 14.2716C15.0999 14.4987 14.4967 14.5581 13.9147 14.4424C13.3328 14.3266 12.7982 14.0409 12.3787 13.6213C11.9591 13.2018 11.6734 12.6672 11.5576 12.0853C11.4419 11.5033 11.5013 10.9001 11.7284 10.3519C11.9554 9.80377 12.3399 9.33524 12.8333 9.00559C13.3266 8.67595 13.9067 8.5 14.5 8.5C15.2956 8.5 16.0587 8.81607 16.6213 9.37868C17.1839 9.94129 17.5 10.7044 17.5 11.5ZM25.5 2.5V24.5C25.5 25.0304 25.2893 25.5391 24.9142 25.9142C24.5391 26.2893 24.0304 26.5 23.5 26.5H5.5C4.96957 26.5 4.46086 26.2893 4.08579 25.9142C3.71071 25.5391 3.5 25.0304 3.5 24.5V21.5H1.5C1.23478 21.5 0.98043 21.3946 0.792893 21.2071C0.605357 21.0196 0.5 20.7652 0.5 20.5C0.5 20.2348 0.605357 19.9804 0.792893 19.7929C0.98043 19.6054 1.23478 19.5 1.5 19.5H3.5V14.5H1.5C1.23478 14.5 0.98043 14.3946 0.792893 14.2071C0.605357 14.0196 0.5 13.7652 0.5 13.5C0.5 13.2348 0.605357 12.9804 0.792893 12.7929C0.98043 12.6054 1.23478 12.5 1.5 12.5H3.5V7.5H1.5C1.23478 7.5 0.98043 7.39464 0.792893 7.20711C0.605357 7.01957 0.5 6.76522 0.5 6.5C0.5 6.23478 0.605357 5.98043 0.792893 5.79289C0.98043 5.60536 1.23478 5.5 1.5 5.5H3.5V2.5C3.5 1.96957 3.71071 1.46086 4.08579 1.08579C4.46086 0.710714 4.96957 0.5 5.5 0.5H23.5C24.0304 0.5 24.5391 0.710714 24.9142 1.08579C25.2893 1.46086 25.5 1.96957 25.5 2.5ZM21.3 17.9C20.4145 16.7128 19.2337 15.7781 17.875 15.1887C18.6196 14.5089 19.1413 13.6199 19.3716 12.6382C19.6019 11.6566 19.53 10.6283 19.1654 9.68828C18.8009 8.74823 18.1606 7.94037 17.3287 7.37072C16.4967 6.80106 15.512 6.49623 14.5037 6.49623C13.4955 6.49623 12.5108 6.80106 11.6788 7.37072C10.8469 7.94037 10.2066 8.74823 9.84207 9.68828C9.47749 10.6283 9.40563 11.6566 9.63592 12.6382C9.86621 13.6199 10.3879 14.5089 11.1325 15.1887C9.77105 15.777 8.58755 16.7118 7.7 17.9C7.62121 18.0051 7.56388 18.1246 7.53129 18.2518C7.49869 18.379 7.49148 18.5114 7.51005 18.6414C7.52862 18.7714 7.57262 18.8965 7.63953 19.0095C7.70643 19.1225 7.79494 19.2212 7.9 19.3C8.00506 19.3788 8.12461 19.4361 8.25182 19.4687C8.37903 19.5013 8.51142 19.5085 8.64142 19.49C8.77142 19.4714 8.89649 19.4274 9.00949 19.3605C9.12249 19.2936 9.22121 19.2051 9.3 19.1C9.90546 18.2927 10.6906 17.6375 11.5931 17.1862C12.4957 16.7349 13.4909 16.5 14.5 16.5C15.5091 16.5 16.5043 16.7349 17.4069 17.1862C18.3095 17.6375 19.0945 18.2927 19.7 19.1C19.8591 19.3122 20.096 19.4524 20.3586 19.49C20.6211 19.5275 20.8878 19.4591 21.1 19.3C21.3122 19.1409 21.4524 18.904 21.49 18.6414C21.5275 18.3789 21.4591 18.1122 21.3 17.9Z"
                    fill="black"
                  />
                </svg>
                &nbsp; Contact
              </Nav.Link>

              <Nav.Link href="/Wishlist" active={location.pathname === "/Wishlist"} onClick={handleNavClick}>
                <svg
                  width="26"
                  height="27"
                  viewBox="0 0 26 27"
                  fill="none"
                  stroke="black"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="feather feather-heart"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.8 1-1a5.5 5.5 0 0 0 0-7.8z" />
                </svg>
                &nbsp;
              </Nav.Link>

              {/* FIXED: Moved cart and user menu inside the main Nav */}
              <div className="d-flex align-items-center ms-auto">
                {/* Cart */}
                {isAuthenticated && (
                  <Nav.Link
                    href="#"
                    onClick={(e) => {
                      e.preventDefault()
                      toggleSidebar()
                    }}
                    className="cart-div"
                  >
                    <span
                      className={
                        cartQuantity < 10
                          ? "cart-item-no small-cart cart-desktop"
                          : "cart-item-no large-cart cart-desktop"
                      }
                      style={{ color: "rgb(255, 0, 0)" }}
                    >
                      {cartQuantity}
                    </span>
                    <FaShoppingCart size={24} />
                  </Nav.Link>
                )}

                {isAuthenticated ? (
                  <NavDropdown
                    title={
                      <div className="user-profile-nav">
                        {userProfileImage ? (
                          <img
                            src={getImageUrl(userProfileImage) || "/placeholder.svg"}
                            alt={userName}
                            className="user-profile-image"
                            onError={(e) => {
                              e.target.onerror = null
                              e.target.src = "/Images/default-profile.png"
                            }}
                          />
                        ) : (
                          <FontAwesomeIcon icon={faUser} />
                        )}
                        <span className="ms-2">{userName}</span>
                      </div>
                    }
                    id="user-nav-dropdown"
                  >
                    <NavDropdown.Item
                      onClick={() => {
                        navigate("/profilePage")
                        handleNavClick()
                      }}
                    >
                      <FaRegUserCircle size={20} /> &nbsp; Profile
                    </NavDropdown.Item>
                    <NavDropdown.Item
                      onClick={() => {
                        navigate("/myOrders")
                        handleNavClick()
                      }}
                    >
                      <FaTruck size={20} /> &nbsp; My Orders
                    </NavDropdown.Item>
                    <NavDropdown.Item
                      onClick={() => {
                        handleShow()
                        handleNavClick()
                      }}
                    >
                      <FaSignOutAlt size={24} /> &nbsp; Log Out
                    </NavDropdown.Item>
                  </NavDropdown>
                ) : (
                  <Nav.Link href="/login" onClick={handleNavClick}>
                    <FaSignInAlt size={24} /> &nbsp; Login
                  </Nav.Link>
                )}

                {/* Admin Dashboard link */}
                {typeof window !== "undefined" && localStorage.getItem("role") === "admin" && (
                  <Nav.Link
                    href="/admin-dashboard"
                    active={location.pathname === "/admin-dashboard"}
                    style={{ fontWeight: "bold" }}
                    onClick={handleNavClick}
                  >
                    <button className="btn btn-primary">
                      Admin <br /> Dashboard
                    </button>
                  </Nav.Link>
                )}
              </div>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>

      <Modal show={show} onHide={handleClose}>
        <Modal.Header closeButton>
          <Modal.Title>Alert</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure want to Logout?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
          <Button variant="danger" onClick={handleLogout}>
            Ok
          </Button>
        </Modal.Footer>
      </Modal>

      <div>
        {/* Sidebar */}
        <div className={`sidebar ${isOpen ? "sidebar-open" : ""}`}>
          <div className="cart-header">
            <h2 className="cart-title">Shopping Cart</h2>
            <button className="cart-close-btn" onClick={toggleSidebar}>
              X
            </button>
          </div>
          {/* Cart Items Container with Auto Scroll */}
          <div className="cart-items-container">
            {cartItems && cartItems.length > 0 ? (
              cartItems.map((item) => (
                <div className="customs-shop-card side-border overflow-x-hidden" key={item._id || item.id}>
                  <Row className="align-items-center g-5">
                    <Col xs={4} className="text-center">
                      <img
                        src={getImageUrl(item.image || item.product_image)}
                        alt={item.name || item.product_name}
                        className="shop-img"
                        onError={(e) => {
                          e.target.onerror = null
                          e.target.src = "/placeholder.svg"
                        }}
                      />
                    </Col>
                    <Col xs={8}>
                      <div className="product-card-desc">
                        <p className="rating">
                          ★★★★★ <span style={{ color: "black", marginBottom: "0px" }}>(5.0)</span>
                        </p>
                        <strong className="text-dark">{item.name || item.product_name}</strong>
                        <p className="card-text ">
                          ₹{item.price || item.product_price}.00 * {item.quantity}
                        </p>
                      </div>
                    </Col>
                  </Row>
                </div>
              ))
            ) : (
              <p>No items in the cart</p>
            )}
          </div>
          {/* Fixed Button Section */}
          <div className="end-section">
            <Button onClick={moveToCart} style={{ background: "#E9272D" }}>
              View Cart
            </Button>
            <Button style={{ background: "#E9272D" }} onClick={moveToCheckout}>
              Checkout
            </Button>
          </div>
        </div>
        {/* Overlay */}
        {isOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
      </div>
    </div>
  )
}

export default Navigation
