"use client"

import { useState, useEffect } from "react"
import { faArrowLeft, faTimes } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Button, Col, Container, Form, Row, Card, Modal, Alert } from "react-bootstrap"
import { useLocation, useNavigate } from "react-router-dom"
import Loader from "../../Client/Loader/Loader"
import ApiService from "../../api/services/api-service"
import { getImageUrl } from "../../Client/Comman/CommanConstans"
import axios from "axios"
import { BASEURL } from "../../Client/Comman/CommanConstans"

const AddProduct = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showMessage, setShowMessage] = useState(false)
  const [productId, setProductId] = useState(null)
  const [categories, setCategories] = useState([])
  const [subcategories, setSubcategories] = useState([])
  const [filteredSubcategories, setFilteredSubcategories] = useState([])
  const [previewImages, setPreviewImages] = useState([])
  const [existingImages, setExistingImages] = useState([])
  const [imagesToDelete, setImagesToDelete] = useState([])
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    product_name: "",
    product_description: "",
    price: "",
    discount_price: "",
    category: "",
    subcategory: "",
    stock: "0",
    bestseller: false,
    sizes: [],
    colors: [],
    images: [],
  })

  // Available sizes and colors
  const availableSizes = ["XS", "S", "M", "L", "XL", "XXL"]
  const availableColors = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Purple", "Orange", "Pink"]

  // Handle back button
  const handleBack = () => {
    navigate("/admin-dashboard", { state: { activeTab: "products" } })
  }

  // Close message modal
  const handleCloseMessage = () => setShowMessage(false)

  // Show message
  const showMessageAlert = (msg) => {
    setMessage(msg)
    setShowMessage(true)
  }

  // Handle input change
 const handleInputChange = async (e) => {
  const { name, value, type, checked, files } = e.target;

  if (type === "checkbox") {
    setFormData({ ...formData, [name]: checked });
  } else if (type === "file") {
    // Handle multiple file uploads
    const fileArray = Array.from(files);
    // Check total image limit (existing + new)
    const totalImages = existingImages.length + formData.images.length + fileArray.length;
    if (totalImages > 3) {
      showMessageAlert(
        `Maximum 3 images allowed. You currently have ${existingImages.length + formData.images.length} images.`,
      );
      return;
    }

    setFormData({ ...formData, [name]: [...formData.images, ...fileArray] });

    // Create preview URLs for the new images
    const newPreviewImages = [...previewImages];
    fileArray.forEach((file) => {
      newPreviewImages.push(URL.createObjectURL(file));
    });
    setPreviewImages(newPreviewImages);
  } else if (name === "category") {
    // When category changes, reset subcategory and update form
    setFormData({ ...formData, [name]: value, subcategory: "" });

   try {
    // fetch subcategories for selected category
  console.log("Fetching subcategories for category", value);
  const response = await axios.get(`${BASEURL}/api/subcategory?parent_category=${value}`);
  console.log("Subcategory API response:", response.data);
  setFilteredSubcategories(response.data.rows || []);
} catch (error) {
  console.error("Error fetching subcategories for category:", error);
  setFilteredSubcategories([]);
}

  } else if (name === "sizes" || name === "colors") {
    // Handle multi-select for sizes and colors
    const selectedValues = Array.from(e.target.selectedOptions, (option) => option.value);
    setFormData({ ...formData, [name]: selectedValues });
  } else {
    setFormData({ ...formData, [name]: value });
  }

  // Clear error for this field when user makes changes
  if (errors[name]) {
    setErrors({ ...errors, [name]: "" });
  }
};



  // Remove existing image
  const removeExistingImage = (index) => {
    const imageToDelete = existingImages[index]
    const newExistingImages = [...existingImages]
    newExistingImages.splice(index, 1)
    setExistingImages(newExistingImages)

    // Track images to delete
    setImagesToDelete([...imagesToDelete, imageToDelete])
  }

  // Remove new preview image
  const removeNewImage = (index) => {
    const newImages = [...formData.images]
    newImages.splice(index, 1)
    const newPreviews = [...previewImages]
    URL.revokeObjectURL(newPreviews[index]) // Clean up the URL
    newPreviews.splice(index, 1)

    setFormData({ ...formData, images: newImages })
    setPreviewImages(newPreviews)
  }

  // Validate form
  const validate = () => {
    const newErrors = {}

    if (!formData.product_name || formData.product_name.trim() === "") {
      newErrors.product_name = "Product name is required"
    }

    if (!formData.product_description || formData.product_description.trim() === "") {
      newErrors.product_description = "Description is required"
    }

    if (!formData.price) {
      newErrors.price = "Price is required"
    }

    if (formData.price && (isNaN(formData.price) || Number(formData.price) <= 0)) {
      newErrors.price = "Price must be a valid positive number"
    }

    if (formData.discount_price && (isNaN(formData.discount_price) || Number(formData.discount_price) <= 0)) {
      newErrors.discount_price = "Discount price must be a valid positive number"
    }

    if (formData.discount_price && formData.price && Number(formData.discount_price) >= Number(formData.price)) {
      newErrors.discount_price = "Discount price must be less than regular price"
    }

    if (!formData.category) {
      newErrors.category = "Category is required"
    }

    if (formData.stock && (isNaN(formData.stock) || Number(formData.stock) < 0)) {
      newErrors.stock = "Stock must be a valid non-negative number"
    }

    // Check image requirements
    const totalImages = existingImages.length + formData.images.length
    if (!productId && totalImages === 0) {
      newErrors.images = "At least one image is required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      showMessageAlert("Please correct the errors before submitting")
      return
    }

    try {
      setLoading(true)

      // Create FormData object for the API request
      const formDataToSend = new FormData()
      formDataToSend.append("product_name", formData.product_name.trim())
      formDataToSend.append("product_description", formData.product_description.trim())
      formDataToSend.append("price", Number(formData.price))

      // Only send discount_price if it's provided and not empty
      if (formData.discount_price && formData.discount_price.trim() !== "") {
        formDataToSend.append("discount_price", Number(formData.discount_price))
      }

      formDataToSend.append("category", formData.category)

      if (formData.subcategory) {
        formDataToSend.append("subcategory", formData.subcategory)
      }

      formDataToSend.append("stock", Number(formData.stock) || 0)
      formDataToSend.append("bestseller", formData.bestseller)

      // Add sizes and colors
      formData.sizes.forEach((size) => {
        formDataToSend.append("sizes", size)
      })

      formData.colors.forEach((color) => {
        formDataToSend.append("colors", color)
      })

      // Handle images for update
      if (productId) {
        // If we have new images or deleted existing images, replace all
        if (formData.images.length > 0 || imagesToDelete.length > 0) {
          formDataToSend.append("replace_all_images", "true")
        }
      }

      // Add new images
      if (formData.images && formData.images.length > 0) {
        formData.images.forEach((image) => {
          if (image instanceof File) {
            formDataToSend.append("images", image)
          }
        })
      }

      let response

      if (productId) {
        // Update existing product
        console.log("Updating product with ID:", productId)
        response = await ApiService.updateProduct(productId, formDataToSend)
        showMessageAlert("Product updated successfully")
      } else {
        // Create new product
        console.log("Creating new product")
        response = await ApiService.createProduct(formDataToSend)
        showMessageAlert("Product added successfully")
      }

      setLoading(false)

      // Navigate back to dashboard with products tab active after a short delay
      setTimeout(() => {
        navigate("/admin-dashboard", { state: { activeTab: "products" } })
      }, 2000)
    } catch (error) {
      setLoading(false)
      console.error("Error saving product:", error)
      showMessageAlert(`Error: ${error.response?.data?.message || error.message}`)
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await ApiService.getCategories(1, 100)
      if (response && response.data) {
        setCategories(response.data.rows || [])
      }
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  // Fetch subcategories
  const fetchSubcategories = async () => {
    try {
      const response = await ApiService.getSubcategories(1, 100)
      if (response && response.data) {
        setSubcategories(response.data.rows || [])
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error)
    }
  }

  // Fetch product by ID
  const fetchProductById = async (id) => {
    try {
      setLoading(true)
      console.log("Fetching product with ID:", id)
      const response = await ApiService.getProductById(id)

      if (response && response.data && response.data.data) {
        const product = response.data.data
        console.log("Product data received:", product)

        // Set form data from product
        setFormData({
          product_name: product.product_name || "",
          product_description: product.product_description || "",
          price: product.price?.toString() || "",
          discount_price: product.discount_price?.toString() || "",
          category: product.category?._id || "",
          subcategory: product.subcategory?._id || "",
          stock: product.stock?.toString() || "0",
          bestseller: product.bestseller || false,
          sizes: product.sizes || [],
          colors: product.colors || [],
          images: [], // Reset new images array
        })

        // Filter subcategories based on selected category
        if (product.category?._id && subcategories.length > 0) {
          const filtered = subcategories.filter((subcategory) => subcategory.parent_category === product.category._id)
          setFilteredSubcategories(filtered)
        }

        // Set existing images from product using getImageUrl helper
        if (product.images && product.images.length > 0) {
          const imageUrls = product.images.map((img) => getImageUrl(img))
          setExistingImages(imageUrls)
          console.log("Setting existing images:", imageUrls)
        }

        // Reset preview images and images to delete
        setPreviewImages([])
        setImagesToDelete([])
      }

      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching product:", error)
      showMessageAlert(`Error: ${error.response?.data?.message || error.message}`)
    }
  }

  // Initialize component
  useEffect(() => {
    const initializeComponent = async () => {
      await fetchCategories()
      await fetchSubcategories()
    }
    initializeComponent()
  }, [])

  // Handle product loading after subcategories are loaded
  useEffect(() => {
    const productIdFromState = location?.state?.productId
    if (productIdFromState && subcategories.length > 0) {
      console.log("Editing product with ID:", productIdFromState)
      setProductId(productIdFromState)
      fetchProductById(productIdFromState)
    } else if (!productIdFromState) {
      console.log("Creating new product")
    }
  }, [location, subcategories])

  // Update filtered subcategories when subcategories are loaded
useEffect(() => {
  if (formData.category && subcategories.length > 0) {
    const filtered = subcategories.filter(subcategory => 
      (subcategory.parent_category && typeof subcategory.parent_category === 'object' && subcategory.parent_category._id === formData.category) ||
      subcategory.parent_category === formData.category
    );
    setFilteredSubcategories(filtered);
  } else {
    setFilteredSubcategories([]);
  }
}, [formData.category, subcategories]);


  // Cleanup preview URLs on unmount
  useEffect(() => {
    return () => {
      previewImages.forEach((url) => {
        if (url.startsWith("blob:")) {
          URL.revokeObjectURL(url)
        }
      })
    }
  }, [previewImages])

  return (
    <>
      {loading && <Loader />}
      <Container className="py-4">
        <div className="d-flex align-items-center mb-4">
          <Button variant="outline-secondary" onClick={handleBack} className="me-3">
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
          <h2 className="mb-0">{productId ? "Edit Product" : "Add New Product"}</h2>
        </div>

        <Form onSubmit={handleSubmit}>
          <Card className="mb-4">
            <Card.Header>
              <h4>Basic Information</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Product Name*</Form.Label>
                    <Form.Control
                      type="text"
                      name="product_name"
                      value={formData.product_name}
                      onChange={handleInputChange}
                      isInvalid={!!errors.product_name}
                      placeholder="Enter product name"
                    />
                    <Form.Control.Feedback type="invalid">{errors.product_name}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Regular Price*</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0.01"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          isInvalid={!!errors.price}
                          placeholder="0.00"
                        />
                        <Form.Control.Feedback type="invalid">{errors.price}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Discount Price</Form.Label>
                        <Form.Control
                          type="number"
                          step="0.01"
                          min="0.01"
                          name="discount_price"
                          value={formData.discount_price}
                          onChange={handleInputChange}
                          isInvalid={!!errors.discount_price}
                          placeholder="0.00"
                        />
                        <Form.Control.Feedback type="invalid">{errors.discount_price}</Form.Control.Feedback>
                        <Form.Text className="text-muted">Optional. Must be less than regular price.</Form.Text>
                      </Form.Group>
                    </Col>
                  </Row>
                </Col>
              </Row>
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>Description*</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="product_description"
                      value={formData.product_description}
                      onChange={handleInputChange}
                      isInvalid={!!errors.product_description}
                      placeholder="Enter product description"
                    />
                    <Form.Control.Feedback type="invalid">{errors.product_description}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h4>Categories</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Category*</Form.Label>
                    <Form.Select
                      name="category"
                      value={formData.category}
                      onChange={handleInputChange}
                      isInvalid={!!errors.category}
                    >
                      <option value="">Select Category</option>
                      {categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.category_name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.category}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subcategory</Form.Label>
                    <Form.Select
                      name="subcategory"
                      value={formData.subcategory}
                      onChange={handleInputChange}
                      disabled={!formData.category}
                    >
                      <option value="">Select Subcategory</option>
                      {filteredSubcategories.map((subcategory) => (
                        <option key={subcategory._id} value={subcategory._id}>
                          {subcategory.subcategory_name}
                        </option>
                      ))}
                    </Form.Select>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h4>Inventory</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Stock</Form.Label>
                    <Form.Control
                      type="number"
                      min="0"
                      name="stock"
                      value={formData.stock}
                      onChange={handleInputChange}
                      isInvalid={!!errors.stock}
                      placeholder="0"
                    />
                    <Form.Control.Feedback type="invalid">{errors.stock}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Check
                      type="checkbox"
                      label="Bestseller Product"
                      name="bestseller"
                      checked={formData.bestseller}
                      onChange={handleInputChange}
                    />
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h4>Variants</h4>
            </Card.Header>
            <Card.Body>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Sizes</Form.Label>
                    <Form.Select
                      multiple
                      name="sizes"
                      value={formData.sizes}
                      onChange={handleInputChange}
                      style={{ height: "150px" }}
                    >
                      {availableSizes.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">Hold Ctrl (or Cmd on Mac) to select multiple sizes</Form.Text>
                  </Form.Group>
                </Col>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Colors</Form.Label>
                    <Form.Select
                      multiple
                      name="colors"
                      value={formData.colors}
                      onChange={handleInputChange}
                      style={{ height: "150px" }}
                    >
                      {availableColors.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Text className="text-muted">Hold Ctrl (or Cmd on Mac) to select multiple colors</Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Header>
              <h4>Images</h4>
            </Card.Header>
            <Card.Body>
              {/* Existing Images */}
              {productId && existingImages.length > 0 && (
                <div className="mb-4">
                  <h5>Current Images:</h5>
                  <Alert variant="info">Uploading new images will replace all current images.</Alert>
                  <div className="d-flex flex-wrap gap-3 mt-2">
                    {existingImages.map((image, index) => (
                      <div key={`existing-${index}`} className="position-relative" style={{ width: "150px" }}>
                        <img
                          src={image || "/placeholder.svg"}
                          alt={`Current ${index + 1}`}
                          className="img-thumbnail"
                          style={{
                            width: "100%",
                            height: "150px",
                            objectFit: "cover",
                          }}
                          onError={(e) => {
                            e.target.src = "/placeholder.svg"
                          }}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0"
                          onClick={() => removeExistingImage(index)}
                          title="Remove image"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Image Upload */}
              <Form.Group className="mb-3">
                <Form.Label>{productId ? "New Images (will replace current images)" : "Product Images*"}</Form.Label>
                <Form.Control
                  type="file"
                  name="images"
                  onChange={handleInputChange}
                  multiple
                  accept="image/*"
                  isInvalid={!!errors.images}
                />
                <Form.Control.Feedback type="invalid">{errors.images}</Form.Control.Feedback>
                <Form.Text className="text-muted">
                  You can select multiple images at once. Maximum 5 images allowed. Supported formats: JPG, JPEG, PNG,
                  GIF, WebP, AVIF, jpeg, jpg, png (Max: 5MB each)
                </Form.Text>
              </Form.Group>

              {/* New Image Previews */}
              {previewImages.length > 0 && (
                <div className="mt-3">
                  <h5>New Image Previews:</h5>
                  <div className="d-flex flex-wrap gap-3 mt-2">
                    {previewImages.map((preview, index) => (
                      <div key={`new-${index}`} className="position-relative" style={{ width: "150px" }}>
                        <img
                          src={preview || "/placeholder.svg"}
                          alt={`New Preview ${index + 1}`}
                          className="img-thumbnail"
                          style={{
                            width: "100%",
                            height: "150px",
                            objectFit: "cover",
                          }}
                        />
                        <Button
                          variant="danger"
                          size="sm"
                          className="position-absolute top-0 end-0"
                          onClick={() => removeNewImage(index)}
                          title="Remove image"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card.Body>
          </Card>

          <div className="d-flex justify-content-end mb-5">
            <Button variant="secondary" onClick={handleBack} className="me-2">
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? "Saving..." : productId ? "Update Product" : "Add Product"}
            </Button>
          </div>
        </Form>
      </Container>

      {/* Message Modal */}
      <Modal show={showMessage} onHide={handleCloseMessage}>
        <Modal.Header closeButton>
          <Modal.Title>{message.includes("Error") ? "Error" : "Success"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{message}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseMessage}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  )
}

export default AddProduct
