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

export function AvailableSquadSelector({
    options = [],
    value,
    onChange,
    disabled = false,
}) {
    return (
        <AvailableOptionSelector
            label="Squad"
            options={options}
            value={value}
            onChange={onChange}
            disabled={disabled}
            emptyMessage="No squads available"
            getOptionValue={(option) =>
                option?.value ?? option
            }
            getOptionLabel={(option) => {
                const valueToUse = option?.value ?? option;
                return option?.label ?? `Squad ${valueToUse}`;
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
