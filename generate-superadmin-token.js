const jwt = require('jsonwebtoken');

// Create superadmin token for deleting jobs
const superadminPayload = {
  id: "f843ce6b-0f41-4e3a-9c53-055ba85e4c61",
  username: "rayinail",
  email: "kasykoi@gmail.com",
  role: "superadmin",
  type: "admin",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60), // 7 days
  aud: "atma-services",
  iss: "atma-auth-service"
};

const JWT_SECRET = "1c81d3782716f83abe269243de6cdae5d81287556a0241708354b55b085ef0c9";
const superadminToken = jwt.sign(superadminPayload, JWT_SECRET);

console.log("Superadmin Token:");
console.log(superadminToken);
