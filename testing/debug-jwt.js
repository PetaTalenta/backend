require('dotenv').config();
const jwt = require('jsonwebtoken');
const axios = require('axios');

async function testJWT() {
  try {
    // First, register and login to get a token
    console.log('1. Registering user...');
    const userData = {
      email: `testuser${Date.now()}@example.com`,
      password: 'TestPassword123!',
      username: `testuser${Date.now()}`,
      full_name: 'Test User'
    };

    const registerResponse = await axios.post('http://localhost:3000/api/auth/register', userData);
    console.log('Register response:', registerResponse.status, registerResponse.data.success);

    if (!registerResponse.data.success || !registerResponse.data.data.token) {
      throw new Error('Registration failed');
    }

    const token = registerResponse.data.data.token;
    console.log('Token obtained:', token.substring(0, 50) + '...');

    // Try to decode the token
    console.log('2. Decoding token...');
    try {
      const decoded = jwt.verify(token, '1c81d3782716f83abe269243de6cdae5d81287556a0241708354b55b085ef0c9');
      console.log('Token decoded successfully:', {
        id: decoded.id,
        email: decoded.email,
        user_type: decoded.user_type,
        iat: decoded.iat,
        exp: decoded.exp
      });
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError.message);
    }

    // Test a simple authenticated endpoint
    console.log('3. Testing authenticated endpoint...');
    try {
      const profileResponse = await axios.get(
        'http://localhost:3000/api/auth/profile',
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log('Profile response:', profileResponse.status, profileResponse.data.success);
    } catch (profileError) {
      console.error('Profile request failed:', profileError.response?.status, profileError.response?.data);
    }

  } catch (error) {
    console.error('Error:', error.response?.status, error.response?.data || error.message);
  }
}

testJWT();
