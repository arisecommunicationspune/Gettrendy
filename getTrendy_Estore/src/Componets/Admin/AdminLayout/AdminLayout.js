"use client"

import { useState, useEffect } from "react"
import { Outlet, Link, useNavigate } from "react-router-dom"
import { Nav, Button, Form, Row, Col, Card, Badge } from "react-bootstrap"
import { useAuth } from "../../AuthContext/AuthContext"
import axios from "axios"
import "./AdminLayout.css"

const AdminLayout = ({ children }) => {
  const { logout, userRole } = useAuth()
  const navigate = useNavigate()
  const [collapsed, setCollapsed] = useState(false)
  const [products, setProducts] = useState([])
  const [filteredProducts, setFilteredProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({
    size: "",
    color: "",
    category: "",
    search: "",
  })
  const [categories, setCategories] = useState([])
  const [showFilters, setShowFilters] = useState(false)

  // Available sizes and colors
  const availableSizes = ["XS", "S", "M", "L", "XL", "XXL"]
  const availableColors = ["Red", "Blue", "Green", "Black", "White", "Yellow", "Purple", "Orange", "Pink"]

  const handleLogout = () => {
    logout()
    navigate("/login")
  }

  // Fetch products with filters
  const fetchProducts = async () => {
    try {
      setLoading(true)
      const token = localStorage.getItem("token")

      // Build query string with filters
      let queryParams = "page=1&limit=50"
      if (filters.size) queryParams += `&size=${filters.size}`
      if (filters.color) queryParams += `&color=${filters.color}`
      if (filters.category) queryParams += `&category=${filters.category}`
      if (filters.search) queryParams += `&search=${filters.search}`

      const response = await axios.get(`http://139.59.3.54:5000/api/products?${queryParams}`, {
        headers: {
          "x-access-token": token,
        },
      })

      setProducts(response.data.rows || [])
      setFilteredProducts(response.data.rows || [])
      setLoading(false)
    } catch (error) {
      console.error("Error fetching products:", error)
      setLoading(false)
    }
  }

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await axios.get("http://139.59.3.54:5000/api/category?limit=100", {
        headers: {
          "x-access-token": token,
        },
      })
      setCategories(response.data.rows || [])
    } catch (error) {
      console.error("Error fetching categories:", error)
    }
  }

  // Handle filter changes
  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  // Apply filters
  const applyFilters = () => {
    fetchProducts()
  }

  // Reset filters
  const resetFilters = () => {
    setFilters({
      size: "",
      color: "",
      category: "",
      search: "",
    })
    fetchProducts()
  }

  // Toggle filters visibility
  const toggleFilters = () => {
    setShowFilters(!showFilters)
  }

  // Load data on component mount
  useEffect(() => {
    if (userRole === "admin") {
      fetchCategories()
      fetchProducts()
    }
  }, [userRole])

  // Only render if user has admin role
  if (userRole !== "admin") {
    return <div className="p-5 text-center">Unauthorized access. Please login as an admin.</div>
  }

  return (
    <div className="admin-layout">
      <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
        <div className="sidebar-header">
          <h3>{collapsed ? "A" : "Admin Panel"}</h3>
          <Button variant="link" className="toggle-btn" onClick={() => setCollapsed(!collapsed)}>
            {collapsed ? "→" : "←"}
          </Button>
        </div>
        <Nav className="flex-column">
          <Nav.Link as={Link} to="/admin-dashboard" className="nav-item">
            {collapsed ? "📊" : "Dashboard"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-allcategory" className="nav-item">
            {collapsed ? "🗂️" : "Categories"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-allsubcategory" className="nav-item">
            {collapsed ? "📁" : "Subcategories"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-allproducts" className="nav-item">
            {collapsed ? "🛍️" : "Products"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-orders" className="nav-item">
            {collapsed ? "📦" : "Orders"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-users" className="nav-item">
            {collapsed ? "👥" : "Users"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-store" className="nav-item">
            {collapsed ? "🏪" : "Stores"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-AllInventory" className="nav-item">
            {collapsed ? "📊" : "Inventory"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-delivery-partner" className="nav-item">
            {collapsed ? "🚚" : "Delivery Partners"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-reviews" className="nav-item">
            {collapsed ? "⭐" : "Reviews"}
          </Nav.Link>
          <Nav.Link as={Link} to="/admin-conatctUs" className="nav-item">
            {collapsed ? "📞" : "Contact Messages"}
          </Nav.Link>
        </Nav>
        <div className="sidebar-footer">
          <Button variant="danger" onClick={handleLogout} className="logout-btn">
            {collapsed ? "🚪" : "Logout"}
          </Button>
        </div>
      </div>
      <div className={`main-content ${collapsed ? "expanded" : ""}`}>
        <div className="admin-header">
          <h2>Admin Panel</h2>
          <div className="user-info">
            <span>Welcome, Admin</span>
          </div>
        </div>

        {/* Product Filters Section */}
        {window.location.pathname === "/admin-allproducts" && (
          <div className="filters-section mb-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4>Product Filters</h4>
              <Button variant="outline-primary" size="sm" onClick={toggleFilters}>
                {showFilters ? "Hide Filters" : "Show Filters"}
              </Button>
            </div>

            {showFilters && (
              <Card className="filter-card">
                <Card.Body>
                  <Row>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Size</Form.Label>
                        <Form.Select name="size" value={filters.size} onChange={handleFilterChange}>
                          <option value="">All Sizes</option>
                          {availableSizes.map((size) => (
                            <option key={size} value={size}>
                              {size}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Color</Form.Label>
                        <Form.Select name="color" value={filters.color} onChange={handleFilterChange}>
                          <option value="">All Colors</option>
                          {availableColors.map((color) => (
                            <option key={color} value={color}>
                              {color}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Category</Form.Label>
                        <Form.Select name="category" value={filters.category} onChange={handleFilterChange}>
                          <option value="">All Categories</option>
                          {categories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.category_name}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Search</Form.Label>
                        <Form.Control
                          type="text"
                          name="search"
                          value={filters.search}
                          onChange={handleFilterChange}
                          placeholder="Search products..."
                        />
                      </Form.Group>
                    </Col>
                  </Row>
                  <div className="d-flex justify-content-end">
                    <Button variant="secondary" className="me-2" onClick={resetFilters}>
                      Reset
                    </Button>
                    <Button variant="primary" onClick={applyFilters}>
                      Apply Filters
                    </Button>
                  </div>

                  {/* Active Filters Display */}
                  <div className="mt-3">
                    <h6>Active Filters:</h6>
                    <div className="d-flex flex-wrap gap-2">
                      {filters.size && (
                        <Badge bg="info" className="p-2">
                          Size: {filters.size}
                        </Badge>
                      )}
                      {filters.color && (
                        <Badge bg="info" className="p-2">
                          Color: {filters.color}
                        </Badge>
                      )}
                      {filters.category && (
                        <Badge bg="info" className="p-2">
                          Category:{" "}
                          {categories.find((c) => c.id === filters.category)?.category_name || filters.category}
                        </Badge>
                      )}
                      {filters.search && (
                        <Badge bg="info" className="p-2">
                          Search: {filters.search}
                        </Badge>
                      )}
                      {!filters.size && !filters.color && !filters.category && !filters.search && (
                        <span className="text-muted">No active filters</span>
                      )}
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        )}

        <div className="content-area">{children || <Outlet />}</div>
      </div>
    </div>
  )
}

export default AdminLayout
