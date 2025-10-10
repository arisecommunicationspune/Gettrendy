require("dotenv").config();
const axios = require("axios");

const authenticate = async () => {
  console.log("EMAIL:", process.env.SHIPROCKET_EMAIL);
  console.log("PASSWORD:", process.env.SHIPROCKET_PASSWORD);
  console.log("Authenticating with Shiprocket...");

  const response = await axios.post("https://apiv2.shiprocket.in/v1/external/auth/login", {
    email: process.env.SHIPROCKET_EMAIL,
    password: process.env.SHIPROCKET_PASSWORD,
  });

  console.log("Shiprocket authentication successful");
  console.log("✅ Shiprocket Auth Successful!");
  console.log("Token:", response.data.token);
  return response.data.token;
};

// 👇 ADD THIS LINE to export it
module.exports = { authenticate };
