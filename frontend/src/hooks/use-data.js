import { useState, useEffect, useCallback } from 'react';
import { getData, addItem, updateItem, deleteItem, STORAGE_KEYS } from '../services/mockData';

/**
 * Custom hook for managing data with localStorage sync
 * @param {string} storageKey - The storage key from STORAGE_KEYS
 * @returns {object} - Data and CRUD operations
 */
export const useData = (storageKey) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load initial data
  useEffect(() => {
    try {
      setLoading(true);
      const initialData = getData(storageKey);
      setData(initialData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  // Listen for storage changes from other tabs/windows
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === storageKey && e.newValue) {
        try {
          const newData = JSON.parse(e.newValue);
          setData(newData);
        } catch (err) {
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [storageKey]);

  // Add new item
  const add = useCallback((item) => {
    try {
      const newItem = addItem(storageKey, item);
      setData(getData(storageKey));
      return { success: true, data: newItem };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [storageKey]);

  // Update existing item
  const update = useCallback((id, updates) => {
    try {
      const updatedItem = updateItem(storageKey, id, updates);
      setData(getData(storageKey));
      return { success: true, data: updatedItem };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [storageKey]);

  // Delete item
  const remove = useCallback((id) => {
    try {
      deleteItem(storageKey, id);
      setData(getData(storageKey));
      return { success: true };
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    }
  }, [storageKey]);

  // Refresh data
  const refresh = useCallback(() => {
    try {
      setLoading(true);
      const refreshedData = getData(storageKey);
      setData(refreshedData);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  return {
    data,
    loading,
    error,
    add,
    update,
    remove,
    refresh,
  };
};

export default useData;
