#!/usr/bin/env node

// Simple test script to verify the conversion book functionality
const http = require("http");

// Test the backend HTTP server
console.log("Testing backend HTTP server...");
console.log("Fetching conversions from block 54595160...");

const options = {
  hostname: "localhost",
  port: 3001,
  path: "/api/conversion-history?limit=10",
  method: "GET",
  headers: {
    "Content-Type": "application/json",
  },
};

const req = http.request(options, (res) => {
  console.log(`Status: ${res.statusCode}`);

  let data = "";

  res.on("data", (chunk) => {
    data += chunk;
  });

  res.on("end", () => {
    try {
      const response = JSON.parse(data);
      console.log("Response:", JSON.stringify(response, null, 2));

      if (response.conversions && Array.isArray(response.conversions)) {
        console.log(
          `✅ Success! Found ${response.conversions.length} conversions`,
        );

        if (response.conversions.length > 0) {
          const firstConversion = response.conversions[0];
          console.log("First conversion:", {
            transactionHash: firstConversion.transactionHash,
            blockNumber: firstConversion.blockNumber,
            believer: firstConversion.believer,
            timestamp: firstConversion.timestamp,
          });
        }
      } else {
        console.log("❌ Invalid response format");
      }
    } catch (error) {
      console.error("❌ Error parsing response:", error.message);
      console.log("Raw response:", data);
    }
  });
});

req.on("error", (error) => {
  console.error("❌ Request error:", error.message);
  console.log("\nMake sure the backend HTTP server is running with:");
  console.log("cd backend && npm run dev:http");
});

req.end();
