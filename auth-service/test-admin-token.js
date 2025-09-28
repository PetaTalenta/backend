const jwt = require('jsonwebtoken');

// Create admin token for testing Phase 2 endpoints
const adminPayload = {
  id: "f843ce6b-0f41-4e3a-9c53-055ba85e4c61",
  username: "rayinail",
  email: "kasykoi@gmail.com",
  role: "admin",
  type: "admin", // This is the key field for admin authentication
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  aud: "atma-services",
  iss: "atma-auth-service"
};

const JWT_SECRET = "1c81d3782716f83abe269243de6cdae5d81287556a0241708354b55b085ef0c9";
const adminToken = jwt.sign(adminPayload, JWT_SECRET);

console.log("Admin Token:");
console.log(adminToken);
console.log("\nTest command:");
console.log(`curl -X GET "http://localhost:3002/archive/admin/stats/global" \\
  -H "Authorization: Bearer ${adminToken}" \\
  -H "X-Internal-Service: true" \\
  -H "X-Service-Key: f8c1af59d85da6581036e18b4b9e0ec35d1fdefe1a93837d5b4746c9984ea4c1"`);
