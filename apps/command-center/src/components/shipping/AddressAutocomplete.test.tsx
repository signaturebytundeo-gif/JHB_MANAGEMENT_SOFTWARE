import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AddressAutocomplete } from './AddressAutocomplete';
import { MissingApiKeyError } from '@/lib/google/places';

// Mock the places module
vi.mock('@/lib/google/places', () => ({
  MissingApiKeyError: class extends Error {
    constructor(message = 'Google Maps API key is missing') {
      super(message);
      this.name = 'MissingApiKeyError';
    }
  },
  loadGoogleMaps: vi.fn(),
  createSessionToken: vi.fn(),
  getPlacePredictions: vi.fn(),
  getPlaceDetails: vi.fn()
}));

describe('AddressAutocomplete', () => {
  const mockOnAddressSelect = vi.fn();
  const defaultProps = {
    id: 'test-address',
    name: 'addressLine1',
    onAddressSelect: mockOnAddressSelect,
    required: true
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fallback mode (no API key)', () => {
    it('should render plain input when loadGoogleMaps rejects with MissingApiKeyError', async () => {
      const { loadGoogleMaps } = await import('@/lib/google/places');
      vi.mocked(loadGoogleMaps).mockRejectedValue(new MissingApiKeyError());

      render(<AddressAutocomplete {...defaultProps} defaultValue="123 Main St" />);

      await waitFor(() => {
        // Should render a plain input field
        const input = screen.getByDisplayValue('123 Main St');
        expect(input).toHaveAttribute('name', 'addressLine1');
        expect(input).toHaveAttribute('required');

        // Should not show any dropdown or predictions
        expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
      });
    });

    it('should not spam console errors in fallback mode', async () => {
      const { loadGoogleMaps } = await import('@/lib/google/places');
      vi.mocked(loadGoogleMaps).mockRejectedValue(new MissingApiKeyError());

      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<AddressAutocomplete {...defaultProps} />);

      await waitFor(() => {
        expect(consoleSpy).not.toHaveBeenCalled();
      });

      consoleSpy.mockRestore();
    });
  });

  describe('autocomplete mode (with API key)', () => {
    beforeEach(async () => {
      const { loadGoogleMaps, createSessionToken, getPlacePredictions } = await import('@/lib/google/places');

      // Mock successful API load
      vi.mocked(loadGoogleMaps).mockResolvedValue({} as any);
      vi.mocked(createSessionToken).mockReturnValue('mock-session-token' as any);
      vi.mocked(getPlacePredictions).mockResolvedValue([]);
    });

    it('should render input with combobox role when API is available', async () => {
      render(<AddressAutocomplete {...defaultProps} />);

      await waitFor(() => {
        const input = screen.getByRole('combobox');
        expect(input).toHaveAttribute('name', 'addressLine1');
        expect(input).toHaveAttribute('aria-autocomplete', 'list');
        expect(input).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('should call predictions when typing >= 3 characters', async () => {
      const { getPlacePredictions } = await import('@/lib/google/places');

      render(<AddressAutocomplete {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const input = screen.getByRole('combobox');

      // Type enough characters
      fireEvent.change(input, { target: { value: '123 Main' } });

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 300));

      await waitFor(() => {
        expect(getPlacePredictions).toHaveBeenCalledWith({
          input: '123 Main',
          sessionToken: 'mock-session-token',
          signal: expect.any(AbortSignal)
        });
      });
    });

    it('should show predictions in dropdown', async () => {
      const { getPlacePredictions } = await import('@/lib/google/places');

      const mockPredictions = [
        { description: '123 Main St, City A, State, USA', place_id: 'place1' },
        { description: '123 Main Ave, City B, State, USA', place_id: 'place2' }
      ];

      vi.mocked(getPlacePredictions).mockResolvedValue(mockPredictions);

      render(<AddressAutocomplete {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main' } });

      // Wait for debounce and async predictions
      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      }, { timeout: 1000 });

      const options = screen.getAllByRole('option');
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent('123 Main St, City A, State, USA');
    });

    it('should handle prediction selection and call onAddressSelect', async () => {
      const { getPlacePredictions, getPlaceDetails } = await import('@/lib/google/places');

      const mockPredictions = [
        { description: '123 Main St, City A, State, USA', place_id: 'place1' }
      ];

      const mockAddressDetails = {
        line1: '123 Main St',
        line2: '',
        city: 'City A',
        state: 'CA',
        zip: '12345'
      };

      vi.mocked(getPlacePredictions).mockResolvedValue(mockPredictions);
      vi.mocked(getPlaceDetails).mockResolvedValue(mockAddressDetails);

      render(<AddressAutocomplete {...defaultProps} />);

      await waitFor(() => {
        expect(screen.getByRole('combobox')).toBeInTheDocument();
      });

      const input = screen.getByRole('combobox');
      fireEvent.change(input, { target: { value: '123 Main' } });

      await waitFor(() => {
        expect(screen.getByRole('listbox')).toBeInTheDocument();
      }, { timeout: 1000 });

      const option = screen.getByRole('option');
      fireEvent.click(option);

      await waitFor(() => {
        expect(getPlaceDetails).toHaveBeenCalledWith('place1', 'mock-session-token');
        expect(mockOnAddressSelect).toHaveBeenCalledWith(mockAddressDetails);
      });
    });
  });
});