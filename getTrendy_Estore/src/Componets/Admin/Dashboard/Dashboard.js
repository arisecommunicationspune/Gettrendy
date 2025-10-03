"use client"
import { useEffect, useState } from "react"
import { faArrowLeft, faPenToSquare, faPlus, faTrash, faFilter } from "@fortawesome/free-solid-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import { Pagination } from "@mui/material"
import Loader from "../../Client/Loader/Loader"
import { Button, Modal, Form, Row, Col, Card, Badge, Tabs, Tab, Table } from "react-bootstrap"
import { useNavigate, useLocation } from "react-router-dom"
import ApiService from "../../api/services/api-service"
import { getImageUrl, BASEURL, authUtils } from "../../Client/Comman/CommanConstans"
import axios from "axios"

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000

const Dashboard = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState(location.state?.activeTab || "categories")
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [showMessage, setShowMessage] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteItemId, setDeleteItemId] = useState(null)
  const [deleteItemType, setDeleteItemType] = useState(null)
  const [contactsRefreshKey, setContactsRefreshKey] = useState(0)
  const [unseenOrderCount, setUnseenOrderCount] = useState(0)
  const [orderRefreshKey, setOrderRefreshKey] = useState(0)
  const [currentViewingUserId, setCurrentViewingUserId] = useState(null)

  // Replacements (admin) - keep a single source of truth
  const [replacements, setReplacements] = useState([])
  const [replacementsPage, setReplacementsPage] = useState(1)
  const [replacementsTotalPages, setReplacementsTotalPages] = useState(1)

  // Cancellations (admin) - keep a single source of truth
  const [cancellations, setCancellations] = useState([])
  const [cancellationsPage, setCancellationsPage] = useState(1)
  const [cancellationsTotalPages, setCancellationsTotalPages] = useState(1)

  // Admin create replacement modal (on behalf of user)
  const [showAdminReplaceModal, setShowAdminReplaceModal] = useState(false)
  const [adminReplaceReason, setAdminReplaceReason] = useState("")
  const [adminReplaceNote, setAdminReplaceNote] = useState("")
  const [adminReplaceOrder, setAdminReplaceOrder] = useState(null)

  const handleBack = () => navigate("/")
  const handleCloseMessage = () => setShowMessage(false)
  const showMessageAlert = (msg) => {
    setMessage(msg)
    setShowMessage(true)
  }
  const handleOpenDelete = (id, type) => {
    setDeleteItemId(id)
    setDeleteItemType(type)
    setShowDeleteModal(true)
  }
  const handleCloseDelete = () => setShowDeleteModal(false)

  const handleDelete = async () => {
    try {
      setLoading(true)
      handleCloseDelete()
      let response
      switch (deleteItemType) {
        case "category":
          response = await ApiService.deleteCategory(deleteItemId)
          break
        case "subcategory":
          response = await ApiService.deleteSubcategory(deleteItemId)
          break
        case "product":
          response = await ApiService.deleteProduct(deleteItemId)
          break
        default:
          throw new Error("Invalid delete type")
      }
      if (response) {
        showMessageAlert(`${deleteItemType.charAt(0).toUpperCase() + deleteItemType.slice(1)} deleted successfully`)
        if (deleteItemType === "category") {
          getAllCategories()
        } else if (deleteItemType === "subcategory") {
          getAllSubCategories()
        } else if (deleteItemType === "product") {
          fetchProducts()
        }
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Delete error:", error)
      showMessageAlert(`Error deleting ${deleteItemType}: ${error.response?.data?.message || error.message}`)
    }
  }

  // Replacement requests (admin) — unified via axios
  const fetchReplacements = async (page = replacementsPage) => {
    try {
      setLoading(true)
      const token = authUtils.getToken()
      const res = await axios.get(`${BASEURL}/api/orders/replacements`, {
        params: { page, limit: 10 },
        headers: { Authorization: `Bearer ${token}` },
      })
      const rows = res?.data?.rows || []
      setReplacements(rows)
      setReplacementsTotalPages(res?.data?.pages_count || 1)
      if (page !== replacementsPage) setReplacementsPage(page)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching replacements:", error)
      showMessageAlert(error?.response?.data?.message || "Error fetching replacements")
    }
  }

  // Cancellation requests (admin) — already axios + token
  const fetchCancellations = async (page = cancellationsPage) => {
    try {
      setLoading(true)
      const token = authUtils.getToken()
      const res = await axios.get(`${BASEURL}/api/orders/cancellations`, {
        params: { page, limit: 10 },
        headers: { Authorization: `Bearer ${token}` },
      })
      const rows = res?.data?.rows || []
      setCancellations(rows)
      setCancellationsTotalPages(res?.data?.pages_count || 1)
      if (page !== cancellationsPage) setCancellationsPage(page)
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching cancellations:", error)
      showMessageAlert(error?.response?.data?.message || "Error fetching cancellation requests")
    }
  }

  const handleCancellationStatus = async (reqId, status) => {
    try {
      const token = authUtils.getToken()
      await axios.put(
        `${BASEURL}/api/orders/cancellations/${reqId}/status`,
        { status },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showMessageAlert(`Cancellation status updated to ${status}`)
      fetchCancellations(cancellationsPage)
    } catch (err) {
      console.error("Update cancellation status error:", err)
      showMessageAlert(err?.response?.data?.message || "Failed to update cancellation status")
    }
  }

  // ==================== CATEGORIES ====================
  const [categories, setCategories] = useState([])
  const [categoryPage, setCategoryPage] = useState(1)
  const [categoryLimit, setCategoryLimit] = useState(10)
  const [categoryTotalPages, setCategoryTotalPages] = useState(1)

  const categoryColumnDefs = [
    { headerName: "Sr No", field: "sr", sortable: true, filter: true, width: 80 },
    { headerName: "Category Name", field: "category_name", sortable: true, filter: true },
    {
      headerName: "Category Image",
      field: "category_image",
      sortable: false,
      filter: false,
      cellRenderer: (params) => (
        <img
          src={getImageUrl(params.data.category_image) || "/placeholder.svg"}
          alt="category"
          style={{ height: "50px", width: "50px", objectFit: "cover" }}
          onError={(e) => {
            e.target.src = "/placeholder.svg"
          }}
        />
      ),
    },
    { headerName: "Description", field: "category_description", sortable: true, filter: true },
    {
      headerName: "Action",
      field: "_id",
      width: 120,
      cellRenderer: (params) => (
        <div className="d-flex gap-2">
          <FontAwesomeIcon
            icon={faPenToSquare}
            title="Edit"
            className="action-icon"
            style={{ cursor: "pointer", color: "#007bff" }}
            onClick={() =>
              navigate("/admin-main-category", {
                state: { mainCategoryId: params.value },
              })
            }
          />
          <FontAwesomeIcon
            icon={faTrash}
            title="Delete"
            className="action-icon"
            style={{ cursor: "pointer", color: "#dc3545" }}
            onClick={() => handleOpenDelete(params.value, "category")}
          />
        </div>
      ),
    },
  ]

  const getAllCategories = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getCategories(categoryPage, categoryLimit)
      if (response && response.data) {
        const dataWithSr = response.data.rows.map((item, index) => ({
          ...item,
          sr: (categoryPage - 1) * categoryLimit + index + 1,
        }))
        setCategories(dataWithSr)
        setCategoryTotalPages(response.data.pages_count)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching categories:", error)
      showMessageAlert("Error fetching categories")
    }
  }
  const handleCategoryPageChange = (event, value) => setCategoryPage(value)

  // ==================== SUBCATEGORIES ====================
  const [subcategories, setSubcategories] = useState([])
  const [subcategoryPage, setSubcategoryPage] = useState(1)
  const [subcategoryLimit, setSubcategoryLimit] = useState(10)
  const [subcategoryTotalPages, setSubcategoryTotalPages] = useState(1)

  const subcategoryColumnDefs = [
    { headerName: "Sr No", field: "sr", sortable: true, filter: true, width: 80 },
    { headerName: "Subcategory Name", field: "subcategory_name", sortable: true, filter: true },
    {
      headerName: "Parent Category",
      field: "parent_category",
      sortable: true,
      filter: true,
      valueGetter: (params) => params.data.parent_category?.category_name || "N/A",
    },
    {
      headerName: "Image",
      field: "subcategory_logo",
      sortable: false,
      filter: false,
      cellRenderer: (params) => (
        <img
          src={getImageUrl(params.data.subcategory_logo) || "/placeholder.svg"}
          alt="subcategory"
          style={{ height: "50px", width: "50px", objectFit: "cover" }}
          onError={(e) => {
            e.target.src = "/placeholder.svg"
          }}
        />
      ),
    },
    { headerName: "Description", field: "subcategory_description", sortable: true, filter: true },
    {
      headerName: "Action",
      field: "_id",
      width: 120,
      cellRenderer: (params) => (
        <div className="d-flex gap-2">
          <FontAwesomeIcon
            icon={faPenToSquare}
            title="Edit"
            className="action-icon"
            style={{ cursor: "pointer", color: "#007bff" }}
            onClick={() =>
              navigate("/admin-category", {
                state: { categoryID: params.value },
              })
            }
          />
          <FontAwesomeIcon
            icon={faTrash}
            title="Delete"
            className="action-icon"
            style={{ cursor: "pointer", color: "#dc3545" }}
            onClick={() => handleOpenDelete(params.value, "subcategory")}
          />
        </div>
      ),
    },
  ]

  const getAllSubCategories = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getSubcategories(subcategoryPage, subcategoryLimit)
      if (response && response.data) {
        const dataWithSr = response.data.rows.map((item, index) => ({
          ...item,
          sr: (subcategoryPage - 1) * subcategoryLimit + index + 1,
        }))
        setSubcategories(dataWithSr)
        setSubcategoryTotalPages(response.data.pages_count)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching subcategories:", error)
      showMessageAlert("Error fetching subcategories")
    }
  }
  const handleSubcategoryPageChange = (event, value) => setSubcategoryPage(value)

  // ==================== PRODUCTS ====================
  const [products, setProducts] = useState([])
  const [productPage, setProductPage] = useState(1)
  const [productLimit, setProductLimit] = useState(10)
  const [productTotalPages, setProductTotalPages] = useState(1)
  const [showProductFilters, setShowProductFilters] = useState(false)
  const [productFilters, setProductFilters] = useState({
    size: "",
    color: "",
    category: "",
    search: "",
    minPrice: "",
    maxPrice: "",
  })
  const [availableSizes, setAvailableSizes] = useState([])
  const [availableColors, setAvailableColors] = useState([])

  const productColumnDefs = [
    { headerName: "Sr No", field: "sr", sortable: true, filter: true, width: 80 },
    {
      headerName: "Image",
      field: "images",
      sortable: false,
      filter: false,
      width: 100,
      cellRenderer: (params) => {
        const images = params.value
        return images && images.length > 0 ? (
          <img
            src={getImageUrl(images[0]) || "/placeholder.svg"}
            alt="product"
            style={{ height: "50px", width: "50px", objectFit: "cover" }}
            onError={(e) => {
              e.target.src = "/placeholder.svg"
            }}
          />
        ) : (
          <div>No Image</div>
        )
      },
    },
    { headerName: "Product Name", field: "product_name", sortable: true, filter: true },
    {
      headerName: "Price",
      field: "price",
      sortable: true,
      filter: true,
      width: 150,
      cellRenderer: (params) => {
        const product = params.data
        const hasDiscount = product.discount_price && product.discount_price < product.price
        return (
          <div>
            <div style={{ fontWeight: "bold", color: hasDiscount ? "#28a745" : "#000" }}>
              ₹{hasDiscount ? product.discount_price.toFixed(2) : product.price.toFixed(2)}
            </div>
            {hasDiscount && (
              <div style={{ textDecoration: "line-through", fontSize: "0.8em", color: "#6c757d" }}>
                ₹{product.price.toFixed(2)}
              </div>
            )}
          </div>
        )
      },
    },
    {
      headerName: "Discount",
      field: "discount_price",
      sortable: true,
      filter: true,
      width: 100,
      cellRenderer: (params) => {
        const product = params.data
        if (product.discount_price && product.discount_price < product.price) {
          const discountPercent = Math.round(((product.price - product.discount_price) / product.price) * 100)
          return <span style={{ color: "#28a745", fontWeight: "bold" }}>{discountPercent}% OFF</span>
        }
        return <span style={{ color: "#6c757d" }}>No Discount</span>
      },
    },
    {
      headerName: "Category",
      field: "category",
      sortable: true,
      filter: true,
      valueGetter: (params) => params.data.category?.category_name || "N/A",
    },
    { headerName: "Stock", field: "stock", sortable: true, filter: true },
    {
      headerName: "Sizes",
      field: "sizes",
      sortable: false,
      filter: false,
      cellRenderer: (params) => (params.value && params.value.length > 0 ? params.value.join(", ") : "N/A"),
    },
    {
      headerName: "Colors",
      field: "colors",
      sortable: false,
      filter: false,
      cellRenderer: (params) => (params.value && params.value.length > 0 ? params.value.join(", ") : "N/A"),
    },
    {
      headerName: "Action",
      field: "_id",
      width: 120,
      cellRenderer: (params) => (
        <div className="d-flex gap-2">
          <FontAwesomeIcon
            icon={faPenToSquare}
            title="Edit"
            className="action-icon"
            style={{ cursor: "pointer", color: "#007bff" }}
            onClick={() => navigate("/admin-product", { state: { productId: params.value } })}
          />
          <FontAwesomeIcon
            icon={faTrash}
            title="Delete"
            className="action-icon"
            style={{ cursor: "pointer", color: "#dc3545" }}
            onClick={() => handleOpenDelete(params.value, "product")}
          />
        </div>
      ),
    },
  ]

  const fetchProducts = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getProducts(productPage, productLimit, productFilters)
      if (response && response.data) {
        const dataWithSr = response.data.rows.map((item, index) => ({
          ...item,
          sr: (productPage - 1) * productLimit + index + 1,
        }))
        setProducts(dataWithSr)
        setProductTotalPages(response.data.pages_count)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching products:", error)
      showMessageAlert("Error fetching products")
    }
  }

  const getProductFilterOptions = async () => {
    try {
      const response = await ApiService.getProductFilters()
      if (response?.data?.data) {
        if (response.data.data.sizes?.length > 0) setAvailableSizes(response.data.data.sizes)
        if (response.data.data.colors?.length > 0) setAvailableColors(response.data.data.colors)
      }
    } catch (error) {
      console.error("Error fetching filter options:", error)
    }
  }

  const handleProductFilterChange = (e) => {
    const { name, value } = e.target
    setProductFilters((prev) => ({ ...prev, [name]: value }))
  }
  const applyProductFilters = () => {
    setProductPage(1)
    fetchProducts()
  }
  const resetProductFilters = () => {
    setProductFilters({ size: "", color: "", category: "", search: "", minPrice: "", maxPrice: "" })
    setProductPage(1)
    fetchProducts()
  }
  const toggleProductFilters = () => setShowProductFilters(!showProductFilters)
  const handleProductPageChange = (event, value) => setProductPage(value)

  // ==================== USERS ====================
  const [users, setUsers] = useState([])
  const [userPage, setUserPage] = useState(1)
  const [userLimit, setUserLimit] = useState(10)
  const [userTotalPages, setUserTotalPages] = useState(1)
  const [selectedUserOrders, setSelectedUserOrders] = useState([])
  const [showOrdersModal, setShowOrdersModal] = useState(false)
  const [selectedUserContacts, setSelectedUserContacts] = useState([])
  const [showContactsModal, setShowContactsModal] = useState(false)

  const getUnseenOrdersCount = async () => {
    try {
      const response = await ApiService.getUnseenOrdersCount()
      if (response && response.data && response.data.success) setUnseenOrderCount(response.data.count)
    } catch (error) {
      console.error("Error fetching unseen orders count:", error)
    }
  }

  const userColumnDefs = [
    { headerName: "Sr No", field: "sr", sortable: true, filter: true, width: 80 },
    { headerName: "Name", field: "name", sortable: true, filter: true },
    { headerName: "Email", field: "email", sortable: true, filter: true },
    { headerName: "Phone", field: "phone", sortable: true, filter: true },
    { headerName: "Role", field: "role", sortable: true, filter: true },
    {
      headerName: "Created At",
      field: "createdAt",
      sortable: true,
      filter: true,
      valueFormatter: (params) => new Date(params.value).toLocaleString(),
    },
    {
      headerName: "View Orders",
      field: "_id",
      cellRenderer: (params) => (
        <ViewOrdersButton
          userId={params.value}
          onClick={() => handleViewOrders(params.value)}
          refreshKey={orderRefreshKey}
        />
      ),
      width: 130,
    },
    {
      headerName: "Contact Messages",
      field: "email",
      cellRenderer: (params) => (
        <ViewContactMessagesButton
          email={params.value}
          onClick={() => handleViewContactMessages(params.value)}
          refreshKey={contactsRefreshKey}
        />
      ),
      width: 130,
    },
  ]

  const handleViewOrders = async (userId) => {
    setLoading(true)
    try {
      const response = await ApiService.getOrdersByUser(userId)
      if (response && response.data && response.data.orders) {
        setSelectedUserOrders(response.data.orders)
        setShowOrdersModal(true)
        setCurrentViewingUserId(userId)
      } else {
        showMessageAlert("Error: Invalid response from server")
      }
    } catch (error) {
      console.error("Error in handleViewOrders:", error)
      showMessageAlert("Error fetching orders for user")
    }
    setLoading(false)
  }

  const handleViewContactMessages = async (email) => {
    setLoading(true)
    try {
      const response = await ApiService.getContactsByEmail(email)
      if (response && response.data && response.data.contacts) {
        setSelectedUserContacts(response.data.contacts)
        setShowContactsModal(true)
        try {
          await ApiService.markContactsAsRead(email)
          setContactsRefreshKey((k) => k + 1)
        } catch (markReadError) {
          console.error("Error marking contacts as read:", markReadError)
        }
      } else {
        showMessageAlert("No contact messages found")
      }
    } catch (error) {
      console.error("Error fetching contact messages:", error)
      showMessageAlert("Error fetching contact messages")
    }
    setLoading(false)
  }

  useEffect(() => {
    if (activeTab === "categories") {
      getAllCategories()
    } else if (activeTab === "subcategories") {
      getAllSubCategories()
    } else if (activeTab === "products") {
      fetchProducts()
      getProductFilterOptions()
    } else if (activeTab === "users") {
      fetchUsers()
      getUnseenOrdersCount()
    } else if (activeTab === "replacements") {
      fetchReplacements()
    } else if (activeTab === "cancellations") {
      fetchCancellations()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, categoryPage, subcategoryPage, productPage, userPage])

  useEffect(() => {
    const interval = setInterval(() => {
      if (activeTab === "users") getUnseenOrdersCount()
    }, 30000)
    return () => clearInterval(interval)
  }, [activeTab])

  const defaultColDef = { flex: 1, minWidth: 150, resizable: true }

  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await ApiService.getUsers(userPage, userLimit)
      if (response && response.data && response.data.data) {
        const dataWithSr = response.data.data.rows.map((item, index) => ({
          ...item,
          sr: (userPage - 1) * userLimit + index + 1,
        }))
        setUsers(dataWithSr)
        setUserTotalPages(response.data.data.pages_count)
      }
      setLoading(false)
    } catch (error) {
      setLoading(false)
      console.error("Error fetching users:", error)
      showMessageAlert("Error fetching users")
    }
  }
  const handleUserPageChange = (event, value) => setUserPage(value)

  const sortedOrders = [...selectedUserOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))

  const isCancelEligible = (order) => {
    const created = new Date(order.createdAt).getTime()
    const now = Date.now()
    const status = order.orderStatus || order.status
    if (["shipped", "delivered", "cancelled"].includes(status)) return false
    return now - created <= TWO_DAYS_MS
  }

  const cancelEligibilityText = (order) => {
    const created = new Date(order.createdAt).getTime()
    const deadline = new Date(created + TWO_DAYS_MS)
    const status = order.orderStatus || order.status
    if (["cancelled"].includes(status)) return "Cancelled"
    if (["shipped", "delivered"].includes(status)) return "Not eligible"
    if (Date.now() > deadline.getTime()) return "Window expired"
    return `Eligible until ${deadline.toLocaleString()}`
  }

  const handleAdminCancelOrder = async (order) => {
    try {
      const token = authUtils.getToken()
      if (!token) {
        showMessageAlert("Please login again")
        return
      }
      const status = order.orderStatus || order.status
      if (["shipped", "delivered", "cancelled"].includes(status)) {
        showMessageAlert(`Order cannot be cancelled in '${status}' status`)
        return
      }
      await axios.put(
        `${BASEURL}/api/orders/${order._id}/status`,
        { status: "cancelled" },
        { headers: { Authorization: `Bearer ${token}` } },
      )
      showMessageAlert("Order cancelled")
      // refresh orders view
      const response = await ApiService.getOrdersByUser(order.userId?._id || currentViewingUserId)
      if (response?.data?.orders) {
        setSelectedUserOrders(response.data.orders)
      }
    } catch (err) {
      console.error("Admin cancel order error:", err)
      showMessageAlert(err?.response?.data?.message || "Failed to cancel order")
    }
  }

  const openAdminReplaceModal = (order) => {
    setAdminReplaceOrder(order)
    setAdminReplaceReason("")
    setAdminReplaceNote("")
    setShowAdminReplaceModal(true)
  }
  const closeAdminReplaceModal = () => {
    setShowAdminReplaceModal(false)
    setAdminReplaceOrder(null)
    setAdminReplaceReason("")
    setAdminReplaceNote("")
  }
  const submitAdminReplacement = async () => {
    try {
      const token = authUtils.getToken()
      if (!token) {
        showMessageAlert("Please login again")
        return
      }
      if (!adminReplaceReason) {
        showMessageAlert("Please select reason")
        return
      }
      const payload = {
        orderId: adminReplaceOrder._id,
        userId: adminReplaceOrder.userId?._id || currentViewingUserId,
        reason: adminReplaceReason,
        note: adminReplaceNote,
      }
      await axios.post(`${BASEURL}/api/orders/replacements`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      showMessageAlert("Replacement request created")
      closeAdminReplaceModal()
      fetchReplacements(1)
    } catch (err) {
      console.error("Admin replacement create error:", err)
      showMessageAlert(err?.response?.data?.message || "Failed to create replacement request")
    }
  }

  const handleCloseOrdersModal = async () => {
    if (currentViewingUserId) {
      try {
        await ApiService.markOrdersAsSeen(currentViewingUserId)
        setOrderRefreshKey((prev) => prev + 1)
        await getUnseenOrdersCount()
      } catch (markSeenError) {
        console.error("Error marking orders as seen:", markSeenError)
      }
    }
    setShowOrdersModal(false)
    setCurrentViewingUserId(null)
  }

  return (
    <div className="dashboard-container">
      {loading && <Loader />}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <Button variant="outline-secondary" onClick={handleBack} className="me-2">
            <FontAwesomeIcon icon={faArrowLeft} /> Back to Home
          </Button>
          <h2 className="d-inline-block ms-3">Admin Dashboard</h2>
        </div>
      </div>

      <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-4">
        <Tab eventKey="categories" title="Categories">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Categories Management</h3>
            <Button variant="primary" onClick={() => navigate("/admin-main-category")}>
              <FontAwesomeIcon icon={faPlus} /> Add Category
            </Button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
            <AgGridReact
              rowData={categories}
              columnDefs={categoryColumnDefs}
              defaultColDef={defaultColDef}
              pagination={false}
              domLayout="autoHeight"
            />
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Pagination
              count={categoryTotalPages}
              page={categoryPage}
              onChange={handleCategoryPageChange}
              color="primary"
            />
          </div>
        </Tab>

        <Tab eventKey="subcategories" title="Subcategories">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Subcategories Management</h3>
            <Button variant="primary" onClick={() => navigate("/admin-category")}>
              <FontAwesomeIcon icon={faPlus} /> Add Subcategory
            </Button>
          </div>
          <div className="ag-theme-quartz" style={{ height: 800, width: "100%" }}>
            <AgGridReact
              rowData={subcategories}
              columnDefs={subcategoryColumnDefs}
              defaultColDef={defaultColDef}
              pagination={false}
              domLayout="autoHeight"
            />
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Pagination
              count={subcategoryTotalPages}
              page={subcategoryPage}
              onChange={handleSubcategoryPageChange}
              color="primary"
            />
          </div>
        </Tab>

        <Tab eventKey="products" title="Products">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Products Management</h3>
            <div>
              <Button variant="outline-secondary" onClick={toggleProductFilters} className="me-2">
                <FontAwesomeIcon icon={faFilter} /> {showProductFilters ? "Hide Filters" : "Show Filters"}
              </Button>
              <Button variant="primary" onClick={() => navigate("/admin-product")}>
                <FontAwesomeIcon icon={faPlus} /> Add Product
              </Button>
            </div>
          </div>
          {showProductFilters && (
            <Card className="mb-4">
              <Card.Body>
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Size</Form.Label>
                      <Form.Select name="size" value={productFilters.size} onChange={handleProductFilterChange}>
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
                      <Form.Select name="color" value={productFilters.color} onChange={handleProductFilterChange}>
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
                      <Form.Select name="category" value={productFilters.category} onChange={handleProductFilterChange}>
                        <option value="">All Categories</option>
                        {categories.map((category) => (
                          <option key={category._id} value={category._id}>
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
                        value={productFilters.search}
                        onChange={handleProductFilterChange}
                        placeholder="Search products..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <Row>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Min Price</Form.Label>
                      <Form.Control
                        type="number"
                        name="minPrice"
                        value={productFilters.minPrice}
                        onChange={handleProductFilterChange}
                        placeholder="Min price"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={3}>
                    <Form.Group className="mb-3">
                      <Form.Label>Max Price</Form.Label>
                      <Form.Control
                        type="number"
                        name="maxPrice"
                        value={productFilters.maxPrice}
                        onChange={handleProductFilterChange}
                        placeholder="Max price"
                      />
                    </Form.Group>
                  </Col>
                </Row>
                <div className="d-flex justify-content-end">
                  <Button variant="secondary" className="me-2" onClick={resetProductFilters}>
                    Reset
                  </Button>
                  <Button variant="primary" onClick={applyProductFilters}>
                    Apply Filters
                  </Button>
                </div>
              </Card.Body>
            </Card>
          )}
          <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
            <AgGridReact
              rowData={products}
              columnDefs={productColumnDefs}
              defaultColDef={defaultColDef}
              pagination={false}
              domLayout="autoHeight"
            />
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Pagination
              count={productTotalPages}
              page={productPage}
              onChange={handleProductPageChange}
              color="primary"
            />
          </div>
        </Tab>

        <Tab eventKey="replacements" title="Replacements-Requests">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Replacement Requests</h3>
          </div>
          <div className="table-responsive">
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>Date</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {replacements && replacements.length > 0 ? (
                  replacements.map((req) => (
                    <tr key={req._id}>
                      <td>{req._id}</td>
                      <td>{req.orderId?.orderId || req.orderId || "-"}</td>
                      <td>
                        {req.userId?.name || req.user?.name || "N/A"}
                        {req.userId?.email || req.user?.email ? (
                          <span> ({req.userId?.email || req.user?.email})</span>
                        ) : null}
                      </td>
                      <td>{req.createdAt ? new Date(req.createdAt).toLocaleString() : "N/A"}</td>
                      <td>{req.reason || "-"}</td>
                      <td>{req.note || "-"}</td>
                      <td>
                        <Badge
                          bg={
                            req.status === "resolved"
                              ? "success"
                              : req.status === "in_progress"
                                ? "info"
                                : req.status === "rejected"
                                  ? "danger"
                                  : "warning"
                          }
                        >
                          {req.status || "pending"}
                        </Badge>
                      </td>
                      <td className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={async () => {
                            try {
                              const token = authUtils.getToken()
                              await axios.put(
                                `${BASEURL}/api/orders/replacements/${req._id}/status`,
                                { status: "in_progress" },
                                { headers: { Authorization: `Bearer ${token}` } },
                              )
                              fetchReplacements(replacementsPage)
                            } catch (e) {
                              showMessageAlert(e?.response?.data?.message || "Failed to update status")
                            }
                          }}
                        >
                          In Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={async () => {
                            try {
                              const token = authUtils.getToken()
                              await axios.put(
                                `${BASEURL}/api/orders/replacements/${req._id}/status`,
                                { status: "approved" },
                                { headers: { Authorization: `Bearer ${token}` } },
                              )
                              fetchReplacements(replacementsPage)
                            } catch (e) {
                              showMessageAlert(e?.response?.data?.message || "Failed to update status")
                            }
                          }}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={async () => {
                            try {
                              const token = authUtils.getToken()
                              await axios.put(
                                `${BASEURL}/api/orders/replacements/${req._id}/status`,
                                { status: "rejected" },
                                { headers: { Authorization: `Bearer ${token}` } },
                              )
                              fetchReplacements(replacementsPage)
                            } catch (e) {
                              showMessageAlert(e?.response?.data?.message || "Failed to update status")
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center">
                      No replacement requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Pagination
              count={replacementsTotalPages}
              page={replacementsPage}
              onChange={(e, p) => fetchReplacements(p)}
              color="primary"
            />
          </div>
        </Tab>

        <Tab eventKey="cancellations" title="Cancel-Requests">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Cancellation Requests</h3>
          </div>
          <div className="table-responsive">
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Request ID</th>
                  <th>Order ID</th>
                  <th>User</th>
                  <th>Requested At</th>
                  <th>Reason</th>
                  <th>Note</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {cancellations && cancellations.length > 0 ? (
                  cancellations.map((req) => (
                    <tr key={req._id}>
                      <td>{req._id}</td>
                      <td>{req.orderId?.orderId || "-"}</td>
                      <td>
                        {req.userId?.name || "N/A"}
                        {req.userId?.email ? <span> ({req.userId.email})</span> : null}
                      </td>
                      <td>{req.createdAt ? new Date(req.createdAt).toLocaleString() : "N/A"}</td>
                      <td>{req.reason || "-"}</td>
                      <td>{req.note || "-"}</td>
                      <td>
                        <Badge
                          bg={
                            req.status === "approved"
                              ? "success"
                              : req.status === "in_progress"
                                ? "info"
                                : req.status === "rejected"
                                  ? "danger"
                                  : "warning"
                          }
                        >
                          {req.status || "pending"}
                        </Badge>
                      </td>
                      <td className="d-flex gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleCancellationStatus(req._id, "in_progress")}
                        >
                          In Progress
                        </Button>
                        <Button
                          size="sm"
                          variant="success"
                          onClick={() => handleCancellationStatus(req._id, "approved")}
                        >
                          Approve Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleCancellationStatus(req._id, "rejected")}
                        >
                          Reject
                        </Button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center">
                      No cancellation requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Pagination
              count={cancellationsTotalPages}
              page={cancellationsPage}
              onChange={(e, p) => fetchCancellations(p)}
              color="primary"
            />
          </div>
        </Tab>

        <Tab eventKey="users" title="Users">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3>Users Management</h3>
          </div>
          <div className="ag-theme-quartz" style={{ height: 500, width: "100%" }}>
            <AgGridReact
              rowData={users}
              columnDefs={userColumnDefs}
              defaultColDef={defaultColDef}
              pagination={false}
              domLayout="autoHeight"
            />
          </div>
          <div className="d-flex justify-content-center mt-3">
            <Pagination count={userTotalPages} page={userPage} onChange={handleUserPageChange} color="primary" />
          </div>
        </Tab>
      </Tabs>

      {/* Delete Confirmation Modal */}
      <Modal show={showDeleteModal} onHide={handleCloseDelete}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Delete</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to delete this {deleteItemType}? This action cannot be undone.</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseDelete}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Message Modal */}
      <Modal show={showMessage} onHide={handleCloseMessage}>
        <Modal.Header closeButton>
          <Modal.Title>{message.includes("Error") ? "Error" : "Info"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>{message}</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseMessage}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Orders Modal */}
      <Modal show={showOrdersModal} onHide={handleCloseOrdersModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>User Orders</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {sortedOrders.length > 0 ? (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Date</th>
                  <th>Total Amount</th>
                  <th>Payment Status</th>
                  <th>Order Status</th>
                  <th>Cancel Eligibility</th>
                  <th>Actions</th>
                  <th>Address</th>
                  <th>Products</th>
                </tr>
              </thead>
              <tbody>
                {sortedOrders.map((order) => {
                  const s = order.orderStatus || order.status
                  const statusBg =
                    s === "delivered" ? "success" : s === "shipped" ? "info" : s === "cancelled" ? "danger" : "warning"
                  return (
                    <tr key={order.orderId || order._id}>
                      <td>{order.orderId || order._id}</td>
                      <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}</td>
                      <td>₹{order.totalAmount}</td>
                      <td>
                        <Badge bg={order.paymentStatus === "paid" ? "success" : "warning"}>{order.paymentStatus}</Badge>
                      </td>
                      <td>
                        <Badge bg={statusBg}>{s}</Badge>
                      </td>
                      <td>{cancelEligibilityText(order)}</td>
                      <td className="d-flex flex-column gap-2">
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => handleAdminCancelOrder(order)}
                          disabled={["shipped", "delivered", "cancelled"].includes(s)}
                        >
                          Cancel
                        </Button>
                        <Button size="sm" variant="warning" onClick={() => openAdminReplaceModal(order)}>
                          Replace
                        </Button>
                      </td>
                      <td>
                        {order.address
                          ? `${order.address.fullName}, ${order.address.street}, ${order.address.city}, ${order.address.postcode}, ${order.address.country} (Phone: ${order.address.phone})`
                          : "N/A"}
                      </td>
                      <td>
                        <Table size="sm" bordered>
                          <thead>
                            <tr>
                              <th>Image</th>
                              <th>Name</th>
                              <th>Quantity</th>
                              <th>Price</th>
                            </tr>
                          </thead>
                          <tbody>
                            {order.items.map((item, idx) => (
                              <tr key={idx}>
                                <td>
                                  {item.productId && item.productId.images && item.productId.images[0] ? (
                                    <img
                                      src={getImageUrl(item.productId.images[0]) || "/placeholder.svg"}
                                      alt={item.productName}
                                      style={{
                                        width: 50,
                                        height: 50,
                                        objectFit: "cover",
                                        marginRight: 10,
                                        borderRadius: 4,
                                      }}
                                    />
                                  ) : (
                                    <img
                                      src="/placeholder.svg"
                                      alt="No product"
                                      style={{
                                        width: 50,
                                        height: 50,
                                        objectFit: "cover",
                                        marginRight: 10,
                                        borderRadius: 4,
                                      }}
                                    />
                                  )}
                                </td>
                                <td>
                                  <strong>{item.productName}</strong>
                                  <br />
                                  <small>
                                    Size: {item.size} | Color: {item.color}
                                  </small>
                                </td>
                                <td>{item.quantity}</td>
                                <td>₹{item.price}</td>
                              </tr>
                            ))}
                          </tbody>
                        </Table>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </Table>
          ) : (
            <div className="text-center py-4">
              <p>No orders found for this user.</p>
            </div>
          )}
        </Modal.Body>
      </Modal>

      {/* Admin Create Replacement Modal */}
      {showAdminReplaceModal && (
        <Modal show onHide={closeAdminReplaceModal}>
          <Modal.Header closeButton>
            <Modal.Title>Create Replacement Request</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Form.Group className="mb-3">
              <Form.Label>Reason</Form.Label>
              <Form.Select value={adminReplaceReason} onChange={(e) => setAdminReplaceReason(e.target.value)}>
                <option value="">Select a reason</option>
                <option value="Damaged/Defective product">Damaged/Defective product</option>
                <option value="Wrong item delivered">Wrong item delivered</option>
                <option value="Size/fit issue">Size/fit issue</option>
                <option value="Other">Other</option>
              </Form.Select>
            </Form.Group>
            <Form.Group className="mb-0">
              <Form.Label>Additional note (optional)</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Add any details that help process the replacement"
                value={adminReplaceNote}
                onChange={(e) => setAdminReplaceNote(e.target.value)}
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={closeAdminReplaceModal}>
              Close
            </Button>
            <Button variant="primary" onClick={submitAdminReplacement} disabled={!adminReplaceReason}>
              Submit
            </Button>
          </Modal.Footer>
        </Modal>
      )}
    </div>
  )
}

// Component for View Orders Button with notification badge
const ViewOrdersButton = ({ userId, onClick, refreshKey }) => {
  const [unreadCount, setUnreadCount] = useState(0)
  const [allRead, setAllRead] = useState(false)

  useEffect(() => {
    const fetchUnreadOrders = async () => {
      try {
        const response = await ApiService.getOrdersByUser(userId)
        if (response && response.data && response.data.orders) {
          const orders = response.data.orders
          const unread = orders.filter((order) => !order.seenByAdmin).length
          setUnreadCount(unread)
          setAllRead(orders.length > 0 && unread === 0)
        }
      } catch (error) {
        console.error("Error fetching user orders for badge:", error)
      }
    }
    fetchUnreadOrders()
  }, [userId, refreshKey])

  return (
    <Button variant={allRead ? "success" : "info"} size="sm" onClick={onClick} className="position-relative">
      View Orders
      {unreadCount > 0 && (
        <Badge bg="danger" className="ms-2">
          {unreadCount}
        </Badge>
      )}
      {allRead && <span className="ms-2">✓</span>}
    </Button>
  )
}

const ViewContactMessagesButton = ({ email, onClick, refreshKey }) => {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    const fetchUnreadContacts = async () => {
      try {
        const response = await ApiService.getContactsByEmail(email)
        if (response && response.data && response.data.contacts) {
          const unread = response.data.contacts.filter((msg) => !msg.read).length
          setUnreadCount(unread)
        }
      } catch (error) {
        console.error("Error fetching contacts for badge:", error)
      }
    }
    fetchUnreadContacts()
  }, [email, refreshKey])

  return (
    <Button variant="info" size="sm" onClick={onClick}>
      View Messages
      {unreadCount > 0 && (
        <Badge bg="danger" className="ms-2">
          {unreadCount}
        </Badge>
      )}
    </Button>
  )
}

export default Dashboard
