"use client";

import { useState } from "react";
import { Button, Container, Row, Col } from "react-bootstrap";
import { NavLink, useNavigate, useLocation } from "react-router-dom";
import "./LoginPage.css";
import {
  faEnvelope,
  faEye,
  faEyeSlash,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import axios from "axios";
import Loader from "../Loader/Loader";
import { useAuth } from "../../AuthContext/AuthContext";
import Footer from "../Footer/Footer";
import { BASEURL } from "../Comman/CommanConstans";
import { toast } from "react-toastify";

const Login = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  const validateForm = () => {
    let valid = true;
    const newErrors = {};
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!email) {
      newErrors.email = "Email address is required";
      valid = false;
    } else if (!emailRegex.test(email)) {
      newErrors.email = "Enter a valid email address";
      valid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  const handleSubmit = async () => {
    if (validateForm()) {
      setLoading(true);
      const payload = { email, password };

      try {
        const response = await axios.post(
          `${BASEURL}/api/auth/login`,
          payload,
          {
            timeout: 10000, // 10 second timeout
          }
        );

        if (response && response.data) {
          if (response.data.success) {
            // Get user data from response
            const userData = response.data.data.user;
            const userToken = response.data.data.token;

            // Update context with user information
            await login(userToken, userData.role, userData.id, userData.name);

            // Clear form fields
            setEmail("");
            setPassword("");

            // Reset error state
            setErrors({});

         // Show success toast and store the ID
const toastId = toast.success("Login successful! Redirecting...", {
  autoClose: 2000,
});

// Then later (after timeout), dismiss it safely
setTimeout(() => {
  toast.dismiss(toastId); // closes that specific toast
  const from = location.state?.from?.pathname || "/";

  if (userData.role === "admin") {
    navigate("/", { replace: true });
  } else {
    navigate(from, { replace: true });
  }
}, 1000);


            // Redirect after a small delay to allow message to show
            setTimeout(() => {
              const from = location.state?.from?.pathname || "/";
              if (userData.role === "admin") {
                navigate("/", { replace: true });
              } else {
                navigate(from, { replace: true });
              }
            }, 1000);
          } else {
            toast.error(response.data.message || "Invalid credentials", {
              autoClose: 2000,
            });
          }
        }
      } catch (error) {
        const errorMsg =
          error?.response?.data?.message || "Something went wrong.";
        toast.error(errorMsg, { autoClose: 5000 });
        console.error("Login error:", error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    }
  };

  const navigateToRegister = () => {
    navigate("/register");
    window.scroll(0, 0);
  };

  const handleForgotPassword = () => {
    navigate("/ForgotPassword");
  };

  return (
    <>
      {loading && <Loader />}
      <Container
        fluid
        className="d-flex align-items-center justify-content-center login-container"
      >
        <Container fluid>
          <Row className="vh-100">
            <Col
              className="d-flex flex-column align-items-center justify-content-center login-image-col"
              style={{ backgroundColor: "#FFFFFF", position: "relative" }}
            >
              <div className="login-form-container">
                <h1 className="mb-3 text-center loginheding">Welcome back!</h1>
                <p className="text-center">
                  Already have an account? Sign in here!
                </p>

                <form>
                  <div className="buttomsapcec">
                    <label htmlFor="email" className="title-heading">
                      Email Address
                    </label>
                    <div className="input-group">
                      <input
                        type="email"
                        id="email"
                        placeholder="Enter your Email Address"
                        className="custom-input"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                      />
                      <FontAwesomeIcon
                        icon={faEnvelope}
                        className="input-icon"
                      />
                    </div>
                    {errors.email && (
                      <p className="text-danger">{errors.email}</p>
                    )}
                  </div>

                  <div className="buttomsapcec">
                    <label htmlFor="password" className="title-heading">
                      Password
                    </label>
                    <div className="input-group">
                      <input
                        type={showPassword ? "text" : "password"}
                        id="password"
                        placeholder="********"
                        className="custom-input"
                        onChange={(e) => setPassword(e.target.value)}
                        value={password}
                        onKeyPress={(e) => {
                          if (e.key === "Enter") {
                            handleSubmit();
                          }
                        }}
                      />
                      <FontAwesomeIcon
                        icon={showPassword ? faEye : faEyeSlash}
                        className="input-icon"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{ cursor: "pointer" }}
                      />
                    </div>
                    {errors.password && (
                      <p className="text-danger">{errors.password}</p>
                    )}
                  </div>

                  <div className="text-end mb-3">
                    <span
                      onClick={handleForgotPassword}
                      style={{ cursor: "pointer", color: "#007bff" }}
                    >
                      Forgot password?
                    </span>
                  </div>

                  <div className="d-flex align-items-center justify-content-center">
                    <Button
                      className="cutomebutton"
                      onClick={handleSubmit}
                      type="button"
                    >
                      Sign In
                    </Button>
                  </div>

                  <div className="d-flex justify-content-center align-items-center mt-3">
                    <NavLink to="/register" onClick={navigateToRegister}>
                      <p>
                        Not a member?{" "}
                        <span className="create-account pointer">
                          Create an account.
                        </span>
                      </p>
                    </NavLink>
                  </div>
                </form>
              </div>

              <div className="login-img">
                <img src="/Images/Login_img.png" alt="Login" />
              </div>
            </Col>
          </Row>
        </Container>
      </Container>

      <Footer />
    </>
  );
};

export default Login;
