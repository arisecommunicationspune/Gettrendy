"use client"

import { useEffect, useState } from "react"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { faHeart, faStar } from "@fortawesome/free-solid-svg-icons"
import { Breadcrumb, Button, Form } from "react-bootstrap"
import "./PerticularProductPage.css"
import { FaFacebook, FaLinkedin, FaQuestion, FaStar, FaTelegram, FaTwitter } from "react-icons/fa"
import Footer from "../Footer/Footer"
import { useLocation, useNavigate } from "react-router-dom"
import { BASEURL, authUtils, cartUtils, getImageUrl } from "../Comman/CommanConstans"
import axios from "axios"
import { ToastContainer, toast } from "react-toastify"
import Services from "../Services/Services"

 const PerticularProductPage = () => {
  const navigate = useNavigate()
  const location = useLocation()

  // ✅ STATES
  const [productData, setProductData] = useState({})
  const [selectedImage, setSelectedImage] = useState(null) // <== NEW STATE
  const [rating, setRating] = useState(0)
  const [hover, setHover] = useState(0)
  const [isExpanded, setIsExpanded] = useState(false)
  const [quantity, setQuantity] = useState(1)
  const [selectedSize, setSelectedSize] = useState("M")
  const [selectedColor, setSelectedColor] = useState("Default")
  const [isAddingToCart, setIsAddingToCart] = useState(false)
  const [reviews, setReviews] = useState([])
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    rating: 0,
    name: "",
    email: "",
    description: "",
  })
  const [errors, setErrors] = useState({})

  const productID = location?.state?.productId

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }))
  }

  const validate = () => {
    const errors = {}
    if (!formData.rating) errors.rating = "Rating is required"
    if (!formData.name) errors.name = "Name is required"
    if (!formData.email) errors.email = "Email is required"
    if (!formData.description) errors.description = "Review is required"
    setErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!authUtils.isAuthenticated()) {
      toast.warning("Please login to submit a review")
      navigate("/login")
      window.scroll(0, 0)
      return
    }

    if (!validate()) {
      toast.error("Please fill out all fields")
      return
    }

    try {
      const payload = {
        userId: authUtils.getUserId(),
        productId: productID,
        name: formData.name,
        rating: formData.rating,
        review: formData.description,
      }

      const response = await axios.post(`${BASEURL}/api/review/add`, payload, {
        headers: {
          Authorization: `Bearer ${authUtils.getToken()}`,
        },
      })

      if (response.data) {
        toast.success("Thank you for your review!")
        setFormData({
          rating: 0,
          name: "",
          email: "",
          description: "",
        })
        fetchProductReviews(productID)
      }
    } catch (error) {
      console.error("Error submitting review:", error)
      toast.error("Failed to submit review")
    }
  }

  const toggleReadMore = () => {
    setIsExpanded(!isExpanded)
  }

  const getProductsById = async (id) => {
    try {
      setLoading(true)
      const response = await axios.get(`${BASEURL}/api/products/${id}`)
      if (response.data) {
        const product = response.data.data || response.data
        setProductData(product)

        // ✅ Set default image for main display
        if (product.images && product.images.length > 0) {
          setSelectedImage(product.images[0])
        }

        // Default size and color
        setSelectedSize(product.sizes?.[0] || "M")
        setSelectedColor(product.colors?.[0] || "Default")
      } else {
        toast.error("Product not found")
      }
    } catch (error) {
      console.error("Error fetching product by ID:", error)
      toast.error("Failed to load product details")
    } finally {
      setLoading(false)
    }
  }

  const fetchProductReviews = async (productId) => {
    try {
      const response = await axios.get(`${BASEURL}/api/review`)
      if (response.data && response.data.data) {
        const productReviews = response.data.data.filter((review) => review.productId === productId)
        setReviews(productReviews)
      } else {
        setReviews([])
      }
    } catch (error) {
      console.error("Error fetching reviews:", error)
      setReviews([])
    }
  }

  const handleAddToCart = async () => {
  try {
    if (!authUtils.isAuthenticated()) {
      toast.warning("Please login to add items to cart", { autoClose: 2000 })
      navigate("/login")
      window.scrollTo(0, 0)
      return
    }

    setIsAddingToCart(true)

    const result = await cartUtils.addToCart(
      productData._id,
      quantity,
      selectedSize,
      selectedColor
    )

    if (result?.success) {
      // Show success toast
      const toastId = toast.success("Product added to cart successfully!", {
        autoClose: 2000,
      })

      // Optional manual dismiss before navigating
      setTimeout(() => {
        toast.dismiss(toastId)
        navigate("/cartPage")
        window.scrollTo(0, 0)
      }, 1000)
    } else {
      toast.error(result?.message || "Failed to add product to cart")
    }
  } catch (error) {
    console.error("Error adding to cart:", error)
    toast.error("Failed to add product to cart")
  } finally {
    setIsAddingToCart(false)
  }
}


  useEffect(() => {
    if (productID) {
      getProductsById(productID)
      fetchProductReviews(productID)
    }
  }, [productID])

  const renderCategory = () => {
    const category = productData.category
    if (!category) return "Uncategorized"
    if (typeof category === "string") return category
    if (typeof category === "object") {
      return category.category_name || category.name || "Uncategorized"
    }
    return "Uncategorized"
  }

  if (loading) {
    return (
      <div className="text-center py-5" style={{ paddingTop: "150px" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="section my-3" style={{ paddingTop: "87px", 
      }}>
        <div className="container-fluid" style={{  backgroundColor: "aliceblue", position: "fixed"
      }}>
        <Breadcrumb className="container" style={{  backgroundColor: "aliceblue", paddingTop: "25px"
      }}>
          <Breadcrumb.Item href="/">Home</Breadcrumb.Item>
          <Breadcrumb.Item href="/shop">{renderCategory()}</Breadcrumb.Item>
          <Breadcrumb.Item active>{productData.product_name || productData.name}</Breadcrumb.Item>
        </Breadcrumb>
      </div>
      </div>

      <div className="container my-1" style={{ padding: "90px 0px 50px 0px" }}>
        <div className="row " style={{ marginLeft: "5px", marginRight: "5px" }}>
          {/* ✅ Thumbnail column */}
          <div className="col-md-1 col-sm-3 d-flex flex-column gap-4">
            {productData.images?.map((img, index) => (
              <img
                key={index}
                src={getImageUrl(img)}
                alt={`Thumbnail ${index}`}
                onClick={() => setSelectedImage(img)}
                className="img-fluid rounded-5 thumbnail-image"
                style={{
                  cursor: "pointer",
                  border: selectedImage === img ? "2px solid grey" : "1px solid #ccc",
                }}
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = "/placeholder.svg"
                }}
              />
            ))}
          </div>

          {/* ✅ Main image */}
          <div className="col-md-5 col-sm-9">
            <div className="product-image">
              <img
                src={getImageUrl(selectedImage || "/placeholder.svg")}
                alt={productData.product_name || productData.name || "Product"}
                className="img-fluid"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = "/placeholder.svg"
                }}
              />
            </div>
          </div>

          <div className="col-lg-6 col-md-6 col-sm-12">
            <div className="product-details">
              <p className="product-category">{renderCategory()}</p>
              <h3 className="product-title ">{productData.product_name || productData.name}</h3>
              <p className="stock-status">
                <span className="badge bg-success" style={{paddingTop: "5px"}}>
                  {productData.stock > 0 ? `In Stock (${productData.stock})` : "Out of Stock"}
                </span>
                <FontAwesomeIcon icon={faStar} className="text-warning mx-2" />
                {reviews.length} Reviews
              </p>

              <p className="product-price">
                {productData.discount_price && productData.discount_price < productData.price ? (
                  <>
                    <span className="current-price">₹{productData.discount_price}.00</span>
                    <span className="original-price text-muted text-decoration-line-through ms-2">
                      ₹{productData.price}.00
                    </span>
                  </>
                ) : (
                  <span>₹{productData.price}.00</span>
                )}
              </p>

              <div>
                <p className={`product-description ${isExpanded ? "expanded" : ""}`}>
                  {productData.product_description || productData.description || "No description available"}
                </p>
                {(productData.product_description || productData.description) && (
                  <button onClick={toggleReadMore} className="read-more-btn">
                    {isExpanded ? "Read Less" : "Read More"}
                  </button>
                )}
              </div>

              {/* Size Selection */}
              {productData.sizes && productData.sizes.length > 0 && (
                <div className="size-selection mb-3">
                  <label className="form-label">Size:</label>
                  <div className="size-options">
                    {productData.sizes.map((size, index) => (
                      <button
                        key={index}
                        className={`btn btn-outline-secondary me-2 ${selectedSize === size ? "active" : ""}`}
                        onClick={() => setSelectedSize(size)}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Color Selection */}
              {productData.colors && productData.colors.length > 0 && (
                <div className="color-selection mb-3">
                  <label className="form-label">Color:</label>
                  <div className="color-options">
                    {productData.colors.map((color, index) => (
                      <button
                        key={index}
                        className={`btn btn-outline-secondary me-2 ${selectedColor === color ? "active" : ""}`}
                        onClick={() => setSelectedColor(color)}
                      >
                        {color}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="quantity-selector-container">
                <div className="quantity-selector">
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setQuantity((prev) => Math.max(1, prev - 1))}
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="mx-2">{quantity}</span>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setQuantity((prev) => Math.min(productData.stock || 10, prev + 1))}
                    disabled={quantity >= (productData.stock || 10)}
                  >
                    +
                  </button>
                </div>

                <Button
                  className="btn button add-to-cart"
                  onClick={handleAddToCart}
                  disabled={isAddingToCart || productData.stock <= 0}
                >
                  {isAddingToCart ? "Adding..." : "Add To Cart"}
                </Button>
              </div>

              <div className="mt-3">
                <button className="btn btn-outline-dark">
                  <FontAwesomeIcon icon={faHeart} /> Add Wishlist
                </button>
                <button className="btn btn-outline-dark mx-2">
                  <FaQuestion /> Ask a question
                </button>
              </div>

              <p>SKU: {productData.sku || "AB32335"}</p>
              <p>Category: {renderCategory()}</p>

              <div className="social-icons">
                <FaFacebook className="" />
                <FaTwitter className="" />
                <FaLinkedin className="" />
                <FaTelegram className="" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="container">
        <h6 className="h6-title">DESCRIPTION</h6>
        <h3>{productData.product_name || productData.name}</h3>
        <p style={{ paddingBottom: "30px" }}>{productData.product_description || productData.description}</p>

        <h6 className="h6-title">REVIEWS</h6>
        <div className="reviews-page">
          <div className="reviews-section">
            <div className="customer-reviews-summary">
              <h3>Customer reviews</h3>
              <h1>
                {reviews.length > 0
                  ? (reviews.reduce((acc, review) => acc + review.rating, 0) / reviews.length).toFixed(1)
                  : "0.0"}{" "}
                <FaStar color="#ffc107" />
              </h1>
              <p>({reviews.length} Reviews)</p>
            </div>

            <div className="rating-review">
              <h3>Rating & Review</h3>
              {reviews.length > 0 ? (
                reviews.map((review, index) => (
                  <div key={index} className="single-review">
                    <div className="review-header">
                      <div className="review-rating">
                        {[...Array(5)].map((star, i) => (
                          <FaStar key={i} color={i < review.rating ? "#ffc107" : "#e4e5e9"} />
                        ))}
                      </div>
                      <p>
                        {review.name} • {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <p>{review.review}</p>
                  </div>
                ))
              ) : (
                <p>No reviews yet. Be the first to review this product!</p>
              )}
            </div>
          </div>

          <div className="review-form-section">
            <h3>Review this product</h3>
            <p>Your email address will not be published. Required fields are marked *</p>

            <Form onSubmit={handleSubmit}>
              {/* Rating Selection */}
              <div className="rating-selection">
                <p>Your Rating:</p> &nbsp;
                {[...Array(5)].map((star, index) => {
                  const ratingValue = index + 1
                  return (
                    <FaStar
                      key={index}
                      className="star"
                      color={ratingValue <= (hover || formData.rating) ? "#ffc107" : "#e4e5e9"}
                      onMouseEnter={() => setHover(ratingValue)}
                      onMouseLeave={() => setHover(0)}
                      onClick={() => setFormData({ ...formData, rating: ratingValue })}
                    />
                  )
                })}
                {errors.rating && (
                  <div className="invalid-feedback mt-5" style={{ display: "block" }}>
                    {errors.rating}
                  </div>
                )}
              </div>

              <div className="form-group">
                <Form.Group className="mb-3 mt-3" controlId="formUserName">
                  <label className="mb-2 mt-2">Your Name</label>
                  <Form.Control
                    type="text"
                    name="name"
                    placeholder="Enter your name"
                    value={formData.name}
                    onChange={handleInputChange}
                    isInvalid={!!errors.name}
                  />
                  <Form.Control.Feedback type="invalid">{errors.name}</Form.Control.Feedback>
                </Form.Group>
              </div>

              <div className="form-group">
                <Form.Group className="mb-3 mt-3" controlId="formUserEmail">
                  <label className="mb-2 mt-2">Your Email</label>
                  <Form.Control
                    type="email"
                    name="email"
                    placeholder="Enter your email"
                    value={formData.email}
                    onChange={handleInputChange}
                    isInvalid={!!errors.email}
                  />
                  <Form.Control.Feedback type="invalid">{errors.email}</Form.Control.Feedback>
                </Form.Group>
              </div>

              <div className="form-group">
                <Form.Group className="mb-3 mt-3" controlId="formUserReview">
                  <label className="mb-2 mt-2">Your Review</label>
                  <Form.Control
                    as="textarea"
                    rows={5}
                    name="description"
                    placeholder="Write your review here..."
                    value={formData.description}
                    onChange={handleInputChange}
                    isInvalid={!!errors.description}
                  />
                  <Form.Control.Feedback type="invalid">{errors.description}</Form.Control.Feedback>
                </Form.Group>
              </div>

              <button type="submit" className="btn button mt-4 mb-5">
                Submit
              </button>
            </Form>
          </div>
        </div>
      </div>
      
       <Services />
      <Footer />
      <ToastContainer
      />
    </>
  )
}

export default PerticularProductPage
