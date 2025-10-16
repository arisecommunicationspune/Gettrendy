"use client"

import { useState, useEffect } from "react"
import { faArrowLeft } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { Button, Col, Container, Form, Row, Card, Modal } from "react-bootstrap"
import { useLocation, useNavigate } from "react-router-dom"
import Loader from "../../Client/Loader/Loader"
import ApiService from "../../api/services/api-service"
import { getImageUrl } from "../../Client/Comman/CommanConstans"

const AddCategory = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showMessage, setShowMessage] = useState(false)
  const [categoryId, setCategoryId] = useState(null)
  const [mainCategories, setMainCategories] = useState([])
  const [previewImage, setPreviewImage] = useState(null)
  const [currentImage, setCurrentImage] = useState(null)
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    subcategory_name: "",
    subcategory_description: "",
    parent_category: "",
    subcategory_logo: null,
  })

  // Handle back button
  const handleBack = () => {
    navigate("/admin-dashboard", { state: { activeTab: "subcategories" } })
  }

  // Close message modal
  const handleCloseMessage = () => setShowMessage(false)

  // Show message
  const showMessageAlert = (msg) => {
    setMessage(msg)
    setShowMessage(true)
  }

  // Handle input change
  const handleInputChange = (e) => {
    const { name, value, files } = e.target

    if (files && files[0]) {
      setFormData({ ...formData, [name]: files[0] })

      // Clean up previous preview URL
      if (previewImage && previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage)
      }

      // Create preview URL for the new image
      const previewUrl = URL.createObjectURL(files[0])
      setPreviewImage(previewUrl)
    } else {
      setFormData({ ...formData, [name]: value })
    }

    // Clear error for this field when user makes changes
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  // Fetch all main categories
  const fetchMainCategories = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getCategories(1, 100)
      if (response && response.data && response.data.rows) {
        setMainCategories(response.data.rows)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching main categories:", error)
      showMessageAlert(`Error: ${error.response?.data?.message || error.message}`)
    }
  }

  // Validate form
  const validate = () => {
    const newErrors = {}

    if (!formData.subcategory_name || formData.subcategory_name.trim() === "") {
      newErrors.subcategory_name = "Subcategory name is required"
    }

    if (!formData.parent_category || formData.parent_category.trim() === "") {
      newErrors.parent_category = "Parent category is required"
    }

    // Only require image for new subcategories
    if (!categoryId && !formData.subcategory_logo) {
      newErrors.subcategory_logo = "Subcategory logo is required"
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
      formDataToSend.append("subcategory_name", formData.subcategory_name.trim())
      formDataToSend.append("subcategory_description", formData.subcategory_description.trim())
      formDataToSend.append("parent_category", formData.parent_category)

      // Only append image if a new one is selected
      if (formData.subcategory_logo) {
        formDataToSend.append("subcategory_logo", formData.subcategory_logo)
      }

      // Log FormData contents for debugging
      console.log("FormData contents:")
      for (const pair of formDataToSend.entries()) {
        console.log(pair[0] + ": " + pair[1])
      }

      let response

      if (categoryId) {
        // Update existing subcategory
        console.log("Updating subcategory with ID:", categoryId)
        response = await ApiService.updateSubcategory(categoryId, formDataToSend)
        showMessageAlert("Subcategory updated successfully")
      } else {
        // Create new subcategory
        console.log("Creating new subcategory")
        response = await ApiService.createSubcategory(formDataToSend)
        showMessageAlert("Subcategory added successfully")
      }

      setLoading(false)

      // Navigate back to dashboard with subcategories tab active after a short delay
      setTimeout(() => {
        navigate("/admin-dashboard", { state: { activeTab: "subcategories" } })
      }, 2000)
    } catch (error) {
      setLoading(false)
      console.error("Error saving subcategory:", error)

      // More detailed error logging
      if (error.response) {
        console.error("Error response:", error.response.data)
        console.error("Error status:", error.response.status)
        console.error("Error headers:", error.response.headers)
      }

      showMessageAlert(`Error: ${error.response?.data?.message || error.message}`)
    }
  }

  // Fetch subcategory by ID
  const fetchSubcategoryById = async (id) => {
    try {
      setLoading(true)
      console.log("Fetching subcategory with ID:", id)
      const response = await ApiService.getSubcategoryById(id)

      if (response && response.data && response.data.data) {
        const subcategory = response.data.data
        console.log("Subcategory data received:", subcategory)

        // Set form data from subcategory
        setFormData({
          subcategory_name: subcategory.subcategory_name || "",
          subcategory_description: subcategory.subcategory_description || "",
          parent_category: subcategory.parent_category?._id || "",
          subcategory_logo: null, // Don't load the actual file object, just show preview
        })

        // Set current and preview image if available
        if (subcategory.subcategory_logo) {
          const imageUrl = getImageUrl(subcategory.subcategory_logo)
          console.log("Setting current image:", imageUrl)
          setCurrentImage(subcategory.subcategory_logo)
          setPreviewImage(imageUrl)
        }
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching subcategory:", error)
      showMessageAlert(`Error: ${error.response?.data?.message || error.message}`)
    }
  }

  // Initialize component
  useEffect(() => {
    fetchMainCategories()

    // Check if we're editing an existing subcategory
    const categoryIdFromState = location?.state?.categoryID
    if (categoryIdFromState) {
      console.log("Editing subcategory with ID:", categoryIdFromState)
      setCategoryId(categoryIdFromState)
      fetchSubcategoryById(categoryIdFromState)
    } else {
      console.log("Creating new subcategory")
    }
  }, [location])

  // Cleanup preview URL on unmount
  useEffect(() => {
    return () => {
      if (previewImage && previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage)
      }
    }
  }, [previewImage])

  return (
    <>
      {loading && <Loader />}
      <Container className="py-4">
        <div className="d-flex align-items-center mb-4">
          <Button variant="outline-secondary" onClick={handleBack} className="me-3">
            <FontAwesomeIcon icon={faArrowLeft} />
          </Button>
          <h2 className="mb-0">{categoryId ? "Edit Subcategory" : "Add New Subcategory"}</h2>
        </div>

        <Card>
          <Card.Body>
            <Form onSubmit={handleSubmit} noValidate>
              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Subcategory Name*</Form.Label>
                    <Form.Control
                      type="text"
                      name="subcategory_name"
                      value={formData.subcategory_name}
                      onChange={handleInputChange}
                      isInvalid={!!errors.subcategory_name}
                      placeholder="Enter subcategory name"
                    />
                    <Form.Control.Feedback type="invalid">{errors.subcategory_name}</Form.Control.Feedback>
                  </Form.Group>
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Parent Category*</Form.Label>
                    <Form.Select
                      name="parent_category"
                      value={formData.parent_category}
                      onChange={handleInputChange}
                      isInvalid={!!errors.parent_category}
                    >
                      <option value="">Select Parent Category</option>
                      {mainCategories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.category_name}
                        </option>
                      ))}
                    </Form.Select>
                    <Form.Control.Feedback type="invalid">{errors.parent_category}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <Row>
                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>
                      Subcategory Image{!categoryId && "*"}
                      {categoryId && " (Leave empty to keep current image)"}
                    </Form.Label>
                    <Form.Control
                      type="file"
                      name="subcategory_logo"
                      onChange={handleInputChange}
                      accept="image/*"
                      isInvalid={!!errors.subcategory_logo}
                    />
                    <Form.Control.Feedback type="invalid">{errors.subcategory_logo}</Form.Control.Feedback>
                    <Form.Text className="text-muted">
                      Supported formats: JPG, JPEG, PNG, GIF, WebP, AVIF, png, jpeg, jpg (Max: 5MB)
                    </Form.Text>
                  </Form.Group>

                  {previewImage && (
                    <div className="mt-2">
                      <p className="mb-2">
                        <strong>{categoryId ? "Current Image:" : "Image Preview:"}</strong>
                      </p>
                      <img
                        src={previewImage || "/placeholder.svg"}
                        alt="Subcategory Preview"
                        className="img-thumbnail"
                        style={{ maxHeight: "150px", maxWidth: "200px" }}
                        onError={(e) => {
                          console.error("Image load error:", e)
                          e.target.src = "/placeholder.svg"
                        }}
                      />
                    </div>
                  )}
                </Col>

                <Col md={6}>
                  <Form.Group className="mb-3">
                    <Form.Label>Description</Form.Label>
                    <Form.Control
                      as="textarea"
                      rows={3}
                      name="subcategory_description"
                      value={formData.subcategory_description}
                      onChange={handleInputChange}
                      isInvalid={!!errors.subcategory_description}
                      placeholder="Enter subcategory description (optional)"
                    />
                    <Form.Control.Feedback type="invalid">{errors.subcategory_description}</Form.Control.Feedback>
                  </Form.Group>
                </Col>
              </Row>

              <div className="d-flex justify-content-end mt-3">
                <Button variant="secondary" onClick={handleBack} className="me-2">
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={loading}>
                  {loading ? "Saving..." : categoryId ? "Update Subcategory" : "Add Subcategory"}
                </Button>
              </div>
            </Form>
          </Card.Body>
        </Card>
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

export default AddCategory
