import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import {
    getMentorProfile,
    saveMentorProfile,
} from "../../api/mentor";
import "./SettingsPage.css";

const API_URL =
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000";

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

    const [mentorProfile, setMentorProfile] =
        useState(null);

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
        const loadSettings = async () => {
            try {
                setIsLoading(true);
                setError("");

                const [squadsResponse, profileResult] =
                    await Promise.all([
                        fetch(
                            `${API_URL}/api/mentor/dashboard/squads`
                        ),
                        getMentorProfile(),
                    ]);

                const result =
                    await squadsResponse.json();

                if (squadsResponse.status === 404) {
                    throw new Error(
                        "Squad API endpoint not found. Check the backend route."
                    );
                }

                if (!squadsResponse.ok) {
                    throw new Error(
                        `Server error: ${squadsResponse.status}`
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

                setMentorProfile(
                    profileResult.profile || null
                );

                if (profileResult.profile?.squad) {
                    const profileSquad = String(
                        profileResult.profile.squad
                    );

                    setSelectedSquad(profileSquad);
                    localStorage.setItem(
                        "selectedSquad",
                        profileSquad
                    );
                }
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

        loadSettings();
    }, []);

    // ==========================================================
    // SAVE SQUAD
    // ==========================================================

    const handleSave = async () => {
        setError("");
        setMessage("");

        setIsSaving(true);

        try {
            if (!selectedSquad) {
                if (!mentorProfile) {
                    throw new Error(
                        "Mentor profile could not be loaded."
                    );
                }

                await saveMentorProfile({
                    collegeName:
                        mentorProfile.collegeName ||
                        mentorProfile.college_name ||
                        "",
                    squad: "",
                });

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

            if (!mentorProfile) {
                throw new Error(
                    "Mentor profile could not be loaded."
                );
            }

            await saveMentorProfile({
                collegeName:
                    mentorProfile.collegeName ||
                    mentorProfile.college_name ||
                    "",
                squad: selectedSquad,
            });

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