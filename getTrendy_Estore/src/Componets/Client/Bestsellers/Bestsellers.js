"use client"

import { useEffect, useState } from "react"
import { Button, Card, Col, Badge, Container, Row } from "react-bootstrap"
import "./Bestsellers.css"
import { FaHeart } from "react-icons/fa"
import Pagination from "@mui/material/Pagination"
import Stack from "@mui/material/Stack"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import { BASEURL, getImageUrl } from "../Comman/CommanConstans"
import Loader from "../Loader/Loader"
import { useAuth } from "../../AuthContext/AuthContext"
import { useCart } from "../../CartContext/CartContext"

const Bestsellers = () => {
  const { userToken } = useAuth()
  const { addToCart } = useCart()
  const [pageAll, setPageAll] = useState(1)
  const [limitAll, setLimitAll] = useState(4)
  const [allProducts, setAllProducts] = useState([])
  const [pagesCountAll, setPagesCountAll] = useState(1)
    const [inCartStatus, setInCartStatus] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const navigate = useNavigate()

  const handleNavigate = () => {
    navigate("/shop")
    window.scroll(0, 0)
  }

  const getAllProducts = async () => {
    try {
      setLoading(true)
      setError(null)

      // Use the dedicated bestseller endpoint
      console.log("Fetching bestsellers from:", `${BASEURL}/api/products/bestseller?page=${pageAll}&limit=${limitAll}&sortBy=random&sortOrder=asc`)

      const response = await axios.get(`${BASEURL}/api/products/bestseller?page=${pageAll}&limit=${limitAll}&sortBy=random&sortOrder=asc`)

      setLoading(false)

      // Log the entire response to see its structure
      console.log("Bestsellers API Response:", response)

      if (response && response.data) {
        // Check if response.data has rows property
        if (response.data.rows) {
          console.log("Bestsellers found:", response.data.rows)
          setAllProducts(response.data.rows)
          setPagesCountAll(response.data.pages_count || 1)
        }
        // Check if response.data is the array directly
        else if (Array.isArray(response.data)) {
          console.log("Bestsellers found (array):", response.data)
          setAllProducts(response.data)
          setPagesCountAll(Math.ceil(response.data.length / limitAll) || 1)
        }
        // Check if response has products property
        else if (response.data.products) {
          console.log("Bestsellers found (products property):", response.data.products)
          setAllProducts(response.data.products)
          setPagesCountAll(response.data.pages_count || 1)
        }
        // Check if response has data property
        else if (response.data.data) {
          console.log("Bestsellers found (data property):", response.data.data)
          setAllProducts(response.data.data)
          setPagesCountAll(response.data.pages_count || 1)
        }
        // If we still don't have products, log an error
        else {
          console.error("No bestsellers found in response:", response)
          setError("No bestseller products found in API response")
        }
      } else {
        console.error("Invalid response:", response)
        setError("Invalid API response")
      }
    } catch (error) {
      setLoading(false)
      console.error("Error fetching bestsellers:", error)
      setError(error.message || "Error fetching bestsellers")
    }
  }

  const truncateText = (text, limit) => {
    if (!text) return ""
    return text.length > limit ? text.slice(0, limit) + "..." : text
  }

  const navigateToProduct = (id) => {
    navigate("/perticularproductpage", { state: { productId: id } })
    window.scroll(0, 0)
  }

  const handleAddToCart = (product) => {
    if (userToken) {
      addToCart(product, 1)
    } else {
      navigate("/login")
      window.scroll(0, 0)
    }
  }

  const renderPaginationCount = () => {
    return pagesCountAll
  }

  const handlePageChange = (event, value) => {
    setPageAll(value)
  }

  const discountAmount = (price, rate) => {
    if (!price) return 0
    const amount = (price * rate) / 100
    const originalPrice = price + amount
    return originalPrice.toFixed(2)
  }

  useEffect(() => {
    getAllProducts()
  }, [pageAll])

  return (
    <>
      {loading ? <Loader /> : ""}
      <Container className="Bestsellers-container">
        <Row>
          <div
            data-aos="fade-down"
            data-aos-duration="2000"
            data-aos-easing="ease-in-out"
            className="section-title mb-5"
          >
            <div className="section-line"></div>
            <div className="text-center">
              <h5>More to Discover</h5>
              <h1>Bestsellers of the week</h1>
            </div>
            <div className="section-line"></div>
          </div>

          {/* Display error message if there is one */}
          {error && <div className="alert alert-danger text-center mb-4">Error: {error}</div>}

          {/* <Col md={4}>
            <div className="promo-banner">
              <h4>Weekend Sales</h4>
              <h2>Unlock Up to 26% Off on Premium Products!</h2>
              <button
                className="btn mt-3"
                style={{ background: "#E9272D", color: "white" }}
                onClick={() => handleNavigate()}
              >
                Shop Now
              </button>{" "}
              <br />
              <img src="/Images/teshirt6.png" alt="Vegetable Bag" className="img-fluid mt-3" />
            </div>
          </Col> */}

          <Col lg={12} md={12} sm={12}>
            <div>
              <Row>
                {allProducts && allProducts.length > 0 ? (
                  allProducts.map((product) => (
                    <Col lg={3} md={4} sm={6} key={product.id || product._id} className="mb-4">
                      <Card className="">
                        <div className="product-image-container">
                          <Card.Img
                            variant="top"
                            src={getImageUrl(
                              product.product_image ||
                                (product.images && product.images.length > 0 ? product.images[0] : null),
                            )}
                            alt={product.product_name}
                            className="particular-product-image"
                            onError={(e) => {
                              console.log("Image error:", e)
                              e.target.src = "/placeholder.svg"
                            }}
                          />
                             {product.images && product.images.length > 1 && (
                                              <Card.Img
                                            src={getImageUrl(product.images[1])}
                                             alt={`${product.product_name} hover`}
                                             className="product-image hover-image"
                                                 onError={(e) => (e.target.src = "/placeholder.svg")}
                                               />
                                            )}
                          
                                                <FaHeart className="heart-icon" />
                                                {inCartStatus[product.id || product._id] && (
                                                  <Badge className="added-to-cart-badge" bg="success">
                                                    Added to cart
                                                  </Badge>
                                                )}
                                            
                        </div>
                        <Card.Body>
                          <Card.Title className="card-product-title">{product.product_name}</Card.Title>
                          <Card.Text className="product-description">
                            {truncateText(product.description || product.product_description, 100)}
                          </Card.Text>
                          <div className="price-section">
                            <div>
                              <span className="price">₹{product.discount_price || product.price}.00</span>
                              {product.discount_price && product.discount_price < product.price && (
                                <span className="original-price">₹{product.price}.00</span>
                              )}
                              {!product.discount_price && (
                                <span className="original-price">₹{discountAmount(product.price, 23)}</span>
                              )}
                            </div>
                            <div className="position">
                              <span className="discount">
                                {product.discount_price
                                  ? Math.round(((product.price - product.discount_price) / product.price) * 100)
                                  : 23}
                                % Off
                              </span>
                            </div>
                          </div>
                          <div className="button-section text-center">
                            <Button
                              variant="outline-dark"
                              className="view-more-btn"
                              onClick={() => navigateToProduct(product.id || product._id)}
                            >
                              View More
                            </Button>
                            {/* <Button
                              className="add-to-cart-btn"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleAddToCart(product)
                              }}
                            >
                              Add To Cart
                            </Button> */}
                          </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))
                ) : (
                  <div className="text-center mb-5">
                    <h4>No Bestseller Products Found</h4>
                    <p>Please check the API connection or try again later.</p>
                  </div>
                )}
              </Row>
            </div>

            {allProducts && allProducts.length > 0 && (
              <div className="display-start mb-5">
                <Stack spacing={2}>
                  <Pagination
                    count={renderPaginationCount()}
                    page={pageAll}
                    variant="outlined"
                    shape="rounded"
                    onChange={handlePageChange}
                  />
                </Stack>
              </div>
            )}
          </Col>
        </Row>
      </Container>
    </>
  )
}

export default Bestsellers
