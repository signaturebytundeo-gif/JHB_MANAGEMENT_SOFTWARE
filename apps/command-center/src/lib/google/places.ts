export class MissingApiKeyError extends Error {
  constructor(message: string = 'Google Maps API key is missing') {
    super(message);
    this.name = 'MissingApiKeyError';
  }
}

// Cache the Google Maps loading promise
let googleMapsPromise: Promise<typeof google.maps> | null = null;

// Export for testing
export function resetGoogleMapsCache() {
  googleMapsPromise = null;
}

/**
 * Loads Google Maps JavaScript API with Places library
 * @returns Promise resolving to google.maps namespace
 * @throws MissingApiKeyError when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is empty/undefined
 */
export function loadGoogleMaps(): Promise<typeof google.maps> {
  // Return cached promise if already loading/loaded
  if (googleMapsPromise) {
    return googleMapsPromise;
  }

  googleMapsPromise = new Promise((resolve, reject) => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

    if (!apiKey || apiKey.trim() === '') {
      reject(new MissingApiKeyError());
      return;
    }

    // Check if already loaded
    if (typeof window !== 'undefined' && window.google?.maps) {
      resolve(window.google.maps);
      return;
    }

    // Create and inject script
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&v=weekly&loading=async`;
    script.async = true;

    script.addEventListener('load', () => {
      if (window.google?.maps) {
        resolve(window.google.maps);
      } else {
        reject(new Error('Google Maps failed to load'));
      }
    });

    script.addEventListener('error', () => {
      reject(new Error('Failed to load Google Maps script'));
    });

    // Append to head
    const head = document.querySelector('head');
    if (head) {
      head.appendChild(script);
    } else {
      reject(new Error('No head element found'));
    }
  });

  return googleMapsPromise;
}

/**
 * Creates a new session token for autocomplete billing optimization
 */
export function createSessionToken(): google.maps.places.AutocompleteSessionToken {
  if (!window.google?.maps?.places) {
    throw new Error('Google Maps Places library not loaded');
  }

  return new google.maps.places.AutocompleteSessionToken();
}

interface PlacePredictionsParams {
  input: string;
  sessionToken: google.maps.places.AutocompleteSessionToken | string;
  signal: AbortSignal;
}

/**
 * Gets place predictions for autocomplete
 * @returns Empty array for input < 3 characters
 */
export function getPlacePredictions(params: PlacePredictionsParams): Promise<google.maps.places.AutocompletePrediction[]> {
  return new Promise((resolve, reject) => {
    const { input, sessionToken, signal } = params;

    // Check if aborted before starting
    if (signal.aborted) {
      reject(new Error('AbortError'));
      return;
    }

    // Short-circuit for input < 3 characters
    if (input.length < 3) {
      resolve([]);
      return;
    }

    if (!window.google?.maps?.places) {
      reject(new Error('Google Maps Places library not loaded'));
      return;
    }

    const service = new google.maps.places.AutocompleteService();

    const request: google.maps.places.AutocompletionRequest = {
      input,
      sessionToken,
      componentRestrictions: { country: 'us' },
      types: ['address']
    };

    service.getPlacePredictions(request, (predictions, status) => {
      if (signal.aborted) {
        reject(new Error('AbortError'));
        return;
      }

      if (status === 'OK' && predictions) {
        resolve(predictions);
      } else if (status === 'ZERO_RESULTS') {
        resolve([]);
      } else {
        reject(new Error(`Places API error: ${status}`));
      }
    });
  });
}

interface NormalizedAddress {
  line1: string;
  line2: string;
  city: string;
  state: string;
  zip: string;
}

/**
 * Gets detailed place information and normalizes to standard address format
 */
export function getPlaceDetails(
  placeId: string,
  sessionToken: google.maps.places.AutocompleteSessionToken | string
): Promise<NormalizedAddress> {
  return new Promise((resolve, reject) => {
    if (!window.google?.maps?.places) {
      reject(new Error('Google Maps Places library not loaded'));
      return;
    }

    // PlacesService needs a DOM element
    const hiddenDiv = document.createElement('div');
    const service = new google.maps.places.PlacesService(hiddenDiv);

    const request: google.maps.places.PlaceDetailsRequest = {
      placeId,
      sessionToken,
      fields: ['address_components', 'formatted_address']
    };

    service.getDetails(request, (place, status) => {
      if (status === 'OK' && place?.address_components) {
        const normalized = normalizeAddressComponents(place.address_components);
        resolve(normalized);
      } else {
        reject(new Error(`Places API error: ${status}`));
      }
    });
  });
}

/**
 * Parses Google Places address_components into normalized format
 */
function normalizeAddressComponents(components: google.maps.GeocoderAddressComponent[]): NormalizedAddress {
  let streetNumber = '';
  let route = '';
  let locality = '';
  let sublocality = '';
  let state = '';
  let postalCode = '';

  for (const component of components) {
    const types = component.types;

    if (types.includes('street_number')) {
      streetNumber = component.long_name;
    } else if (types.includes('route')) {
      route = component.long_name;
    } else if (types.includes('locality')) {
      locality = component.long_name;
    } else if (types.includes('sublocality')) {
      sublocality = component.long_name;
    } else if (types.includes('administrative_area_level_1')) {
      state = component.short_name;
    } else if (types.includes('postal_code')) {
      postalCode = component.long_name;
    }
  }

  // Build line1 from street number + route
  const line1 = [streetNumber, route].filter(Boolean).join(' ');

  // Prefer locality, fallback to sublocality
  const city = locality || sublocality;

  return {
    line1,
    line2: '',
    city,
    state,
    zip: postalCode
  };
}