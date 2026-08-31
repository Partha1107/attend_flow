import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import "./SettingsPage.css";

const API_URL = import.meta.env.VITE_API_URL;

export default function SquadSettings({
    onSquadChange,
}) {
    const [squads, setSquads] = useState([]);

    const [selectedSquad, setSelectedSquad] =
        useState(
            localStorage.getItem(
                "selectedSquad"
            ) || ""
        );

    const [isLoading, setIsLoading] =
        useState(true);

    const [isSaving, setIsSaving] =
        useState(false);

    const [message, setMessage] =
        useState("");

    const [error, setError] =
        useState("");

    // ==========================================================
    // LOAD SQUADS
    // ==========================================================

    useEffect(() => {
        const loadSquads = async () => {
            try {
                setIsLoading(true);
                setError("");

                const response =
                    await fetch(
                        `${API_URL}/api/mentor/dashboard/squads`
                    );

                const result =
                    await response.json();

                if (response.status === 404) {
                    throw new Error(
                        "Squad API endpoint not found. Check the backend route."
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        `Server error: ${response.status}`
                    );
                }

                if (!result.success) {
                    throw new Error(
                        result.message ||
                        "Failed to load squads"
                    );
                }

                setSquads(
                    result.squads || []
                );
            } catch (err) {
                console.error(
                    "Load squads error:",
                    err
                );

                setError(
                    err.message ||
                    "Failed to load squads"
                );
            } finally {
                setIsLoading(false);
            }
        };

        loadSquads();
    }, []);

    // ==========================================================
    // SAVE SQUAD
    // ==========================================================

    const handleSave = () => {
        setError("");
        setMessage("");

        setIsSaving(true);

        try {
            if (!selectedSquad) {
                localStorage.removeItem(
                    "selectedSquad"
                );

                window.dispatchEvent(
                    new CustomEvent("selectedSquadChange", {
                        detail: "",
                    })
                );

                if (onSquadChange) {
                    onSquadChange("");
                }

                setMessage(
                    "Showing all squads."
                );

                return;
            }

            localStorage.setItem(
                "selectedSquad",
                selectedSquad
            );

            window.dispatchEvent(
                new CustomEvent("selectedSquadChange", {
                    detail: selectedSquad,
                })
            );

            if (onSquadChange) {
                onSquadChange(
                    selectedSquad
                );
            }

            setMessage(
                `Squad ${selectedSquad} selected successfully.`
            );
        } catch (err) {
            console.error(
                "Save squad error:",
                err
            );

            setError(
                "Failed to save squad setting."
            );
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="settings-card">

            <div className="settings-card-header">
                <div>
                    <h2>
                        Squad
                    </h2>

                    <p>
                        Select a squad to display
                        only that squad's
                        students and attendance
                        details.
                    </p>
                </div>
            </div>

            {/* ERROR */}

            {error && (
                <div className="settings-error">
                    {error}
                </div>
            )}

            {/* SELECT */}

            <div className="settings-field">

                <label htmlFor="squad">
                    Select Squad
                </label>

                <select
                    id="squad"
                    value={selectedSquad}
                    onChange={(event) => {
                        setSelectedSquad(
                            event.target.value
                        );

                        setMessage("");
                    }}
                    disabled={isLoading}
                >
                    <option value="">
                        All Squads
                    </option>

                    {squads.map(
                        (squad) => (
                            <option
                                key={squad}
                                value={squad}
                            >
                                Squad {squad}
                            </option>
                        )
                    )}
                </select>

            </div>

            {/* SAVE */}

            <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="settings-save-button"
            >
                <Save size={17} />

                {isSaving
                    ? "Saving..."
                    : "Save Settings"}
            </button>

            {/* SUCCESS */}

            {message && (
                <div className="settings-success">
                    {message}
                </div>
            )}

        </div>
    );
}