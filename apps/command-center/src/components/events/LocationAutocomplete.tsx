'use client';

import { useEffect, useRef, useState } from 'react';

interface LocationAutocompleteProps {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  className?: string;
}

declare global {
  interface Window {
    google?: any;
    initGooglePlaces?: () => void;
  }
}

export function LocationAutocomplete({
  name,
  defaultValue = '',
  placeholder = 'Search address or venue...',
  className = '',
}: LocationAutocompleteProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) return; // Gracefully degrade to plain input

    // Skip if already loaded
    if (window.google?.maps?.places) {
      initAutocomplete();
      return;
    }

    // Load the script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
    script.async = true;
    script.onload = () => initAutocomplete();
    document.head.appendChild(script);

    return () => {
      // Cleanup not strictly needed for Google Maps script
    };
  }, []);

  function initAutocomplete() {
    if (!inputRef.current || !window.google?.maps?.places) return;

    const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
      types: ['establishment', 'geocode'],
      componentRestrictions: { country: 'us' },
      fields: ['formatted_address', 'name', 'geometry'],
    });

    autocomplete.addListener('place_changed', () => {
      const place = autocomplete.getPlace();
      const display = place.name
        ? `${place.name}, ${place.formatted_address}`
        : place.formatted_address || '';
      setValue(display);
    });

    setLoaded(true);
  }

  return (
    <input
      ref={inputRef}
      type="text"
      name={name}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
    />
  );
}
