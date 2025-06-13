import axios from "axios";

// API Configuration
export const BASEURL = "http://139.59.3.54/:5000";

// User Roles
export const UserRoles = {
  SERVICE_PROVIDER: "Service",
  NORMAL: "Normal",
  ADMIN: "admin",
  Customer: "user",
  STORE_ADMIN: "Store_admin",
  DELIVERY_MAN: "Delivery_man",
};

// Create a new axios instance with defaults
export const api = axios.create({
  baseURL: BASEURL,
  timeout: 15000,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Request interceptor for adding auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    console.log(
      "API Request:",
      config.method?.toUpperCase(),
      config.url,
      config.data
    );
    return config;
  },
  (error) => {
    console.error("Request interceptor error:", error);
    return Promise.reject(error);
  }
);

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => {
    console.log("API Response:", response.status, response.data);
    return response;
  },
  (error) => {
    console.error(
      "API Error:",
      error.response?.status,
      error.response?.data || error.message
    );

    if (error.response?.status === 401) {
      console.error(
        "Authentication error:",
        error.response?.data?.message || "Unauthorized"
      );
    }

    if (error.code === "ECONNABORTED") {
      console.error("Request timeout. Please check your internet connection.");
    }

    if (!error.response) {
      console.error("Network error. Please check your internet connection.");
    }

    return Promise.reject(error);
  }
);

// Authentication utility functions
export const authUtils = {
  login: (token, role, id, userName, profileImg = "") => {
    try {
      localStorage.setItem("token", token);
      localStorage.setItem("role", role);
      localStorage.setItem("userId", id || "");
      localStorage.setItem("userName", userName || "");
      localStorage.setItem("isAuthenticated", "true");
      localStorage.setItem("profileImage", profileImg || "");

      window.dispatchEvent(new Event("auth-changed"));
      console.log("User logged in successfully:", { role, id, userName });
      return true;
    } catch (error) {
      console.error("Error during login:", error);
      return false;
    }
  },

  logout: () => {
    try {
      localStorage.removeItem("token");
      localStorage.removeItem("role");
      localStorage.removeItem("userId");
      localStorage.removeItem("isAuthenticated");
      localStorage.removeItem("userName");
      localStorage.removeItem("profileImage");

      window.dispatchEvent(new Event("auth-changed"));
      console.log("User logged out successfully");
      return true;
    } catch (error) {
      console.error("Error during logout:", error);
      return false;
    }
  },

  isAuthenticated: () => {
    const isAuth = localStorage.getItem("isAuthenticated") === "true";
    const token = localStorage.getItem("token");
    return isAuth && token;
  },

  getToken: () => {
    return localStorage.getItem("token");
  },

  getRole: () => {
    return localStorage.getItem("role");
  },

  getUserId: () => {
    return localStorage.getItem("userId");
  },

  getUserName: () => {
    return localStorage.getItem("userName");
  },

  getProfileImage: () => {
    return localStorage.getItem("profileImage");
  },

  hasRole: (requiredRole) => {
    const userRole = localStorage.getItem("role");
    return userRole === requiredRole;
  },

  updateProfile: (data) => {
    try {
      if (data.name) localStorage.setItem("userName", data.name);
      if (data.profileImage)
        localStorage.setItem("profileImage", data.profileImage);

      window.dispatchEvent(new Event("auth-changed"));
      return true;
    } catch (error) {
      console.error("Error updating profile:", error);
      return false;
    }
  },
};

// Cart utility functions
export const cartUtils = {
  async fetchCartItems() {
    const token = localStorage.getItem("token");
    if (!token) {
      console.log("No token found, returning empty cart");
      return [];
    }

    try {
      console.log("Fetching cart items...");
      const response = await api.get("/api/cart");

      console.log("Cart fetch response:", response.data);

      if (response.data && response.data.success) {
        const items = response.data.items || response.data.cart?.items || [];
        console.log("Raw cart items:", items);

        // Process items to ensure consistent data structure
        const processedItems = items.map((item) => {
          console.log("Processing cart item:", item);

          // Handle populated productId
          if (item.productId && typeof item.productId === "object") {
            return {
              ...item,
              _id: item._id,
              productId: item.productId,
              product_name: item.productId.product_name,
              product_price: item.productId.price,
              product_image: item.productId.images?.[0],
              name: item.productId.product_name,
              price: item.productId.price,
              image: item.productId.images?.[0],
            };
          } else {
            // Handle case where productId is just a string (shouldn't happen with proper population)
            console.warn(
              "ProductId not properly populated for item:",
              item._id
            );
            return {
              ...item,
              _id: item._id,
              productId: item.productId,
              product_name: "Product not found",
              product_price: 0,
              product_image: null,
              name: "Product not found",
              price: 0,
              image: null,
            };
          }
        });

        console.log("Processed cart items:", processedItems);
        return processedItems;
      }
      return [];
    } catch (error) {
      console.error("Error fetching cart items:", error);
      if (error.response?.status === 401) {
        console.log("Unauthorized - clearing auth data");
        authUtils.logout();
      }
      return [];
    }
  },

  async addToCart(productId, quantity = 1, size = "M", color = "Default") {
    const token = localStorage.getItem("token");
    if (!token) {
      console.error("No token found for add to cart");
      return { success: false, message: "Please login to add items to cart" };
    }

    try {
      // Handle both product object and productId string
      const id =
        typeof productId === "object"
          ? productId._id || productId.id
          : productId;

      if (!id) {
        console.error("No product ID found:", productId);
        return { success: false, message: "Invalid product ID" };
      }

      console.log("Adding to cart:", { productId: id, quantity, size, color });

      const payload = {
        productId: id,
        quantity: Number.parseInt(quantity) || 1,
        size: size || "M",
        color: color || "Default",
      };

      console.log("Cart payload:", payload);

      const response = await api.post("/api/cart/add", payload);

      console.log("Add to cart response:", response.data);

      if (response.data && response.data.success) {
        window.dispatchEvent(new Event("cart-changed"));
        return {
          success: true,
          message: "Product added to cart successfully",
          data: response.data,
        };
      }

      return { success: false, message: "Failed to add product to cart" };
    } catch (error) {
      console.error("Error adding to cart:", error);

      let errorMessage = "Failed to add product to cart";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = "Please login to add items to cart";
        authUtils.logout();
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid product data";
      } else if (error.code === "ECONNABORTED") {
        errorMessage = "Request timeout. Please try again.";
      } else if (!error.response) {
        errorMessage = "Network error. Please check your connection.";
      }

      return { success: false, message: errorMessage };
    }
  },

  async removeFromCart(productId, size = null, color = null) {
    const token = localStorage.getItem("token");
    if (!token) {
      return {
        success: false,
        message: "Please login to remove items from cart",
      };
    }

    try {
      // Handle both product object and productId string
      const id =
        typeof productId === "object"
          ? productId._id || productId.id
          : productId;

      console.log("Removing from cart:", { productId: id, size, color });

      const payload = { productId: id };
      if (size) payload.size = size;
      if (color) payload.color = color;

      const response = await api.post("/api/cart/remove", payload);

      console.log("Remove from cart response:", response.data);

      if (response.data && response.data.success) {
        window.dispatchEvent(new Event("cart-changed"));
        return {
          success: true,
          message: "Product removed from cart",
          data: response.data,
        };
      }

      return { success: false, message: "Failed to remove product from cart" };
    } catch (error) {
      console.error("Error removing from cart:", error);

      let errorMessage = "Failed to remove product from cart";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = "Please login to remove items from cart";
        authUtils.logout();
      }

      return { success: false, message: errorMessage };
    }
  },

  async updateCartQuantity(productId, quantity, size = null, color = null) {
    const token = localStorage.getItem("token");
    if (!token || quantity < 1) {
      return { success: false, message: "Invalid request" };
    }

    try {
      // Handle both product object and productId string
      const id =
        typeof productId === "object"
          ? productId._id || productId.id
          : productId;

      console.log("Updating cart quantity:", {
        productId: id,
        quantity,
        size,
        color,
      });

      const payload = {
        productId: id,
        quantity: Number.parseInt(quantity),
      };
      if (size) payload.size = size;
      if (color) payload.color = color;

      const response = await api.post("/api/cart/update", payload);

      console.log("Update cart response:", response.data);

      if (response.data && response.data.success) {
        window.dispatchEvent(new Event("cart-changed"));
        return {
          success: true,
          message: "Cart updated successfully",
          data: response.data,
        };
      }

      return { success: false, message: "Failed to update cart" };
    } catch (error) {
      console.error("Error updating cart quantity:", error);

      let errorMessage = "Failed to update cart quantity";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = "Please login to update cart";
        authUtils.logout();
      }

      return { success: false, message: errorMessage };
    }
  },

  async clearCart() {
    const token = localStorage.getItem("token");
    if (!token) {
      return { success: false, message: "Please login to clear cart" };
    }

    try {
      console.log("Clearing cart...");

      const response = await api.delete("/api/cart/clear");

      console.log("Clear cart response:", response.data);

      if (response.data && response.data.success) {
        window.dispatchEvent(new Event("cart-changed"));
        return {
          success: true,
          message: "Cart cleared successfully",
          data: response.data,
        };
      }

      return { success: false, message: "Failed to clear cart" };
    } catch (error) {
      console.error("Error clearing cart:", error);

      let errorMessage = "Failed to clear cart";

      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = "Please login to clear cart";
        authUtils.logout();
      }

      return { success: false, message: errorMessage };
    }
  },
};
