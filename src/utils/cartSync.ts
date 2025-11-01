import { useCart } from '../hooks/useCart';

// Track ongoing sync operations to prevent duplicates
const syncOperations = new Set<string>();

// Utility functions for cart synchronization
export const syncCartOnLogin = async (userId: string) => {
  // Skip cart synchronization for kiosk users
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    try {
      const user = JSON.parse(currentUser);
      if (user.email === 'kiosk@boki.com') {
        console.log('Skipping cart sync for kiosk user');
        return;
      }
    } catch (error) {
      console.error('Error parsing current user:', error);
    }
  }

  const operationKey = `sync-${userId}`;
  
  // Prevent duplicate sync operations
  if (syncOperations.has(operationKey)) {
    console.log('Cart sync already in progress, skipping...');
    return;
  }

  try {
    syncOperations.add(operationKey);
    const { syncCartWithDatabase } = useCart.getState();
    await syncCartWithDatabase(userId);
    console.log('Cart synchronized on login');
  } catch (error) {
    console.error('Failed to sync cart on login:', error);
  } finally {
    syncOperations.delete(operationKey);
  }
};

export const clearCartOnLogout = async (userId: string) => {
  // Skip cart clearing for kiosk users
  const currentUser = localStorage.getItem('currentUser');
  if (currentUser) {
    try {
      const user = JSON.parse(currentUser);
      if (user.email === 'kiosk@boki.com') {
        console.log('Skipping cart clear for kiosk user');
        return;
      }
    } catch (error) {
      console.error('Error parsing current user:', error);
    }
  }

  const operationKey = `clear-${userId}`;
  
  // Prevent duplicate clear operations
  if (syncOperations.has(operationKey)) {
    console.log('Cart clear already in progress, skipping...');
    return;
  }

  try {
    syncOperations.add(operationKey);
    const { clearCartFromDatabase } = useCart.getState();
    await clearCartFromDatabase(userId);
    console.log('Cart cleared from database on logout');
  } catch (error) {
    console.error('Failed to clear cart on logout:', error);
  } finally {
    syncOperations.delete(operationKey);
  }
};