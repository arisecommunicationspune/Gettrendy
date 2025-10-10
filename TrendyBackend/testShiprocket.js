require("dotenv").config();
const axios = require("axios");
const { authenticate } = require("./testAuth"); // If your testAuth.js exports the token function

(async () => {
  try {
    console.log("🚀 Authenticating with Shiprocket...");
    const token = await authenticate(); // or paste your token here temporarily
    console.log("✅ Got token, fetching pickup locations...");

    const response = await axios.get(
      "https://apiv2.shiprocket.in/v1/external/settings/company/pickup",
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("\n✅ Pickup Locations Fetched Successfully!");
    console.log(JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error("\n❌ Error fetching pickup locations:");
    console.error(error.response?.data || error.message);
  }
})();
