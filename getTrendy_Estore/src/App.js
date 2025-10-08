import Navigation from "./Componets/Client/Navigation/Navigation";
import LoginPage from "./Componets/Client/Signup/LoginPage";
import { Routes, Route, useLocation } from "react-router-dom";
  import { useEffect } from "react";

import Register from "./Componets/Client/Signup/Register";
import Home from "./Componets/Client/Home/Home";
import Contact from "./Componets/Client/Contact/Contact";
import Shop from "./Componets/Client/Shop/Shop";
import CartPage from "./Componets/Client/CartPage/CartPage";
import Checkout from "./Componets/Client/Checkout/Checkout";
import Videogallery from "./Componets/Client/Video-gallery/Videogallery";
import WhatsAppIcon from "./Componets/Client/WhatsAppIcon/WhatsAppIcon";
import Verification from "./Componets/Client/Verification/Verification";
import Dashboard from "./Componets/Admin/Dashboard/Dashboard";
import ProtectedRoute from "./Componets/AuthContext/ProtectedRoute";
import AdminLayout from "./Componets/Admin/AdminLayout/AdminLayout";
import Unauthorized from "./Componets/Admin/Unauthorized/Unauthorized";
import SubCategory from "./Componets/Admin/SubCategory/SubCategory";
import AllProducts from "./Componets/Admin/Products/AllProducts";
import AddProduct from "./Componets/Admin/Products/AddProduct";
import AddCategory from "./Componets/Admin/SubCategory/AddCategory";
import AddMainCategory from "./Componets/Admin/Dashboard/AddMainCategory";
import AboutUs from "./Componets/Client/AboutUs/AboutUs";
import AllContacts from "./Componets/Admin/AllContacts/AllContacts";
import AllReviews from "./Componets/Admin/AllReviews/AllReviews";
import AddReview from "./Componets/Admin/AllReviews/AddReview";
import AllUsers from "./Componets/Admin/AllUsers/AllUsers";
import EditUser from "./Componets/Admin/AllUsers/EditUser";
import Store from "./Componets/Admin/Store/Store";
import AddEditStore from "./Componets/Admin/Store/AddEditStore";
import PerticularProductPage from "./Componets/Client/ProductPage/PerticularProductPage";
import AllInventory from "./Componets/Admin/Inventory/AllInventory";
import InventoryCrud from "./Componets/Admin/Inventory/InventoryCrud";
import StoreRegister from "./Componets/Admin/Store/StoreRegister";
import StoreLogin from "./Componets/Admin/Store/StoreLogin";
import Categories from "./Componets/Client/Categories/Categories";
import Orders from "./Componets/Admin/Orders/Orders";
// at top of CartPage.jsx
import { ToastContainer, cssTransition } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import ProfilePage from "./Componets/Client/ProfilePage/ProfilePage";
import MyOrders from "./Componets/Client/Orders/MyOrders";
import PrivacyPolicy from "./Componets/Client/PrivacyPolicy/PrivacyPolicy";
import CancellationReschedule from "./Componets/Client/Cancellation&Reschedule/CancellationReschedule";
import OrderSummary from "./Componets/Client/OrderSummary/OrderSummary";
import PaymentSuccess from "./Componets/Client/OrderSummary/PaymentSuccess";
import DeliveryPartner from "./Componets/Admin/DeliveryPartner/DeliveryPartner";
import AddEditDeliveryPartners from "./Componets/Admin/DeliveryPartner/AddEditDeliveryPartners";
import ProductCard from "./Componets/Client/AllProducts/ProductCard";
import DeliveryHome from "./Componets/DeliveryBoy/DeliveryHome/DeliveryHome";
import TermsConditions from "./Componets/Client/Terms&Conditions/TermsConditions";
import RazorpayButton from "./Componets/RazorpayButton";
import Success from "./Componets/Client/Success/Success";
import Shopping from "./Componets/Client/Shop/Shopping";
import ForgotPassword from "./Componets/Client/Signup/ForgotPassword";

const App = () => {
  const location = useLocation();

  const isAdminRoute = () => {
    return (
      location.pathname.startsWith("/admin-") ||
      location.pathname === "/unauthorized" ||
      location.pathname === "/categories" ||
      location.pathname === "/confirm-order" ||
      location.pathname === "/delivery-home"
    );
  };

  // create a ghost transition (place near your component definition)
const ghostTransition = cssTransition({
  enter: "ghost-enter",
  exit: "ghost-exit",
  duration: [300, 800], // [enterDuration, exitDuration] in ms
});



  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) &&
        (event.key === "+" || event.key === "-" || event.key === "=")) {
        event.preventDefault();
      }
    };

    const handleWheel = (event) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("wheel", handleWheel);
    };
  }, []);

  
console.log("VERSION:", process.env.REACT_APP_VERSION);



  return (
    <>
      

      {!isAdminRoute() && <Navigation />}
      <Routes>
        {/* Client Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<Register />} />
        <Route path="/about" element={<AboutUs />} />
        <Route path="/contact" element={<Contact />} />
        <Route path="/aboutUs" element={<AboutUs />} />
        <Route
          path="/perticularproductpage"
          element={<PerticularProductPage />}
        />
        <Route path="/r" element={<RazorpayButton />} />
        <Route path="/shop" element={<Shop />} />
        <Route path="/shop/:categoryId" element={<Shop />} />
        <Route path="/cartPage" element={<CartPage />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/videogallery" element={<Videogallery />} />
        <Route path="/verification" element={<Verification />} />
        <Route path="/unauthorized" element={<Unauthorized />} />
        <Route path="/storeRegister" element={<StoreRegister />} />
        <Route path="/storeLogin" element={<StoreLogin />} />
        <Route path="/categories" element={<Categories />} />
        <Route path="/profilePage" element={<ProfilePage />} />
        <Route path="/myOrders" element={<MyOrders />} />
        <Route path="/privacyPolicy" element={<PrivacyPolicy />} />
        <Route
          path="/cancellation-Reschedule"
          element={<CancellationReschedule />}
        />
        <Route path="/order-Summary" element={<OrderSummary />} />
        <Route path="/confirm-order" element={<PaymentSuccess />} />
        <Route path="/productCard" element={<ProductCard />} />
        <Route path="/delivery-home" element={<DeliveryHome />} />
        <Route path="/termsconditions" element={<TermsConditions />} />
        <Route path="/success" element={<Success />} />
        <Route path="/shopping" element={<Shopping />} />
        <Route path="/payment-success" element={<PaymentSuccess />} />
        <Route path="/ForgotPassword" element={<ForgotPassword />} />

        {/* Admin Routes */}
        <Route
          path="/admin-dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminLayout>
                <Dashboard />
              </AdminLayout>
            </ProtectedRoute>
          }
        />

        <Route element={<AdminLayout />}>
          <Route
            path="/admin-allcategory"
            element={
              <ProtectedRoute role="admin">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-allsubcategory"
            element={
              <ProtectedRoute role="admin">
                <SubCategory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-allproducts"
            element={
              <ProtectedRoute role="admin">
                <AllProducts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-conatctUs"
            element={
              <ProtectedRoute role="admin">
                <AllContacts />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-reviews"
            element={
              <ProtectedRoute role="admin">
                <AllReviews />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-review"
            element={
              <ProtectedRoute role="admin">
                <AddReview />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-users"
            element={
              <ProtectedRoute role="admin">
                <AllUsers />
              </ProtectedRoute>
            }
          />
          <Route
            path="/edit-user"
            element={
              <ProtectedRoute role="admin">
                <EditUser />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-product"
            element={
              <ProtectedRoute role="admin">
                <AddProduct />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-category"
            element={
              <ProtectedRoute role="admin">
                <AddCategory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-main-category"
            element={
              <ProtectedRoute role="admin">
                <AddMainCategory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-store"
            element={
              <ProtectedRoute role="admin">
                <Store />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-crudStore"
            element={
              <ProtectedRoute role="admin">
                <AddEditStore />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-AllInventory"
            element={
              <ProtectedRoute role="admin">
                <AllInventory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-inventoryCrud"
            element={
              <ProtectedRoute role="admin">
                <InventoryCrud />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-orders"
            element={
              <ProtectedRoute role="admin">
                <Orders />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-delivery-partner"
            element={
              <ProtectedRoute role="admin">
                <DeliveryPartner />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-deliveryPartner"
            element={
              <ProtectedRoute role="admin">
                <AddEditDeliveryPartners />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
      <WhatsAppIcon />

      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
        transition={ghostTransition}
      />

    </>
  );
};

export default App;
