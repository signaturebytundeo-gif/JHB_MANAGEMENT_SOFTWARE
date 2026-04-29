'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Clock } from 'lucide-react';

interface EventNameAutocompleteProps {
  name: string;
  eventNames: string[];
  defaultValue?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
}

export function EventNameAutocomplete({
  name,
  eventNames,
  defaultValue = '',
  placeholder = 'Enter event name or select from previous...',
  className = '',
  required = false,
}: EventNameAutocompleteProps) {
  console.log('EventNameAutocomplete received eventNames:', eventNames);

  // Add common templates if no event names exist
  const allNames = useMemo(() => {
    const commonTemplates = [
      'Tuesday Farmers Market',
      'Wednesday Farmers Market',
      'Thursday Farmers Market',
      'Friday Farmers Market',
      'Saturday Farmers Market',
      'Sunday Farmers Market',
      'Coral Springs Green Market',
      'Deerfield Beach Farmers Market',
      'Pompano Beach Green Market',
      'Fort Lauderdale Market'
    ];

    const names = eventNames.length > 0 ? eventNames : commonTemplates;
    console.log('Using names for dropdown:', names);
    return names;
  }, [eventNames]);

  const [value, setValue] = useState(defaultValue);
  const [isOpen, setIsOpen] = useState(false);
  const [filteredNames, setFilteredNames] = useState(allNames);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Filter event names based on current input
  useEffect(() => {
    if (value.trim() === '') {
      setFilteredNames(allNames);
    } else {
      const filtered = allNames.filter(eventName =>
        eventName.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredNames(filtered);
    }
  }, [value, allNames]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setIsOpen(true);
  };

  const selectEventName = (eventName: string) => {
    setValue(eventName);
    setIsOpen(false);
    inputRef.current?.focus();
  };

  const toggleDropdown = () => {
    setIsOpen(!isOpen);
    inputRef.current?.focus();
  };

  return (
    <div className="relative">
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          name={name}
          value={value}
          onChange={handleInputChange}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          required={required}
          className={`${className} pr-8`}
        />
        <button
          type="button"
          onClick={toggleDropdown}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-300"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute z-50 w-full mt-1 bg-caribbean-black border border-caribbean-gold/20 rounded-md shadow-lg max-h-60 overflow-y-auto"
        >
          {filteredNames.length > 0 ? (
            <div className="py-1">
              <div className="px-3 py-1 text-xs text-gray-400 uppercase tracking-wide border-b border-caribbean-gold/10">
                Previous Events
              </div>
              {filteredNames.map((eventName, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => selectEventName(eventName)}
                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-caribbean-green/10 transition-colors flex items-center gap-2"
                >
                  <Clock className="w-3 h-3 text-gray-400 flex-shrink-0" />
                  {eventName}
                </button>
              ))}
            </div>
          ) : (
            <div className="px-3 py-2 text-sm text-gray-500">
              {value.trim() === '' ? 'No previous events' : 'No matching events'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}