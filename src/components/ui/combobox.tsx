import { Combobox as HCombobox } from "@headlessui/react";
import { Fragment } from "react";

interface Option {
  value: string;
  label: string;
}

interface ComboboxProps {
  value: string | null;
  onChange: (value: string) => void;
  inputValue: string;
  onInputChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  emptyMessage?: string;
}

export function Combobox({
  value,
  onChange,
  inputValue,
  onInputChange,
  options,
  placeholder,
  emptyMessage = "No results"
}: ComboboxProps) {
  return (
    <HCombobox value={value} onChange={onChange}>
      <div className="relative">
        <HCombobox.Input
          className="w-full border rounded px-3 py-2"
          displayValue={(val: string) =>
            options.find((o) => o.value === val)?.label || ""
          }
          onChange={(e) => onInputChange(e.target.value)}
          placeholder={placeholder}
        />
        <HCombobox.Options className="absolute z-10 mt-1 w-full bg-white border rounded shadow-lg max-h-60 overflow-auto">
          {options.length === 0 ? (
            <div className="px-4 py-2 text-gray-500">{emptyMessage}</div>
          ) : (
            options.map((option) => (
              <HCombobox.Option
                key={option.value}
                value={option.value}
                as={Fragment}
              >
                {({ active, selected }) => (
                  <li
                    className={`px-4 py-2 cursor-pointer ${
                      active ? "bg-blue-100" : ""
                    } ${selected ? "font-bold" : ""}`}
                  >
                    {option.label}
                  </li>
                )}
              </HCombobox.Option>
            ))
          )}
        </HCombobox.Options>
      </div>
    </HCombobox>
  );
}