'use client'

import { useState, useEffect } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T) => void] {
  // Get from local storage then
  // parse stored json or return initialValue
  const [storedValue, setStoredValue] = useState<T>(initialValue)

  useEffect(() => {
    // Prevent build errors
    if (typeof window === 'undefined') {
      return
    }

    try {
      const item = window.localStorage.getItem(key)
      const value = item ? JSON.parse(item) : initialValue
      setStoredValue(value)
    } catch (error) {
      console.log(error)
      setStoredValue(initialValue)
    }
  }, [initialValue, key])

  // Return a wrapped version of useState's setter function that
  // persists the new value to localStorage.
  const setValue = (value: T) => {
    try {
      // Allow value to be a function so we have same API as useState
      const valueToStore =
        value instanceof Function ? value(storedValue) : value
      
      // Save state
      setStoredValue(valueToStore)
      
      // Save to local storage
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore))
      }
    } catch (error) {
      console.log(error)
    }
  }

  return [storedValue, setValue]
} 