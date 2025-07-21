// Helper functions for ATMA testing
const axios = require('axios');

// Helper function to make API calls
async function makeRequest(method, url, data = null, headers = {}) {
  try {
    const config = {
      method,
      url,
      headers: {
        'Content-Type': 'application/json',
        ...headers
      }
    };

    if (data) {
      config.data = data;
    }

    const response = await axios(config);

    // Ensure clean response object
    const cleanResponse = {
      success: true,
      status: response.status,
      data: response.data
    };

    return cleanResponse;
  } catch (error) {
    const cleanError = {
      success: false,
      status: error.response?.status || 500,
      data: error.response?.data || { message: error.message }
    };

    return cleanError;
  }
}

// Helper function to format and display API response according to EX_API_DOCS.md format
function displayResponse(title, result, showFullResponse = false) {
  console.log(`\n${title}`);
  console.log('Status:', result.success ? '✅ SUCCESS' : '❌ FAILED');
  console.log('HTTP Status:', result.status);

  if (result.success && result.data) {
    // Display according to standard API format from EX_API_DOCS.md
    if (result.data.success !== undefined) {
      console.log('API Success:', result.data.success ? '✅' : '❌');
    }

    if (result.data.message) {
      console.log('Message:', result.data.message);
    }

    if (result.data.data) {
      console.log('Response Data:');

      // Format specific data types nicely
      const responseData = result.data.data;

      if (responseData.user) {
        console.log('  User Info:');
        console.log(`    ID: ${responseData.user.id || 'N/A'}`);
        console.log(`    Email: ${responseData.user.email || 'N/A'}`);
        console.log(`    Username: ${responseData.user.username || 'N/A'}`);
        console.log(`    User Type: ${responseData.user.user_type || 'N/A'}`);
        console.log(`    Active: ${responseData.user.is_active || 'N/A'}`);
        console.log(`    Token Balance: ${responseData.user.token_balance || 'N/A'}`);

        if (responseData.user.profile) {
          console.log('  Profile:');
          console.log(`    Full Name: ${responseData.user.profile.full_name || 'N/A'}`);
          console.log(`    Date of Birth: ${responseData.user.profile.date_of_birth || 'N/A'}`);
          console.log(`    Gender: ${responseData.user.profile.gender || 'N/A'}`);
        }
      }

      if (responseData.token) {
        console.log(`  Token: ${responseData.token.substring(0, 20)}...`);
      }

      if (responseData.jobId) {
        console.log(`  Job ID: ${responseData.jobId}`);
      }

      if (responseData.status) {
        console.log(`  Status: ${responseData.status}`);
      }

      if (responseData.estimatedProcessingTime) {
        console.log(`  Estimated Processing Time: ${responseData.estimatedProcessingTime}`);
      }

      if (responseData.queuePosition) {
        console.log(`  Queue Position: ${responseData.queuePosition}`);
      }

      if (responseData.tokenCost) {
        console.log(`  Token Cost: ${responseData.tokenCost}`);
      }

      if (responseData.remainingTokens !== undefined) {
        console.log(`  Remaining Tokens: ${responseData.remainingTokens}`);
      }
    }

    // Show full response only in debug mode or when explicitly requested
    if (showFullResponse || process.env.DEBUG_RESPONSE === 'true') {
      console.log('\n=== FULL RESPONSE (DEBUG) ===');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('=== END DEBUG ===');
    }
  } else {
    // Error response
    console.log('Error Details:');

    // Handle different error response formats
    if (result.data) {
      if (result.data.message) {
        console.log(`  Message: ${result.data.message}`);
      }
      if (result.data.error) {
        if (typeof result.data.error === 'string') {
          console.log(`  Error: ${result.data.error}`);
        } else {
          console.log(`  Error: ${JSON.stringify(result.data.error, null, 2)}`);
        }
      }
      if (result.data.details) {
        console.log(`  Details: ${JSON.stringify(result.data.details, null, 2)}`);
      }

      // If no specific error fields, show the whole data object
      if (!result.data.message && !result.data.error && !result.data.details) {
        console.log(`  Response: ${JSON.stringify(result.data, null, 2)}`);
      }
    }

    // Show full error response for debugging
    if (process.env.DEBUG_RESPONSE === 'true') {
      console.log('\n=== FULL ERROR RESPONSE (DEBUG) ===');
      console.log(JSON.stringify(result.data, null, 2));
      console.log('=== END DEBUG ===');
    }
  }
}

// Cleanup function for WebSocket connections and variables
function cleanup(socket, globalState = {}) {
  console.log('\n=== 🧹 CLEANUP ===');

  // Clean up job completion tracking
  if (globalState.jobCompletionResolve) {
    globalState.jobCompletionResolve({ success: false, cleanup: true });
    globalState.jobCompletionResolve = null;
    globalState.jobCompletionPromise = null;
  }

  if (socket) {
    console.log('Disconnecting WebSocket...');
    socket.disconnect();
    socket = null;
  }

  // Reset variables
  if (globalState) {
    globalState.authToken = '';
    globalState.jobId = '';
    globalState.userId = '';
    globalState.assessmentSubmissionTime = null;
    if (globalState.userAssessmentTimes) {
      globalState.userAssessmentTimes.clear();
    }
  }

  console.log('Cleanup completed');
}

module.exports = {
  makeRequest,
  displayResponse,
  cleanup
};
