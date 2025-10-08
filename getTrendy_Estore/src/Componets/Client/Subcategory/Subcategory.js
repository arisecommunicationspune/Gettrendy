"use client"

import { useEffect, useState } from "react"
import { Container, Card } from "react-bootstrap"
import { useNavigate } from "react-router-dom"
import axios from "axios"
import Slider from "react-slick"
import { BASEURL, getImageUrl } from "../Comman/CommanConstans"
import Loader from "../Loader/Loader"
import "slick-carousel/slick/slick.css"
import "slick-carousel/slick/slick-theme.css"
import "./Subcategory.css"

const Categories = () => {
  const navigate = useNavigate()
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`${BASEURL}/api/subcategory?limit=20`)
      const subcategoriesData = response.data.rows || response.data.data || response.data || []
      setCategories(subcategoriesData)
      setLoading(false)
    } catch (error) {
      console.error("Error fetching subcategories:", error)
      setLoading(false)
    }
  }

  // Navigate to shop with selected subcategory 
  const navigateToSubcategory = (subcategoryId) => {
    navigate("/shop", { state: { subcategory: subcategoryId } })
    window.scrollTo(0, 0)
  }
   
 

  useEffect(() => {
    fetchCategories()
  }, [])

  const settings = {
    dots: true,
    infinite: categories.length > 4,       // Loop only if more than 4 cards
    speed: 500,
    slidesToShow: 4,                        // Show 4 cards on desktop
    slidesToScroll: 1,                      // Scroll one card at a time
    autoplay: true,
    autoplaySpeed: 3000,
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          slidesToShow: 3,
          slidesToScroll: 1,
          infinite: categories.length > 3,
          dots: true,
        },
      },
      {
        breakpoint: 768,
        settings: {
          slidesToShow: 2,
          slidesToScroll: 1,
          infinite: categories.length > 2,
        },
      },
      {
        breakpoint: 480,
        settings: {
          slidesToShow: 1,
          slidesToScroll: 1,
          infinite: categories.length > 1,
        },
      },
    ],
  }

  return (
    <>
      {loading && <Loader />}
      <Container fluid className="categories-container my-5">
        <div className="section-title mb-3">
          <div className="section-line"></div>
          <div className="text-center">
            <h5>All Product Shop</h5>
            <h1>Fandom Products</h1>
          </div>
          <div className="section-line"></div>
        </div>

        {categories.length > 0 ? (
          <Slider {...settings}>
            {categories.map((subcategory) => (
              <div key={subcategory._id || subcategory.id} style={{ padding: '0 10px' }}>
                <Card
                  className="Subcategory-card"
                  onClick={() => navigateToSubcategory(subcategory._id || subcategory.id)}
                  style={{ cursor: "pointer" }}
                >
                  <div className="Subcategory-image-container">
                    <Card.Img
                      variant="top"
                      src={
                        getImageUrl(subcategory.subcategory_logo || subcategory.subcategory_image) || "/placeholder.svg"
                      }
                      alt={subcategory.subcategory_name}
                      className="Subcategory-image"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = "/placeholder.svg"
                      }}
                    />
                  </div>
                </Card>
              </div>
            ))}
          </Slider>
        ) : (
          <div className="text-center">
            <h4>No subcategories found</h4>
            <p className="text-muted">Please check your API connection or try again later.</p>
          </div>
        )}
      </Container>
    </>
  )
}

export default Categories
