import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Download,
  Mail,
  MailWarning,
  Search,
  Send,
  Users,
} from "lucide-react";

import "./StudentToolbar.css";

/* =========================================================
   ATTENDANCE HELPERS
   ========================================================= */

const BELOW_75_MAX = 74.99;

const rangeBounds = (min, max) => ({
  lo: min === "" ? 0 : Number(min),
  hi: max === "" ? 100 : Number(max),
});

const rangeLabel = (min, max) => {
  const { lo, hi } = rangeBounds(min, max);

  if (lo === 0 && hi === BELOW_75_MAX) {
    return "Below 75%";
  }

  if (lo === 75 && hi === 100) {
    return "75% and above";
  }

  if (lo === 0 && hi === 100) {
    return "All attendance";
  }

  return `${lo}%–${hi}%`;
};

/* =========================================================
   STUDENT TOOLBAR
   ========================================================= */

function StudentToolbar({
  searchValue = "",
  onSearchChange = () => {},

  squadValue = "",
  squadOptions = [],
  onSquadChange = () => {},
  squadDisabled = false,

  attendanceMin = "",
  attendanceMax = "",
  onAttendanceChange = () => {},

  sendToValue = "both",
  sendToOptions = [],
  onSendToChange = () => {},

  selectedCount = 0,
  below75Count = 0,
  totalCount = 0,
  loading = false,

  onSendSelected = () => {},
  onSendBelow75 = () => {},
  onOpenTemplate = () => {},
  onDownload = () => {},
  onClearFilters = () => {},

  downloadLabel = "Download students",
}) {
  /* =========================================================
     DROPDOWN STATE
     ========================================================= */

  const [openDropdown, setOpenDropdown] = useState(null);

  const toolbarRef = useRef(null);

  const rangeMenuOpen = openDropdown === "attendance";
  const squadMenuOpen = openDropdown === "squad";
  const sendToMenuOpen = openDropdown === "sendTo";

  /* =========================================================
     CLOSE DROPDOWNS WHEN CLICKING OUTSIDE
     ========================================================= */

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (
        toolbarRef.current &&
        !toolbarRef.current.contains(event.target)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  /* =========================================================
     ATTENDANCE
     ========================================================= */

  const { lo: rangeLo, hi: rangeHi } = rangeBounds(
    attendanceMin,
    attendanceMax
  );

  const rangeInvalid = rangeLo > rangeHi;

  const applyRangePreset = (min, max) => {
    onAttendanceChange(min, max);
    setOpenDropdown(null);
  };

  const handleRangeInput = (setter) => (event) => {
    const value = event.target.value;

    if (value === "") {
      setter("");
      return;
    }

    const number = Number(value);

    if (
      Number.isFinite(number) &&
      number >= 0 &&
      number <= 100
    ) {
      setter(value);
    }
  };

  /* =========================================================
     GENERIC DROPDOWN TOGGLE
     ========================================================= */

  const toggleDropdown = (name) => {
    setOpenDropdown((current) =>
      current === name ? null : name
    );
  };

  /* =========================================================
     FIND SELECTED SQUAD LABEL
     ========================================================= */

  const selectedSquad = squadOptions.find(
    (option) =>
      String(option.value) === String(squadValue)
  );

  const squadLabel = selectedSquad?.label || "All squads";

  /* =========================================================
     FIND SELECTED SEND-TO LABEL
     ========================================================= */

  const selectedSendTo = sendToOptions.find(
    (option) =>
      String(option.value) === String(sendToValue)
  );

  const sendToLabel = selectedSendTo?.label || "Both";

  /* =========================================================
     RENDER
     ========================================================= */

  return (
    <section
      ref={toolbarRef}
      className="student-toolbar"
      aria-label="Student filters"
    >
      {/* =====================================================
          SEARCH
          ===================================================== */}

      <label className="search-box">
        <Search
          className="search-icon"
          size={17}
          aria-hidden="true"
        />

        <input
          type="search"
          value={searchValue}
          placeholder="Search students by name, email or ID..."
          onChange={(event) =>
            onSearchChange(event.target.value)
          }
          aria-label="Search students"
        />
      </label>

      {/* =====================================================
          FILTER ROW
          ===================================================== */}

      <div className="filter-row">
        {/* ===================================================
            SQUAD
            =================================================== */}

        <div
          className={`filter-field ${
            squadMenuOpen ? "dropdown-open" : ""
          }`}
        >
          <span className="filter-label">SQUAD</span>

          <div className="custom-select-wrapper">
            <button
              type="button"
              className={`custom-select-trigger ${
                squadMenuOpen ? "is-open" : ""
              }`}
              disabled={squadDisabled}
              onClick={() => toggleDropdown("squad")}
              aria-expanded={squadMenuOpen}
              aria-haspopup="listbox"
            >
              <span>{squadLabel}</span>

              <ChevronDown
                size={16}
                aria-hidden="true"
                className={
                  squadMenuOpen ? "chevron-rotated" : ""
                }
              />
            </button>

            {squadMenuOpen && (
              <div
                className="custom-select-menu"
                role="listbox"
                aria-label="Squad options"
              >
                <button
                  type="button"
                  role="option"
                  aria-selected={squadValue === ""}
                  className={
                    squadValue === "" ? "is-selected" : ""
                  }
                  onClick={() => {
                    onSquadChange("");
                    setOpenDropdown(null);
                  }}
                >
                  All squads
                </button>

                {squadOptions.map((option) => {
                  const isSelected =
                    String(option.value) ===
                    String(squadValue);

                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={
                        isSelected ? "is-selected" : ""
                      }
                      onClick={() => {
                        onSquadChange(
                          String(option.value)
                        );
                        setOpenDropdown(null);
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ===================================================
            ATTENDANCE
            =================================================== */}

        <div
          className={`filter-field ${
            rangeMenuOpen ? "dropdown-open" : ""
          }`}
        >
          <span className="filter-label">ATTENDANCE</span>

          <button
            type="button"
            className={`attendance-trigger ${
              rangeInvalid ? "is-invalid" : ""
            } ${rangeMenuOpen ? "is-open" : ""}`}
            onClick={() => toggleDropdown("attendance")}
            aria-expanded={rangeMenuOpen}
            aria-haspopup="menu"
          >
            <span>
              {rangeLabel(
                attendanceMin,
                attendanceMax
              )}
            </span>

            <ChevronDown
              size={16}
              aria-hidden="true"
              className={
                rangeMenuOpen
                  ? "chevron-rotated"
                  : ""
              }
            />
          </button>

          {rangeMenuOpen && (
            <div
              className="attendance-menu"
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className={
                  attendanceMin === "" &&
                  attendanceMax === ""
                    ? "is-selected"
                    : ""
                }
                onClick={() =>
                  applyRangePreset("", "")
                }
              >
                All attendance
              </button>

              <button
                type="button"
                role="menuitem"
                className={
                  attendanceMin === "0" &&
                  attendanceMax ===
                    String(BELOW_75_MAX)
                    ? "is-selected"
                    : ""
                }
                onClick={() =>
                  applyRangePreset(
                    "0",
                    String(BELOW_75_MAX)
                  )
                }
              >
                Below 75%
              </button>

              <button
                type="button"
                role="menuitem"
                className={
                  attendanceMin === "75" &&
                  attendanceMax === "100"
                    ? "is-selected"
                    : ""
                }
                onClick={() =>
                  applyRangePreset("75", "100")
                }
              >
                75% and above
              </button>

              {/* Custom Range */}
              <div className="custom-range">
                <span>Custom</span>

                <div className="custom-range-inputs">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="0"
                    aria-label="Minimum attendance"
                    value={attendanceMin}
                    onChange={handleRangeInput(
                      (value) =>
                        onAttendanceChange(
                          value,
                          attendanceMax
                        )
                    )}
                  />

                  <em>to</em>

                  <input
                    type="number"
                    min="0"
                    max="100"
                    placeholder="100"
                    aria-label="Maximum attendance"
                    value={attendanceMax}
                    onChange={handleRangeInput(
                      (value) =>
                        onAttendanceChange(
                          attendanceMin,
                          value
                        )
                    )}
                  />

                  <em>%</em>
                </div>

                {rangeInvalid && (
                  <p className="custom-range-error">
                    Minimum is higher than maximum.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* ===================================================
            SEND TO
            =================================================== */}

        <div
          className={`filter-field ${
            sendToMenuOpen ? "dropdown-open" : ""
          }`}
        >
          <span className="filter-label">SEND TO</span>

          <div className="custom-select-wrapper">
            <button
              type="button"
              className={`custom-select-trigger ${
                sendToMenuOpen ? "is-open" : ""
              }`}
              onClick={() =>
                toggleDropdown("sendTo")
              }
              aria-expanded={sendToMenuOpen}
              aria-haspopup="listbox"
            >
              <span>{sendToLabel}</span>

              <ChevronDown
                size={16}
                aria-hidden="true"
                className={
                  sendToMenuOpen
                    ? "chevron-rotated"
                    : ""
                }
              />
            </button>

            {sendToMenuOpen && (
              <div
                className="custom-select-menu"
                role="listbox"
                aria-label="Send to options"
              >
                {sendToOptions.map((option) => {
                  const isSelected =
                    String(option.value) ===
                    String(sendToValue);

                  return (
                    <button
                      key={String(option.value)}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      className={
                        isSelected
                          ? "is-selected"
                          : ""
                      }
                      onClick={() => {
                        onSendToChange(
                          option.value
                        );
                        setOpenDropdown(null);
                      }}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =====================================================
          ACTION BUTTONS
          ===================================================== */}

      <div className="action-row">
        <button
          type="button"
          className="toolbar-btn btn-send-selected"
          onClick={onSendSelected}
          disabled={
            loading || selectedCount === 0
          }
        >
          <Send size={15} aria-hidden="true" />
          <span>Send selected</span>
        </button>

        <button
          type="button"
          className="toolbar-btn btn-send-below"
          onClick={onSendBelow75}
          disabled={
            loading || below75Count === 0
          }
        >
          <MailWarning
            size={15}
            aria-hidden="true"
          />
          <span>Send all below 75%</span>
        </button>

        <button
          type="button"
          className="toolbar-btn btn-outline"
          onClick={onOpenTemplate}
        >
          <Mail size={15} aria-hidden="true" />
          <span>Email template</span>
        </button>

        <button
          type="button"
          className="toolbar-btn btn-outline"
          onClick={onDownload}
          disabled={loading}
        >
          <Download
            size={15}
            aria-hidden="true"
          />
          <span>{downloadLabel}</span>
        </button>
      </div>

      {/* =====================================================
          FOOTER
          ===================================================== */}

      <div className="toolbar-footer">
        <span className="students-count">
          <Users size={15} aria-hidden="true" />

          {loading
            ? "Loading students..."
            : `${totalCount} student${
                totalCount === 1 ? "" : "s"
              } found`}
        </span>

        <button
          type="button"
          className="clear-filters-btn"
          onClick={onClearFilters}
        >
          Clear filters
        </button>
      </div>
    </section>
  );
}

export default StudentToolbar;