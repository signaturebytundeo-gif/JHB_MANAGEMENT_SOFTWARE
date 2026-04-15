"use client"

import * as React from "react"
import * as PopoverPrimitive from "@radix-ui/react-popover"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchableSelectOption {
  value: string
  label: string
  keywords?: string[]
  disabled?: boolean
}

interface SearchableSelectProps {
  value: string | undefined
  onValueChange: (value: string) => void
  options: SearchableSelectOption[]
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

const SearchableSelect = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  SearchableSelectProps
>(({
  value,
  onValueChange,
  options,
  placeholder = "Select option...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results",
  disabled = false,
  className,
  id,
  name,
  ...props
}, ref) => {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [highlightedIndex, setHighlightedIndex] = React.useState(0)
  const [isMobile, setIsMobile] = React.useState(false)
  const searchInputRef = React.useRef<HTMLInputElement>(null)

  // Detect mobile viewport
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 640px)')
    const handleChange = () => setIsMobile(mediaQuery.matches)

    setIsMobile(mediaQuery.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // Filter options based on search query
  const filteredOptions = React.useMemo(() => {
    if (!query.trim()) return options

    const lowercaseQuery = query.toLowerCase()
    return options.filter(option => {
      const matchesLabel = option.label.toLowerCase().includes(lowercaseQuery)
      const matchesKeywords = option.keywords?.some(keyword =>
        keyword.toLowerCase().includes(lowercaseQuery)
      )
      return matchesLabel || matchesKeywords
    })
  }, [options, query])

  // Reset highlighted index when filtered options change
  React.useEffect(() => {
    setHighlightedIndex(0)
  }, [filteredOptions])

  // Auto-focus search input when popover opens
  React.useEffect(() => {
    if (open && searchInputRef.current) {
      searchInputRef.current.focus()
    }
  }, [open])

  // Find selected option label
  const selectedOption = options.find(opt => opt.value === value)
  const displayValue = selectedOption?.label || placeholder

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev =>
          Math.min(prev + 1, filteredOptions.length - 1)
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, 0))
        break
      case 'Enter':
        e.preventDefault()
        if (filteredOptions[highlightedIndex]) {
          onValueChange(filteredOptions[highlightedIndex].value)
          setOpen(false)
          setQuery("")
        }
        break
      case 'Escape':
        e.preventDefault()
        setOpen(false)
        setQuery("")
        break
    }
  }

  // Handle option selection
  const handleOptionSelect = (optionValue: string) => {
    onValueChange(optionValue)
    setOpen(false)
    setQuery("")
  }

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <button
          ref={ref}
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm ring-offset-background data-[placeholder]:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
            className
          )}
          aria-expanded={open}
          aria-haspopup="listbox"
          id={id}
          {...props}
        >
          <span className={cn(
            "block truncate",
            !selectedOption && "text-muted-foreground"
          )}>
            {displayValue}
          </span>
          <ChevronDown className="h-4 w-4 opacity-50" />
        </button>
      </PopoverPrimitive.Trigger>

      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          className={cn(
            "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
            isMobile && "w-[--radix-popover-trigger-width]"
          )}
          side="bottom"
          sideOffset={4}
          align="start"
        >
          {/* Search Input */}
          <div className="sticky top-0 bg-popover border-b p-2">
            <input
              ref={searchInputRef}
              type="text"
              placeholder={searchPlaceholder}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
              inputMode="search"
              className="w-full px-3 py-2 text-sm bg-transparent border rounded-sm border-input placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Options List */}
          <div
            role="listbox"
            className="max-h-[60vh] sm:max-h-96 overflow-y-auto overscroll-contain p-1"
          >
            {filteredOptions.length === 0 ? (
              <div className="px-2 py-4 text-sm text-muted-foreground text-center">
                {emptyMessage}
              </div>
            ) : (
              filteredOptions.map((option, index) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  disabled={option.disabled}
                  aria-selected={option.value === value}
                  data-highlighted={index === highlightedIndex}
                  onClick={() => handleOptionSelect(option.value)}
                  className={cn(
                    "relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-2 pr-8 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
                    index === highlightedIndex && "bg-accent text-accent-foreground",
                    option.value === value && "bg-accent text-accent-foreground"
                  )}
                >
                  <span className="block truncate">{option.label}</span>
                  {option.value === value && (
                    <span className="absolute right-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Check className="h-4 w-4" />
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>

      {/* Hidden input for form submission */}
      {name && <input type="hidden" name={name} value={value || ""} />}
    </PopoverPrimitive.Root>
  )
})

SearchableSelect.displayName = "SearchableSelect"

export { SearchableSelect }