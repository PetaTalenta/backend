# Delete Account Endpoint Example

## Endpoint
```
DELETE /api/auth/account
```

## Description
Allows users to delete their own account completely (soft delete). This endpoint:
- Performs soft delete by changing email to `deleted_{timestamp}_{original_email}` format
- Resets token balance to 0
- Sets `is_active` to false
- Automatically deletes user profile
- Cannot be undone

## Authentication
Requires Bearer token in Authorization header.

## Example Request

### Using curl
```bash
curl -X DELETE http://localhost:3001/api/auth/account \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"
```

### Using JavaScript fetch
```javascript
const response = await fetch('/api/auth/account', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${userToken}`,
    'Content-Type': 'application/json'
  }
});

const result = await response.json();
console.log(result);
```

## Example Response

### Success (200)
```json
{
  "success": true,
  "message": "Account deleted successfully",
  "data": {
    "deletedAt": "2024-01-15T10:30:00.000Z",
    "originalEmail": "user@example.com"
  }
}
```

### Error - Unauthorized (401)
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Access token is required"
  }
}
```

### Error - User Not Found (404)
```json
{
  "success": false,
  "error": {
    "code": "USER_NOT_FOUND",
    "message": "User not found or already inactive"
  }
}
```

## Important Notes

⚠️ **Warning**: This operation cannot be undone!

- After deletion, the user cannot login with the same account
- All user data is soft deleted (not permanently removed from database)
- User profile is automatically deleted
- Token balance is reset to 0
- Email is changed to prevent conflicts with new registrations

## Difference from Profile Deletion

| Endpoint | What it deletes | Can user login after? |
|----------|----------------|----------------------|
| `DELETE /api/auth/profile` | Only user profile | Yes |
| `DELETE /api/auth/account` | Entire user account | No |

## Frontend Implementation Example

```javascript
// Add confirmation dialog before deletion
const deleteAccount = async () => {
  const confirmed = confirm(
    'Are you sure you want to delete your account? This action cannot be undone.'
  );
  
  if (!confirmed) return;
  
  try {
    const response = await fetch('/api/auth/account', {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('token')}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      alert('Account deleted successfully');
      // Redirect to login page and clear local storage
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else {
      alert(`Error: ${result.error.message}`);
    }
  } catch (error) {
    alert('Network error occurred');
  }
};
```
