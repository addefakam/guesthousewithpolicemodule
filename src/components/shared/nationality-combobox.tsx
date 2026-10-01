"use client";

import { useState } from "react";
import { Check, ChevronsUpDown, Search } from "lucide-react";
import { COUNTRIES, type Country } from "@/lib/countries";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

/**
 * NationalityCombobox — a searchable country dropdown.
 *
 * Replaces the plain <Select> dropdown that required scrolling through
 * ~197 countries to find the one you want. Now the user types "USA"
 * or "America" or "United" and the list filters instantly.
 *
 * - The stored value is the canonical country name (e.g. "United States")
 * - The displayed label includes aliases when available (e.g. "United States (USA, America)")
 * - Both the canonical name AND the displayAs label are searchable,
 *   so typing "USA", "America", or "United" all find the USA.
 *
 * Usage:
 *   <NationalityCombobox
 *     value={newGuestForm.nationality}
 *     onValueChange={(v) => setNewGuestForm({ ...newGuestForm, nationality: v })}
 *     placeholder="Select nationality..."
 *   />
 */

interface NationalityComboboxProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** i18n function for the search input placeholder + empty state.
   *  Falls back to English defaults if not provided. */
  t?: (key: string, opts?: Record<string, unknown>) => string;
}

export function NationalityCombobox({
  value,
  onValueChange,
  placeholder = "Select nationality...",
  className,
  t,
}: NationalityComboboxProps) {
  const [open, setOpen] = useState(false);

  // Find the currently-selected country object (for display label)
  const selected = COUNTRIES.find((c) => c.name === value);
  const displayLabel = selected ? (selected.displayAs || selected.name) : value;

  // Search helper — matches against BOTH the canonical name AND displayAs
  function matchesCountry(country: Country, query: string): boolean {
    const q = query.toLowerCase().trim();
    if (!q) return true;
    // Match canonical name
    if (country.name.toLowerCase().includes(q)) return true;
    // Match displayAs (which contains aliases like "USA, America")
    if (country.displayAs && country.displayAs.toLowerCase().includes(q)) return true;
    // Match ISO code
    if (country.code.toLowerCase().includes(q)) return true;
    return false;
  }

  // Group countries alphabetically for the dropdown
  // (already alphabetical in countries.ts, but ensure here too)
  const sortedCountries = [...COUNTRIES].sort((a, b) =>
    a.name.localeCompare(b.name)
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", !value && "text-muted-foreground", className)}
        >
          <span className="truncate">
            {value ? displayLabel : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] min-w-[300px] p-0" align="start">
        <Command filter={() => 1}>
          {/* filter={() => 1} disables cmdk's built-in filtering — we do it ourselves via matchesCountry */}
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <CommandInput
              placeholder={t ? t("searchNationality", { defaultValue: "Search country..." }) : "Search country..."}
              className="h-9 border-0 ring-0 focus:ring-0"
            />
          </div>
          <CommandList className="max-h-60 overflow-y-auto">
            <CommandEmpty>
              {t ? t("noCountryFound", { defaultValue: "No country found." }) : "No country found."}
            </CommandEmpty>
            <CommandGroup>
              {sortedCountries.map((country) => (
                <CommandItem
                  key={country.code}
                  value={country.name + " " + (country.displayAs || "") + " " + country.code}
                  onSelect={() => {
                    onValueChange(country.name === value ? "" : country.name);
                    setOpen(false);
                  }}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === country.name ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span>{country.displayAs || country.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
