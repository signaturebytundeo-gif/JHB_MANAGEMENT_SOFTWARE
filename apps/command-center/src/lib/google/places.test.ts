import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadGoogleMaps, createSessionToken, getPlacePredictions, getPlaceDetails, MissingApiKeyError, resetGoogleMapsCache } from './places';

// Mock document.createElement for PlacesService
Object.defineProperty(global, 'document', {
  value: {
    createElement: vi.fn().mockReturnValue({
      style: {}
    }),
    querySelector: vi.fn()
  },
  writable: true
});

describe('places.ts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the promise cache
    resetGoogleMapsCache();
    // Reset environment variables
    vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');
    // Reset all global stubs
    vi.unstubAllGlobals();
  });

  describe('loadGoogleMaps', () => {
    it('should reject with MissingApiKeyError when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is empty', async () => {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', '');

      await expect(loadGoogleMaps()).rejects.toThrow(MissingApiKeyError);
    });

    it('should reject with MissingApiKeyError when NEXT_PUBLIC_GOOGLE_MAPS_API_KEY is undefined', async () => {
      delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

      await expect(loadGoogleMaps()).rejects.toThrow(MissingApiKeyError);
    });

    it('should load Google Maps script and return google.maps when API key is present', async () => {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-api-key');

      const mockMaps = { places: {} };

      // Mock script loading
      const mockScript = {
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            // Simulate successful script load
            vi.stubGlobal('google', { maps: mockMaps });
            setTimeout(callback, 0);
          }
        }),
        src: '',
        async: false
      };

      vi.spyOn(document, 'createElement').mockReturnValue(mockScript as any);
      const appendChildSpy = vi.fn();
      vi.spyOn(document, 'querySelector').mockReturnValue({ appendChild: appendChildSpy } as any);

      const result = await loadGoogleMaps();

      expect(result).toBe(mockMaps);
      expect(mockScript.src).toContain('https://maps.googleapis.com/maps/api/js');
      expect(mockScript.src).toContain('key=test-api-key');
      expect(mockScript.src).toContain('libraries=places');
      expect(mockScript.src).toContain('v=weekly');
      expect(mockScript.src).toContain('loading=async');
    });

    it('should cache the promise and not inject script twice on multiple calls', async () => {
      vi.stubEnv('NEXT_PUBLIC_GOOGLE_MAPS_API_KEY', 'test-api-key');

      const mockMaps = { places: {} };
      const mockScript = {
        addEventListener: vi.fn((event, callback) => {
          if (event === 'load') {
            vi.stubGlobal('google', { maps: mockMaps });
            setTimeout(callback, 0);
          }
        }),
        src: '',
        async: false
      };

      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockScript as any);
      vi.spyOn(document, 'querySelector').mockReturnValue({ appendChild: vi.fn() } as any);

      // Call loadGoogleMaps twice
      const [result1, result2] = await Promise.all([loadGoogleMaps(), loadGoogleMaps()]);

      expect(result1).toBe(mockMaps);
      expect(result2).toBe(mockMaps);
      // Script should only be created once
      expect(createElementSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('createSessionToken', () => {
    it('should create a new session token', () => {
      const MockSessionToken = vi.fn().mockImplementation(function(this: any) {
        return this;
      });

      vi.stubGlobal('google', {
        maps: {
          places: {
            AutocompleteSessionToken: MockSessionToken
          }
        }
      });

      const token = createSessionToken();

      expect(MockSessionToken).toHaveBeenCalled();
      expect(token).toBeInstanceOf(MockSessionToken);
    });
  });

  describe('getPlacePredictions', () => {
    let mockAutocompleteService: any;

    beforeEach(() => {
      mockAutocompleteService = {
        getPlacePredictions: vi.fn()
      };

      class MockAutocompleteService {
        getPlacePredictions = mockAutocompleteService.getPlacePredictions;
      }

      vi.stubGlobal('google', {
        maps: {
          places: {
            AutocompleteService: MockAutocompleteService
          }
        }
      });
    });

    it('should return empty array for input less than 3 characters', async () => {
      const result = await getPlacePredictions({
        input: 'ab',
        sessionToken: 'token',
        signal: new AbortController().signal
      });

      expect(result).toEqual([]);
      expect(mockAutocompleteService.getPlacePredictions).not.toHaveBeenCalled();
    });

    it('should call getPlacePredictions with correct parameters for valid input', async () => {
      const mockPredictions = [
        { description: '123 Main St, City, State, USA', place_id: 'place123' }
      ];

      mockAutocompleteService.getPlacePredictions.mockImplementation((request: any, callback: any) => {
        callback(mockPredictions, 'OK');
      });

      const result = await getPlacePredictions({
        input: '123 Main',
        sessionToken: 'token',
        signal: new AbortController().signal
      });

      expect(mockAutocompleteService.getPlacePredictions).toHaveBeenCalledWith({
        input: '123 Main',
        sessionToken: 'token',
        componentRestrictions: { country: 'us' },
        types: ['address']
      }, expect.any(Function));

      expect(result).toEqual(mockPredictions);
    });

    it('should reject with AbortError when signal is aborted', async () => {
      const controller = new AbortController();
      controller.abort();

      await expect(getPlacePredictions({
        input: '123 Main',
        sessionToken: 'token',
        signal: controller.signal
      })).rejects.toThrow('AbortError');

      expect(mockAutocompleteService.getPlacePredictions).not.toHaveBeenCalled();
    });

    it('should reject when Places service returns error status', async () => {
      mockAutocompleteService.getPlacePredictions.mockImplementation((request: any, callback: any) => {
        callback(null, 'ERROR');
      });

      await expect(getPlacePredictions({
        input: '123 Main',
        sessionToken: 'token',
        signal: new AbortController().signal
      })).rejects.toThrow('Places API error: ERROR');
    });
  });

  describe('getPlaceDetails', () => {
    let mockPlacesService: any;

    beforeEach(() => {
      mockPlacesService = {
        getDetails: vi.fn()
      };

      class MockPlacesService {
        getDetails = mockPlacesService.getDetails;
        constructor(element: any) {}
      }

      vi.stubGlobal('google', {
        maps: {
          places: {
            PlacesService: MockPlacesService
          }
        }
      });
    });

    it('should return normalized address object with all components', async () => {
      const mockPlace = {
        address_components: [
          { long_name: '123', short_name: '123', types: ['street_number'] },
          { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
          { long_name: 'Mountain View', short_name: 'Mountain View', types: ['locality'] },
          { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
          { long_name: '94043', short_name: '94043', types: ['postal_code'] }
        ],
        formatted_address: '123 Main St, Mountain View, CA 94043, USA'
      };

      mockPlacesService.getDetails.mockImplementation((request: any, callback: any) => {
        callback(mockPlace, 'OK');
      });

      const result = await getPlaceDetails('place123', 'session-token');

      expect(mockPlacesService.getDetails).toHaveBeenCalledWith({
        placeId: 'place123',
        sessionToken: 'session-token',
        fields: ['address_components', 'formatted_address']
      }, expect.any(Function));

      expect(result).toEqual({
        line1: '123 Main Street',
        line2: '',
        city: 'Mountain View',
        state: 'CA',
        zip: '94043'
      });
    });

    it('should fallback to sublocality when locality is missing', async () => {
      const mockPlace = {
        address_components: [
          { long_name: '123', short_name: '123', types: ['street_number'] },
          { long_name: 'Main Street', short_name: 'Main St', types: ['route'] },
          { long_name: 'Sublocality Area', short_name: 'Sublocality Area', types: ['sublocality'] },
          { long_name: 'California', short_name: 'CA', types: ['administrative_area_level_1'] },
          { long_name: '94043', short_name: '94043', types: ['postal_code'] }
        ],
        formatted_address: '123 Main St, Sublocality Area, CA 94043, USA'
      };

      mockPlacesService.getDetails.mockImplementation((request: any, callback: any) => {
        callback(mockPlace, 'OK');
      });

      const result = await getPlaceDetails('place123', 'session-token');

      expect(result.city).toBe('Sublocality Area');
    });

    it('should handle missing address components gracefully', async () => {
      const mockPlace = {
        address_components: [
          { long_name: 'Partial Street', short_name: 'Partial St', types: ['route'] }
        ],
        formatted_address: 'Partial St, Unknown, USA'
      };

      mockPlacesService.getDetails.mockImplementation((request: any, callback: any) => {
        callback(mockPlace, 'OK');
      });

      const result = await getPlaceDetails('place123', 'session-token');

      expect(result).toEqual({
        line1: 'Partial Street',
        line2: '',
        city: '',
        state: '',
        zip: ''
      });
    });

    it('should reject when Places service returns error status', async () => {
      mockPlacesService.getDetails.mockImplementation((request: any, callback: any) => {
        callback(null, 'ERROR');
      });

      await expect(getPlaceDetails('place123', 'session-token')).rejects.toThrow('Places API error: ERROR');
    });
  });
});