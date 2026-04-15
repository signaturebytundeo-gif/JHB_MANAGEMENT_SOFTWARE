'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { loadGoogleMaps, createSessionToken, getPlacePredictions, getPlaceDetails, MissingApiKeyError } from '@/lib/google/places';
import { cn } from '@/lib/utils';

interface AddressAutocompleteProps {
  id: string;
  name: string;
  defaultValue?: string;
  required?: boolean;
  onAddressSelect: (address: {
    line1: string;
    city: string;
    state: string;
    zip: string;
  }) => void;
  className?: string;
}

export function AddressAutocomplete({
  id,
  name,
  defaultValue = '',
  required = false,
  onAddressSelect,
  className
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(defaultValue);
  const [predictions, setPredictions] = useState<google.maps.places.AutocompletePrediction[]>([]);
  const [highlighted, setHighlighted] = useState(-1);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fallback, setFallback] = useState(false);
  const [sessionToken, setSessionToken] = useState<google.maps.places.AutocompleteSessionToken | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const blurTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Check if mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 640);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Initialize Google Maps and session token
  useEffect(() => {
    let mounted = true;

    async function init() {
      try {
        await loadGoogleMaps();
        if (mounted) {
          setSessionToken(createSessionToken());
        }
      } catch (error) {
        if (mounted && error instanceof MissingApiKeyError) {
          setFallback(true);
        }
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Debounced fetch predictions
  const fetchPredictions = useCallback(async (input: string) => {
    if (!sessionToken || input.length < 3) {
      setPredictions([]);
      setOpen(false);
      return;
    }

    // Cancel any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new abort controller
    abortControllerRef.current = new AbortController();

    try {
      setLoading(true);
      const results = await getPlacePredictions({
        input,
        sessionToken,
        signal: abortControllerRef.current.signal
      });

      setPredictions(results.slice(0, 5)); // Limit to 5 results
      setOpen(results.length > 0);
      setHighlighted(-1);
    } catch (error: any) {
      if (error.message !== 'AbortError') {
        console.warn('Failed to fetch predictions:', error);
        setPredictions([]);
        setOpen(false);
      }
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value);

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Debounce predictions fetch
    debounceTimerRef.current = setTimeout(() => {
      fetchPredictions(value);
    }, 250);
  };

  // Handle prediction selection
  const selectPrediction = useCallback(async (prediction: google.maps.places.AutocompletePrediction) => {
    if (!sessionToken) return;

    try {
      setLoading(true);
      const details = await getPlaceDetails(prediction.place_id, sessionToken);

      // Update input value
      setQuery(details.line1);
      setOpen(false);
      setPredictions([]);
      setHighlighted(-1);

      // Create new session token for next search (Google billing guidance)
      setSessionToken(createSessionToken());

      // Notify parent component
      onAddressSelect(details);
    } catch (error) {
      console.warn('Failed to get place details:', error);
    } finally {
      setLoading(false);
    }
  }, [sessionToken, onAddressSelect]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || predictions.length === 0) {
      if (e.key === 'Escape') {
        setOpen(false);
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlighted(prev => Math.min(prev + 1, predictions.length - 1));
        break;

      case 'ArrowUp':
        e.preventDefault();
        setHighlighted(prev => Math.max(prev - 1, -1));
        break;

      case 'Enter':
        e.preventDefault();
        if (highlighted >= 0 && predictions[highlighted]) {
          selectPrediction(predictions[highlighted]);
        }
        break;

      case 'Escape':
        e.preventDefault();
        setOpen(false);
        setHighlighted(-1);
        break;
    }
  };

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        inputRef.current &&
        listRef.current &&
        !inputRef.current.contains(e.target as Node) &&
        !listRef.current.contains(e.target as Node)
      ) {
        // Delay closing to allow clicks on predictions to register
        blurTimerRef.current = setTimeout(() => {
          setOpen(false);
        }, 150);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
    };
  }, []);

  // Handle input blur
  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 150);
  };

  // Handle input focus
  const handleFocus = () => {
    if (blurTimerRef.current) {
      clearTimeout(blurTimerRef.current);
    }
    if (predictions.length > 0) {
      setOpen(true);
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (blurTimerRef.current) {
        clearTimeout(blurTimerRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Render fallback input if API unavailable
  if (fallback) {
    return (
      <Input
        id={id}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className={className}
      />
    );
  }

  return (
    <div className="relative">
      <Input
        ref={inputRef}
        id={id}
        name={name}
        value={query}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
        required={required}
        className={className}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-activedescendant={highlighted >= 0 ? `${id}-option-${highlighted}` : undefined}
        autoComplete="off"
      />

      {open && predictions.length > 0 && (
        <ul
          ref={listRef}
          role="listbox"
          className={cn(
            'z-50 rounded-md border bg-popover shadow-md',
            isMobile
              ? 'fixed inset-x-2 bottom-2 sm:inset-auto sm:bottom-auto max-h-[40vh] overflow-y-auto'
              : 'absolute mt-1 w-full'
          )}
        >
          {predictions.map((prediction, index) => (
            <li
              key={prediction.place_id}
              id={`${id}-option-${index}`}
              role="option"
              aria-selected={highlighted === index}
              className={cn(
                'px-3 py-2 cursor-pointer text-sm border-b last:border-b-0',
                highlighted === index
                  ? 'bg-accent text-accent-foreground'
                  : 'hover:bg-accent hover:text-accent-foreground'
              )}
              onClick={() => selectPrediction(prediction)}
            >
              {prediction.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}