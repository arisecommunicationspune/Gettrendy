"use client"
import { useEffect, useState } from "react"
import { AgGridReact } from "ag-grid-react"
import "ag-grid-community/styles/ag-grid.css"
import "ag-grid-community/styles/ag-theme-quartz.css"
import axios from "axios"
import "./MyOrders.css";
import { BASEURL, authUtils, getImageUrl } from "../Comman/CommanConstans"
import Footer from "../Footer/Footer"
import { Pagination, Stack } from "@mui/material"
import { toast } from "react-toastify"

const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000

const MyOrders = () => {
  const [allOrders, setAllOrders] = useState([])
  const [totalRows, setTotalRows] = useState(0)
  const [loading, setLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(1)
  const [limit, setLimit] = useState(12)
  const [page, setPage] = useState(1)

  const [showReplaceModal, setShowReplaceModal] = useState(false)
  const [selectedOrderIdForReplace, setSelectedOrderIdForReplace] = useState(null)
  const [replaceReason, setReplaceReason] = useState("")
  const [replaceNote, setReplaceNote] = useState("")
  const [myReplacementOrderIds, setMyReplacementOrderIds] = useState(new Set())
  const [replacementStatuses, setReplacementStatuses] = useState({})

  const [showCancelModal, setShowCancelModal] = useState(false)
  const [selectedOrderIdForCancel, setSelectedOrderIdForCancel] = useState(null)
  const [cancelReason, setCancelReason] = useState("")
  const [cancelNote, setCancelNote] = useState("")
  const [myCancellationOrderIds, setMyCancellationOrderIds] = useState(new Set())
  const [cancellationStatuses, setCancellationStatuses] = useState({})

  const getDisplayStatus = (status) => {
    if (!status) return "in progress"
    const s = String(status).toLowerCase()
    if (s === "approved") return "approved"
    if (s === "pending") return "in progress"
    return s
  }

  const isReplaceEligible = (createdAt) => {
    if (!createdAt) return false
    const orderDate = new Date(createdAt).getTime()
    return Date.now() - orderDate <= FIVE_DAYS_MS
  }

const isCancelEligible = (order) => {
  if (!order) return false;

  const status = (order.orderStatus || order.status || "").toLowerCase();

  // Disable cancel if shipped or beyond
  const nonCancelableStatuses = ["shipped", "delivered", "cancelled", "returned", "completed"];

  // Allow cancel for anything before "shipped"
  if (nonCancelableStatuses.includes(status)) return false;

  // Optional: if you still want a time limit, keep this check
  const created = new Date(order.createdAt).getTime();
  const now = Date.now();

  return now - created <= TWO_DAYS_MS; // or remove this line if you want unlimited until shipped
};


  const openReplaceModal = (orderId) => {
    if (myReplacementOrderIds.has(String(orderId))) {
      toast.info("You have already requested replacement for this order.")
      return
    }
    setSelectedOrderIdForReplace(orderId)
    setReplaceReason("")
    setReplaceNote("")
    setShowReplaceModal(true)
  }

  const closeReplaceModal = () => {
    setShowReplaceModal(false)
    setSelectedOrderIdForReplace(null)
    setReplaceReason("")
    setReplaceNote("")
  }

  const openCancelModal = (orderId) => {
    if (myCancellationOrderIds.has(String(orderId))) {
      toast.info("You have already submitted a cancellation request for this order.")
      return
    }
    setSelectedOrderIdForCancel(orderId)
    setCancelReason("")
    setCancelNote("")
    setShowCancelModal(true)
  }

  const closeCancelModal = () => {
    setShowCancelModal(false)
    setSelectedOrderIdForCancel(null)
    setCancelReason("")
    setCancelNote("")
  }

  const submitReplacement = async () => {
    try {
      if (!selectedOrderIdForReplace) return
      if (!replaceReason || replaceReason.trim().length < 3) {
        toast.warning("Please provide a brief reason for replacement (min 3 chars)")
        return
      }
      const token = authUtils.getToken()
      if (!token) {
        toast.error("Please login to submit a replacement request")
        return
      }
      const payload = { reason: replaceReason, note: replaceNote }
      const response = await axios.post(`${BASEURL}/api/orders/return/${selectedOrderIdForReplace}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (response.data?.success) {
        toast.success("Replacement request submitted successfully")
        closeReplaceModal()
        await fetchMyReplacements()
        getAllOrders()
      } else {
        toast.error(response.data?.message || "Failed to submit replacement request")
      }
    } catch (error) {
      console.error("Replacement request error:", error)
      toast.error(error.response?.data?.message || "Failed to submit replacement request")
    }
  }

  const submitCancellation = async () => {
    try {
      console.log("=== submitCancellation START ===")
      if (!selectedOrderIdForCancel) {
        console.log("No order selected")
        return
      }
      if (!cancelReason || cancelReason.trim().length < 3) {
        toast.warning("Please provide a brief reason for cancellation (min 3 chars)")
        return
      }
      const token = authUtils.getToken()
      if (!token) {
        toast.error("Please login to submit a cancellation request")
        return
      }

      const payload = { reason: cancelReason, note: cancelNote }
      console.log("Sending cancellation request:", {
        url: `${BASEURL}/api/orders/${selectedOrderIdForCancel}/cancel-request`,
        payload,
      })

      const response = await axios.post(`${BASEURL}/api/orders/${selectedOrderIdForCancel}/cancel-request`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      })

      console.log("Cancellation response:", response.data)

      if (response.data?.success) {
        toast.success("Cancellation request submitted successfully")
        closeCancelModal()
        await fetchMyCancellations()
        getAllOrders()
      } else {
        toast.error(response.data?.message || "Failed to submit cancellation request")
      }
    } catch (error) {
      console.error("Cancellation request error:", error)
      console.error("Error response:", error.response?.data)
      console.error("Error status:", error.response?.status)
      toast.error(error.response?.data?.message || "Failed to submit cancellation request")
    }
  }

  const fetchMyReplacements = async () => {
    try {
      const token = authUtils.getToken()
      if (!token) return
      const res = await axios.get(`${BASEURL}/api/orders/replacements/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const list = res?.data?.data || res?.data?.rows || []
      const ids = new Set()
      const statuses = {}
      list.forEach((r) => {
        const orderKey = String(r?.orderId?._id || r?.orderId)
        if (orderKey) {
          ids.add(orderKey)
          statuses[orderKey] = r?.status || "pending"
        }
      })
      setMyReplacementOrderIds(ids)
      setReplacementStatuses(statuses)
    } catch (err) {
      console.error("Failed to fetch my replacement requests", err)
    }
  }

  const fetchMyCancellations = async () => {
    try {
      const token = authUtils.getToken()
      if (!token) return
      const res = await axios.get(`${BASEURL}/api/orders/cancellations/my`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      const list = res?.data?.rows || []
      const ids = new Set()
      const statuses = {}
      list.forEach((r) => {
        const orderKey = String(r?.orderId?._id || r?.orderId)
        if (orderKey) {
          ids.add(orderKey)
          statuses[orderKey] = r?.status || "pending"
        }
      })
      setMyCancellationOrderIds(ids)
      setCancellationStatuses(statuses)
    } catch (err) {
      console.error("Failed to fetch my cancellation requests", err)
    }
  }

  const columnDefs = [
    { headerName: "Sr No", field: "sr", sortable: true, filter: true, width: 80 },
    {
      headerName: "Product Images",
      field: "items",
      sortable: false,
      filter: false,
      width: 150,
      cellRenderer: (params) => {
        const items = params.value
        if (!items || !Array.isArray(items) || items.length === 0) {
          return (
            <div style={{ display: "flex", alignItems: "center", height: "100%" }}>
              <img
                src="/placeholder.svg"
                alt="No products"
                style={{ width: 40, height: 40, objectFit: "cover", borderRadius: 4 }}
              />
            </div>
          )
        }
        const imagesToShow = items.slice(0, 3)
        return (
          <div style={{ display: "flex", alignItems: "center", height: "100%", gap: "4px", flexWrap: "wrap" }}>
            {imagesToShow.map((item, index) => {
              let imageUrl = "/placeholder.svg"
              if (item.productId && item.productId.images && item.productId.images.length > 0) {
                imageUrl = getImageUrl(item.productId.images[0])
              }
              return (
                <img
                  key={index}
                  src={imageUrl || "/placeholder.svg"}
                  alt={item.productName || "Product"}
                  style={{ width: 35, height: 35, objectFit: "cover", borderRadius: 4, border: "1px solid #ddd" }}
                  onError={(e) => {
                    e.target.src = "/placeholder.svg"
                  }}
                />
              )
            })}
            {items.length > 3 && (
              <span style={{ fontSize: "12px", color: "#666", marginLeft: "4px" }}>+{items.length - 3}</span>
            )}
          </div>
        )
      },
    },
    {
      headerName: "Order ID",
      field: "_id",
      sortable: true,
      filter: true,
      width: 120,
      valueFormatter: (params) => (params.value ? params.value.slice(-8) : ""),
    },
    {
      headerName: "Items",
      field: "items",
      sortable: false,
      filter: false,
      width: 200,
      cellRenderer: (params) => {
        const items = params.value
        if (!items || !Array.isArray(items)) return "0 items"
        return (
          <div style={{ padding: "8px 0" }}>
            {items.map((item, index) => (
              <div key={index} style={{ marginBottom: "4px", fontSize: "12px" }}>
                <strong>{item.productName}</strong>
                <br />
                <span style={{ color: "#666" }}>
                  Qty: {item.quantity} | Size: {item.size} | Color: {item.color}
                </span>
                <br />
                <span style={{ color: "#28a745", fontWeight: "bold" }}>₹{item.price}</span>
              </div>
            ))}
          </div>
        )
      },
    },
    {
      headerName: "Total Amount",
      field: "totalAmount",
      sortable: true,
      filter: true,
      width: 120,
      valueFormatter: (params) => `₹${params.value || 0}`,
    },
    {
      headerName: "Status",
      field: "status",
      sortable: true,
      filter: true,
      width: 120,
      cellRenderer: (params) => {
        const status = params.value || params.data.orderStatus
        let badgeClass = "badge "
        switch (status) {
          case "delivered":
            badgeClass += "bg-success"
            break
          case "shipped":
            badgeClass += "bg-info"
            break
          case "processing":
            badgeClass += "bg-warning"
            break
          case "cancelled":
            badgeClass += "bg-danger"
            break
          default:
            badgeClass += "bg-secondary"
        }
        return <span className={badgeClass}>{status}</span>
      },
    },
    { headerName: "Payment Method", field: "paymentMethod", sortable: true, filter: true, width: 150 },
    {
      headerName: "Date",
      field: "createdAt",
      sortable: true,
      filter: true,
      width: 120,
      valueFormatter: (params) => (params.value ? new Date(params.value).toLocaleDateString() : ""),
    },
    {
      headerName: "Tracking",
      field: "trackingNumber",
      width: 120,
      cellRenderer: (params) => {
        const trackingNumber = params.value
        if (trackingNumber) {
          return (
            <button
              className="btn btn-info btn-sm"
              onClick={() => handleTrackOrder(trackingNumber)}
              title="Track Order"
            >
              Track
            </button>
          )
        }
        return <span className="text-muted">N/A</span>
      },
    },
    {
      headerName: "Receipt",
      field: "orderId",
      width: 150,
      cellRenderer: (params) => {
        const orderId = params.data.orderId || params.data._id
        return (
          <button className="btn btn-primary btn-sm" onClick={() => handleDownloadReceipt(orderId)}>
            Download Receipt
          </button>
        )
      },
    },
    {
      headerName: "Replace",
      field: "_id",
      width: 180,
      cellRenderer: (params) => {
        const { _id, createdAt } = params.data
        const key = String(_id)
        const alreadyRequested = myReplacementOrderIds.has(key)
        const rawStatus = replacementStatuses[key]
        const display = getDisplayStatus(rawStatus)

        if (!isReplaceEligible(createdAt)) {
          return <span className="text-muted">Not Eligible</span>
        }

        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <button
              className="btn btn-warning btn-sm"
              onClick={() => openReplaceModal(_id)}
              title={alreadyRequested ? "Replacement already requested" : "Request Replacement"}
              disabled={alreadyRequested}
              style={{ cursor: alreadyRequested ? "not-allowed" : "pointer" }}
            >
              Replace
            </button>
            {alreadyRequested ? (
              <small
                style={{
                  fontSize: 12,
                  color: display === "resolved" ? "#28a745" : display === "rejected" ? "#dc3545" : "#fd7e14",
                }}
              >
                ({display})
              </small>
            ) : rawStatus ? (
              <small style={{ fontSize: 12, color: "#6c757d" }}>({display})</small>
            ) : null}
          </div>
        )
      },
    },
    {
      headerName: "Cancel",
      field: "_id",
      width: 180,
      cellRenderer: (params) => {
        const order = params.data
        const { _id } = order
        const key = String(_id)
        const eligible = isCancelEligible(order)
        const requested = myCancellationOrderIds.has(key)
        const status = order.orderStatus || order.status

        if (status === "cancelled") {
          return <span className="text-danger fw-bold">Cancelled</span>
        }

        const rawStatus = cancellationStatuses[key]
        const display = getDisplayStatus(rawStatus)

        return (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6 }}>
            <button
              className="btn btn-outline-danger btn-sm"
              disabled={!eligible || requested}
              onClick={() => openCancelModal(_id)}
            >
              {eligible ? (requested ? "Requested" : "Cancel") : "Not Eligible"}
            </button>
            {requested && (
              <small
                style={{
                  fontSize: 12,
                  color: display === "approved" ? "#28a745" : display === "rejected" ? "#dc3545" : "#fd7e14",
                }}
              >
                ({display})
              </small>
            )}
          </div>
        )
      },
    },
  ]

  const defaultColDef = { flex: 1, minWidth: 100, resizable: true }

  const getAllOrders = async () => {
    try {
      setLoading(true)
      const token = authUtils.getToken()
      if (!token) {
        toast.error("Please login to view your orders")
        return
      }
      const response = await axios.get(`${BASEURL}/api/orders/myorders`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { page, limit },
      })

      if (response.data) {
        let orders = []
        if (Array.isArray(response.data)) {
          orders = response.data
        } else if (response.data.orders && Array.isArray(response.data.orders)) {
          orders = response.data.orders
        } else if (response.data.rows && Array.isArray(response.data.rows)) {
          orders = response.data.rows
        }

        const dataWithSr = orders.map((item, index) => ({
          ...item,
          sr: (page - 1) * limit + index + 1,
        }))

        setAllOrders(dataWithSr)
        setTotalRows(response.data.count || orders.length)
        setTotalPages(response.data.pages_count || Math.ceil(orders.length / limit))
      }
    } catch (error) {
      console.error("Error fetching orders:", error)
      toast.error("Failed to fetch orders")
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (event, value) => setPage(value)
  const handleDownloadReceipt = (orderId) => window.open(`${BASEURL}/api/orders/receipt/${orderId}`, "_blank")
  const handleTrackOrder = (trackingNumber) => window.open(`https://shiprocket.in/tracking/${trackingNumber}`, "_blank")




  useEffect(() => {
    if (!authUtils.isAuthenticated()) {
      toast.warning("Please login to view your orders")
      return
    }
    getAllOrders()
    fetchMyReplacements()
    fetchMyCancellations()
  }, [page, limit])

  return (
    <>
      <div className="container" style={{ marginTop: "150px", marginBottom: "20px" }}>
        <div className="row">
          <h3 className="mb-3" style={{ fontWeight: "bold" }}>
            My Orders
          </h3>
        </div>
          <div className="row">
   {allOrders.length === 0 ? (
    <div className="text-center py-5">No orders found.</div>
  ) : (
    allOrders.map((order, index) => {
      const key = String(order._id)
      const replaceRequested = myReplacementOrderIds.has(key)
      const replaceStatus = getDisplayStatus(replacementStatuses[key])
      const cancelRequested = myCancellationOrderIds.has(key)
      const cancelStatus = getDisplayStatus(cancellationStatuses[key])
      return (
        <div className="col-md-6 col-lg-3 mb-4" key={order._id}>
          <div className="order-card">
            <div className="order-card-header">
              <span>Order ID: {order._id.slice(-8)}</span>
              <span className={`badge status-badge ${order.orderStatus || order.status}`}>{order.orderStatus || order.status}</span>
            </div>
            <div className="order-card-body">
              <div className="order-images">
                {(order.items || []).slice(0, 3).map((item, idx) => (
                  <img
                    key={idx}
                    src={item.productId?.images?.[0] ? getImageUrl(item.productId.images[0]) : "/placeholder.svg"}
                    alt={item.productName}
                    onError={(e) => (e.target.src = "/placeholder.svg")}
                  />
                ))}
                {(order.items?.length > 3) && <span className="extra-count">+{order.items.length - 3}</span>}
              </div>
              <div className="order-items">
                {(order.items || []).map((item, idx) => (
                  <div className="order-item" key={idx}>
                    <strong>{item.productName}</strong>
                    <div>Qty: {item.quantity} | Size: {item.size} | Color: {item.color}</div>
                    <div className="price">₹{item.price}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-card-footer">
              <div>Total: ₹{order.totalAmount}</div>
              <div className="footer-buttons">
                <button className="btn btn-primary btn-sm"  onClick={() => handleDownloadReceipt(order.orderId || order._id)}
    disabled={!order._id && !order.orderId} >Invoice</button>
                <button className="btn btn-info btn-sm"  onClick={() => handleTrackOrder(order.trackingNumber)}
    disabled={!order.trackingNumber} // disable if no tracking
  >Track</button>
                {/* <button
                  className="btn btn-warning btn-sm"
                  disabled={!isReplaceEligible(order.createdAt) || replaceRequested}
                  onClick={() => openReplaceModal(order._id)}
                >
                  {replaceRequested ? "Requested" : "Replace"}
                </button> */}
               {!isCancelEligible(order) ? (
  <button className="btn btn-secondary btn-sm" disabled>
    Not Cancellable
  </button>
) : (
  <button
    className="btn btn-danger btn-sm"
    disabled={cancelRequested}
    onClick={() => openCancelModal(order._id)}
  >
    {cancelRequested ? "Requested" : "Cancel"}
  </button>
)}
              </div>
            </div>
          </div>
        </div>
      )
    })
  )}
</div>
</div>
{totalPages > 1 && ( <div className="mt-4 d-flex justify-content-center"> <Stack spacing={2}> <Pagination count={totalPages} page={page} onChange={handlePageChange} variant="outlined" className="custom-pagination" /> </Stack> </div> )}



      {/* Replacement Modal */}
      {showReplaceModal && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Request Replacement</h5>
                <button type="button" className="btn-close" onClick={closeReplaceModal} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Reason</label>
                  <select
                    className="form-select"
                    value={replaceReason}
                    onChange={(e) => setReplaceReason(e.target.value)}
                  >
                    <option value="">Select a reason</option>
                    <option value="Damaged/Defective product">Damaged/Defective product</option>
                    <option value="Wrong item delivered">Wrong item delivered</option>
                    <option value="Size/fit issue">Size/fit issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Additional note (optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add any details that help us process the replacement"
                    value={replaceNote}
                    onChange={(e) => setReplaceNote(e.target.value)}
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeReplaceModal}>
                  Close
                </button>
                <button type="button" className="btn btn-primary" onClick={submitReplacement} disabled={!replaceReason}>
                  Submit Replacement
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="modal d-block" tabIndex="-1" role="dialog" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Request Cancellation</h5>
                <button type="button" className="btn-close" onClick={closeCancelModal} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Reason</label>
                  <select
                    className="form-select"
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  >
                    <option value="">Select a reason</option>
                    <option value="Change of mind">Change of mind</option>
                    <option value="Ordered by mistake">Ordered by mistake</option>
                    <option value="Found better price elsewhere">Found better price elsewhere</option>
                    <option value="Payment or address issue">Payment or address issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Additional note (optional)</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    placeholder="Add any details that help us process the cancellation"
                    value={cancelNote}
                    onChange={(e) => setCancelNote(e.target.value)}
                  />
                </div>
                <div className="alert alert-warning mb-0" role="alert">
                  Cancellation is only allowed within 2 days of purchase and before shipment.
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={closeCancelModal}>
                  Close
                </button>
                <button type="button" className="btn btn-danger" onClick={submitCancellation} disabled={!cancelReason}>
                  Submit Cancellation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <Footer />
      
    </>
  );
}

export default MyOrders;
