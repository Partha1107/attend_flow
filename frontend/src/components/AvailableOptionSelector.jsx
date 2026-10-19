import { useEffect, useRef, useState } from "react";
import "./AvailableOptionSelector.css";

export function AvailableOptionSelector({
    label,
    options = [],
    value,
    onChange = () => { },
    placeholder = "No options available",
    getOptionValue = (option) => option?.value ?? option,
    getOptionLabel = (option) => option?.label ?? String(option ?? ""),
    disabled = false,
    emptyMessage,
}) {
    const hasOptions = Array.isArray(options) && options.length > 0;

    return (
        <div className="available-option-selector">
            {label && (
                <label className="available-option-selector__label">{label}</label>
            )}

            <div
                className="available-option-selector__list"
                role="listbox"
                aria-label={label || "Available options"}
            >
                {hasOptions ? (
                    options.map((option) => {
                        const optionValue = getOptionValue(option);
                        const selected = String(optionValue) === String(value ?? "");

                        return (
                            <button
                                key={String(optionValue)}
                                type="button"
                                className={`available-option-selector__item ${selected ? "is-selected" : ""}`}
                                onClick={() => onChange(optionValue)}
                                disabled={disabled}
                                aria-pressed={selected}
                            >
                                {getOptionLabel(option)}
                            </button>
                        );
                    })
                ) : (
                    <p className="available-option-selector__empty">
                        {emptyMessage || placeholder}
                    </p>
                )}
            </div>
        </div>
    );
}

export function AvailableDropdownSelector({
    label,
    options = [],
    value,
    onChange,
    disabled = false,
    placeholder = "Select an option",
    emptyMessage = "No options available",
    getOptionValue = (option) => option?.value ?? option,
    getOptionLabel = (option) => option?.label ?? String(option ?? ""),
}) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);
    const hasOptions = Array.isArray(options) && options.length > 0;
    const selectedOption = options.find((option) => {
        const optionValue = getOptionValue(option);
        return String(optionValue) === String(value ?? "");
    });
    const selectedLabel = selectedOption
        ? getOptionLabel(selectedOption)
        : placeholder;

    useEffect(() => {
        const handlePointerDown = (event) => {
            if (!dropdownRef.current?.contains(event.target)) setIsOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setIsOpen(false);
        };

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    return (
        <div className={`available-dropdown ${isOpen ? "is-open" : ""}`} ref={dropdownRef}>
            <span className="available-dropdown-label">{label}</span>
            <button
                type="button"
                className="available-dropdown-trigger"
                aria-label={`Select ${label.toLowerCase()}`}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((open) => !open)}
                disabled={disabled || !hasOptions}
            >
                <span>{selectedLabel}</span>
                <span className="available-dropdown-chevron" aria-hidden="true" />
            </button>
            {isOpen && (
                <div className="available-dropdown-menu" role="listbox" aria-label={label}>
                    {hasOptions ? options.map((option) => {
                        const optionValue = getOptionValue(option);
                        const optionLabel = getOptionLabel(option);
                        const selected = String(optionValue) === String(value ?? "");

                        return (
                            <button
                                type="button"
                                role="option"
                                aria-selected={selected}
                                className={`available-dropdown-option ${selected ? "is-selected" : ""}`}
                                key={String(optionValue)}
                                onClick={() => {
                                    onChange(optionValue);
                                    setIsOpen(false);
                                }}
                            >
                                {optionLabel}
                            </button>
                        );
                    }) : (
                        <p className="available-dropdown-empty">{emptyMessage}</p>
                    )}
                </div>
            )}
        </div>
    );
}

export function AvailableSquadSelector(props) {
    return (
        <AvailableDropdownSelector
            {...props}
            label="Squad"
            placeholder="Select squad"
            emptyMessage="No squads available"
            getOptionValue={(option) => option?.value ?? option}
            getOptionLabel={(option) => {
                const optionValue = option?.value ?? option;
                return option?.label ?? `Squad ${optionValue}`;
            }}
        />
    );
}

export function AvailableSubjectSelector({
    options = [],
    value,
    onChange,
    disabled = false,
}) {
    return (
        <AvailableOptionSelector
            label="Subject"
            options={options}
            value={value}
            onChange={onChange}
            disabled={disabled}
            emptyMessage="No subjects available"
            getOptionValue={(option) => option?.value ?? option}
            getOptionLabel={(option) => {
                const valueToUse = option?.value ?? option;
                return option?.label ?? `Subject ${valueToUse}`;
            }}
        />
    );
}
