// lib/userUtils.ts
import { jwtDecode } from 'jwt-decode';

export interface UserData {
  id?: string;
  employee_id?: string;
  full_name?: string;
  email?: string;
  role?: any;
  permissions?: string[];
  [key: string]: any;
}

interface DecodedToken {
  id: string;
  email: string;
  role: string | null;
  employee_id: string;
  permissions: string[];
  iat: number;
  exp: number;
}

export const getUserFromStorage = (): UserData | null => {
  try {
    const userStr = localStorage.getItem("user");
    if (userStr && userStr !== "undefined") {
      return JSON.parse(userStr);
    }
    
    // If user data is not in localStorage, try to get it from token
    const token = localStorage.getItem("userjwttoken");
    if (token) {
      try {
        const decoded: DecodedToken = jwtDecode(token);
        const userFromToken = {
          id: decoded.id,
          email: decoded.email,
          employee_id: decoded.employee_id,
          role: decoded.role,
          permissions: decoded.permissions,
          full_name: decoded.email.split('@')[0], // Temporary name from email
        };
        
        // Store it for future use
        localStorage.setItem("user", JSON.stringify(userFromToken));
        return userFromToken;
      } catch (decodeError) {
        console.error("Error decoding token:", decodeError);
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
    return null;
  }
};

export const getUserName = (): string => {
  const user = getUserFromStorage();
  if (user?.full_name) {
    return user.full_name;
  }
  if (user?.email) {
    // Extract name from email if full_name is not available
    return user.email.split('@')[0];
  }
  return 'User';
};

export const getUserRole = (): string => {
  const user = getUserFromStorage();
  if (user?.role) {
    if (typeof user.role === 'object' && user.role.name) {
      return user.role.name;
    } else if (typeof user.role === 'string') {
      return user.role;
    }
  }
  return 'Employee';
};

export const getUserInitials = (): string => {
  const user = getUserFromStorage();
  if (user?.full_name) {
    return user.full_name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }
  if (user?.email) {
    return user.email.substring(0, 2).toUpperCase();
  }
  return 'U';
};

// Optional: Fetch full user details from API
export const fetchFullUserDetails = async (): Promise<UserData | null> => {
  try {
    const token = localStorage.getItem("userjwttoken");
    if (!token) return null;
    
    // Decode token to get user ID
    const decoded: DecodedToken = jwtDecode(token);
    
    // Fetch full user details from your API
    const response = await fetch(`/api/employees/${decoded.employee_id}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const fullUser = await response.json();
      // Update localStorage with full user data
      localStorage.setItem("user", JSON.stringify(fullUser));
      return fullUser;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
};