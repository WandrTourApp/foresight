'use client';

import { useState, useEffect } from 'react';
import { store } from './store';
import { Boat } from './store';

export function useActiveBoat() {
  const [activeBoatId, setActiveBoatIdState] = useState<string | null>(null);
  const [boat, setBoat] = useState<Boat | null>(null);

  // Load active boat on mount and when it changes
  useEffect(() => {
    const loadActiveBoat = () => {
      const id = store.getActiveBoatId();
      const activeBoat = store.getActiveBoat();
      setActiveBoatIdState(id);
      setBoat(activeBoat);
    };

    loadActiveBoat();

    // Set up a simple polling mechanism to detect changes
    // In a real app, you'd use a more sophisticated state management solution
    const interval = setInterval(loadActiveBoat, 1000);
    return () => clearInterval(interval);
  }, []);

  const setActiveBoat = (id: string | null) => {
    store.setActiveBoat(id);
    const activeBoat = store.getActiveBoat();
    setActiveBoatIdState(id);
    setBoat(activeBoat);
  };

  return {
    activeBoatId,
    boat,
    setActiveBoat
  };
}