"use client"

import { useEffect, useState } from "react"
import "./ProfilePage.css"
import Footer from "../Footer/Footer"
import { BASEURL, authUtils } from "../Comman/CommanConstans"
import { toast, ToastContainer } from "react-toastify"
import { useNavigate } from "react-router-dom"
import axios from "axios"

const ProfilePage = () => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    fullName: "",
    postcode: "",
    phone: "",
    email: "",
    orderNotes: "",
    profileImage: "",
  })
  const [errors, setErrors] = useState({})
  const [selectedFile, setSelectedFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  // Handle input change
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({ ...formData, [name]: value })
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" })
    }
  }

  // Handle file selection
  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file")
        return
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size should be less than 5MB")
        return
      }

      setSelectedFile(file)
      const fileReader = new FileReader()
      fileReader.onload = () => {
        setPreviewUrl(fileReader.result)
      }
      fileReader.readAsDataURL(file)
    }
  }

  const getUserInfo = async () => {
    try {
      setLoading(true)
      const token = authUtils.getToken()
      if (!token) {
        console.error("User token is missing")
        toast.error("Authentication required")
        navigate("/login")
        return
      }

      console.log("Fetching user profile...")
      const response = await axios.get(`${BASEURL}/api/auth/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      console.log("Profile response:", response.data)

      if (response.data && response.data.success) {
        const userData = response.data.data || response.data
        console.log("User data:", userData)

        setFormData({
          fullName: userData.name || "",
          phone: userData.phone || "",
          email: userData.email || "",
          postcode: userData.pincode || userData.postcode || "",
          profileImage: userData.profileImage || "",
          orderNotes: userData.notes || "",
        })

        if (userData.profileImage) {
          setPreviewUrl(`${BASEURL}${userData.profileImage}`)
        }
      }
    } catch (error) {
      console.error("Error fetching user data:", error)

      if (error.response?.status === 404) {
        console.log("Profile endpoint not found, using fallback data")
        // Use localStorage data as fallback
        setFormData({
          fullName: authUtils.getUserName() || "",
          email: localStorage.getItem("userEmail") || "",
          phone: localStorage.getItem("userPhone") || "",
          postcode: "",
          profileImage: authUtils.getProfileImage() || "",
          orderNotes: "",
        })

        const profileImg = authUtils.getProfileImage()
        if (profileImg) {
          setPreviewUrl(`${BASEURL}${profileImg}`)
        }
      } else {
        toast.error("Failed to load profile data")
      }
    } finally {
      setLoading(false)
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.fullName.trim()) {
      newErrors.fullName = "Full name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required"
    } else if (!/^\d{10}$/.test(formData.phone)) {
      newErrors.phone = "Phone number must be 10 digits"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const updateProfile = async () => {
    if (!validateForm()) {
      toast.error("Please fix the errors in the form")
      return
    }

    try {
      setLoading(true)

      const updateData = {
        name: formData.fullName,
        phone: formData.phone,
        email: formData.email,
        notes: formData.orderNotes || "",
      }

      console.log("Updating profile with:", updateData)

      const response = await axios.put(`${BASEURL}/api/auth/profile`, updateData, {
        headers: {
          Authorization: `Bearer ${authUtils.getToken()}`,
          "Content-Type": "application/json",
        },
      })

      console.log("Update response:", response.data)

      if (response.data && response.data.success) {
        toast.success("Profile Updated Successfully")

        // Update local storage
        authUtils.updateProfile({
          name: formData.fullName,
          profileImage: response.data.profileImage,
        })

        // Navigate after a short delay
        setTimeout(() => {
          navigate("/")
        }, 1500)
      }
    } catch (error) {
      console.error("Error updating profile:", error)

      let message = "Failed to update profile"
      if (error.response?.data?.message) {
        message = error.response.data.message
      } else if (error.response?.status === 404) {
        message = "Profile update endpoint not found"
      } else if (error.response?.status === 401) {
        message = "Authentication required"
        navigate("/login")
      }

      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!authUtils.isAuthenticated()) {
      toast.warning("Please login to view your profile")
      navigate("/login")
      return
    }
    getUserInfo()
  }, [navigate])

  return (
    <>
      <ToastContainer />
      <div className="profile-container" style={{ paddingTop: "50px" }}>
        {loading && (
          <div className="loading-overlay">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}
        <div className="row">
          {/* <div className="col-md-12">
            <h2 className="profile-title">My Profile</h2>
          </div> */}
          <div className="profile-details">
            <div className="">
              <h3 className="mb-3">Edit Profile</h3>
              <form onSubmit={(e) => e.preventDefault()}>
                {/* Profile Image */}
                <div className="profile-image-container mb-4">
                  <div className="profile-image-wrapper">
                    {previewUrl ? (
                      <img src={previewUrl || "/placeholder.svg"} alt="Profile" className="profile-image" />
                    ) : formData.profileImage ? (
                      <img src={`${BASEURL}${formData.profileImage}`} alt="Profile" className="profile-image" />
                    ) : (
                      <div className="profile-placeholder">
                        <div className="placeholder-text">
                          <h4>{formData.fullName ? formData.fullName[0].toUpperCase() : "U"}</h4>
                          <p>Upload Profile Picture</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="mt-2">
                    <input type="file" className="form-control" accept="image/*" onChange={handleFileChange} />
                    <small className="text-muted">Upload a new profile picture (Max 5MB)</small>
                  </div>
                </div>

                {/* Full Name */}
                <div className="form-group">
                  <label>
                    Full Name <span className="require">*</span>
                  </label>
                  <input
                    type="text"
                    className={`form-control ${errors.fullName ? "is-invalid" : ""}`}
                    placeholder="Full Name"
                    name="fullName"
                    value={formData.fullName}
                    onChange={handleChange}
                    required
                  />
                  {errors.fullName && <div className="invalid-feedback">{errors.fullName}</div>}
                </div>

                {/* Phone */}
                <div className="form-group">
                  <label>
                    Phone <span className="require">*</span>
                  </label>
                  <input
                    type="tel"
                    className={`form-control ${errors.phone ? "is-invalid" : ""}`}
                    placeholder="Phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required
                  />
                  {errors.phone && <div className="invalid-feedback">{errors.phone}</div>}
                </div>

                {/* Email */}
                <div className="form-group">
                  <label>
                    Email <span className="require">*</span>
                  </label>
                  <input
                    type="email"
                    className={`form-control ${errors.email ? "is-invalid" : ""}`}
                    placeholder="Email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                  {errors.email && <div className="invalid-feedback">{errors.email}</div>}
                </div>

                {/* Postcode */}
                <div className="form-group">
                  <label>Postcode (optional)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Postcode"
                    name="postcode"
                    value={formData.postcode}
                    onChange={handleChange}
                  />
                </div>

                {/* Order Notes */}
                <div className="form-group">
                  <label>Note</label>
                  <textarea
                    className="form-control"
                    placeholder="Notes about yourself"
                    name="orderNotes"
                    value={formData.orderNotes}
                    onChange={handleChange}
                    rows="3"
                  />
                </div>
              </form>
              <button className="btn button" onClick={updateProfile} disabled={loading}>
                {loading ? "Updating..." : "Update Profile"}
              </button>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </>
  )
}

export default ProfilePage
