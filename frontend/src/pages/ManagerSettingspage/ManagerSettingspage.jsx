import { useEffect, useState } from "react";
import "./ManagerSettingspage.css";

import { supabase } from "../../lib/supabase";

const API_URL = "http://localhost:5000";

function ManagerSettingspage() {
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Temporary squad options
  const squadOptions = ["138", "139", "140", "141", "142"];

  const roleOptions = [
    {
      value: "mentor",
      label: "Mentor",
    },
    {
      value: "campus_manager",
      label: "Campus Manager",
    },
  ];

  // ============================================================
  // GET MENTORS
  // ============================================================

  const fetchMentors = async () => {
    try {
      setLoading(true);
      setError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw sessionError;
      }

      if (!session?.access_token) {
        throw new Error("Authentication session not found.");
      }

      const response = await fetch(
        `${API_URL}/api/manager/mentors`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const result = await response.json();

      console.log("🔥 MANAGER API STATUS:", response.status);
      console.log("🔥 MANAGER API RESPONSE:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message ||
          result.error ||
          `Manager API failed with status ${response.status}`
        );
      }

      setMentors(result.mentors || []);
    } catch (error) {
      console.error("Failed to fetch mentors:", error);

      setError(
        error.message || "Failed to load mentors."
      );
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // LOAD ON PAGE OPEN
  // ============================================================

  useEffect(() => {
    fetchMentors();
  }, []);

  // ============================================================
  // UPDATE MENTOR
  // ============================================================

  const updateMentor = async (mentor, changes) => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error("Authentication session not found.");
      }

      const response = await fetch(
        `${API_URL}/api/manager/mentors/${mentor.id}`,
        {
          method: "PATCH",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify(changes),
        }
      );

      const result = await response.json();

      console.log("Update mentor status:", response.status);
      console.log("Update mentor response:", result);

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to update mentor."
        );
      }

      // Update only the changed mentor in the UI
      setMentors((currentMentors) =>
        currentMentors.map((item) =>
          item.id === mentor.id
            ? {
              ...item,
              ...result.mentor,
            }
            : item
        )
      );
    } catch (error) {
      console.error("Failed to update mentor:", error);

      alert(
        error.message || "Failed to update mentor."
      );

      // Reload original data if update fails
      fetchMentors();
    }
  };

  // ============================================================
  // SQUAD CHANGE
  // ============================================================

  const handleSquadChange = (mentor, newSquad) => {
    updateMentor(mentor, {
      squad: newSquad,
    });
  };

  // ============================================================
  // ROLE CHANGE
  // ============================================================

  const handleRoleChange = (mentor, newRole) => {
    updateMentor(mentor, {
      job_role: newRole,
    });
  };

  // ============================================================
  // ACCESS TOGGLE
  // ============================================================

  const handleAccessToggle = (mentor) => {
    updateMentor(mentor, {
      is_blocked: !mentor.is_blocked,
    });
  };

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <div className="manager-settings-page">
        <div className="manager-settings-header">
          <div>
            <h1>Manager Settings</h1>
            <p>
              Manage mentor squads, roles and access permissions.
            </p>
          </div>
        </div>

        <section className="mentor-management-card">
          <div className="manager-settings-loading">
            Loading mentors...
          </div>
        </section>
      </div>
    );
  }

  // ============================================================
  // ERROR
  // ============================================================

  if (error) {
    return (
      <div className="manager-settings-page">
        <div className="manager-settings-header">
          <div>
            <h1>Manager Settings</h1>
            <p>
              Manage mentor squads, roles and access permissions.
            </p>
          </div>
        </div>

        <section className="mentor-management-card">
          <div className="manager-settings-error">
            <p>{error}</p>

            <button
              type="button"
              onClick={fetchMentors}
            >
              Try Again
            </button>
          </div>
        </section>
      </div>
    );
  }

  // ============================================================
  // PAGE
  // ============================================================

  return (
    <div className="manager-settings-page">

      {/* Header */}
      <div className="manager-settings-header">
        <div>
          <h1>Manager Settings</h1>

          <p>
            Manage mentor squads, roles and access permissions.
          </p>
        </div>
      </div>

      {/* Mentor Management */}
      <section className="mentor-management-card">

        <div className="mentor-management-header">

          <div>
            <h2>Mentor Management</h2>

            <p>
              View and manage mentors assigned to your organization.
            </p>
          </div>

          <div className="mentor-count">
            {mentors.length}{" "}
            {mentors.length === 1
              ? "Mentor"
              : "Mentors"}
          </div>

        </div>

        {/* Empty State */}
        {mentors.length === 0 ? (
          <div className="manager-settings-empty">
            <h3>No mentors found</h3>

            <p>
              There are currently no mentors available to manage.
            </p>
          </div>
        ) : (

          /* Table */
          <div className="mentor-table-wrapper">

            <table className="mentor-table">

              <thead>
                <tr>
                  <th>NAME</th>
                  <th>EMAIL</th>
                  <th>SQUAD</th>
                  <th>ROLE</th>
                  <th>ACCESS</th>
                </tr>
              </thead>

              <tbody>

                {mentors.map((mentor) => {

                  /*
                   * Your mentor_profiles table currently
                   * does not contain a name column.
                   *
                   * Therefore we temporarily use the email
                   * as the displayed name.
                   */
                  const displayName =
                    mentor.name ||
                    mentor.email ||
                    "Unknown";

                  const firstLetter =
                    displayName
                      .charAt(0)
                      .toUpperCase();

                  return (
                    <tr key={mentor.id}>

                      {/* NAME */}
                      <td>

                        <div className="mentor-name">

                          <div className="mentor-avatar">
                            {firstLetter}
                          </div>

                          <span>
                            {displayName}
                          </span>

                        </div>

                      </td>

                      {/* EMAIL */}
                      <td>

                        <span className="mentor-email">
                          {mentor.email}
                        </span>

                      </td>

                      {/* SQUAD */}
                      <td>

                        <select
                          className="settings-select"
                          value={mentor.squad || ""}
                          onChange={(event) =>
                            handleSquadChange(
                              mentor,
                              event.target.value
                            )
                          }
                        >

                          {squadOptions.map((squad) => (
                            <option
                              key={squad}
                              value={squad}
                            >
                              {squad}
                            </option>
                          ))}

                        </select>

                      </td>

                      {/* ROLE */}
                      <td>

                        <select
                          className="settings-select"
                          value={
                            mentor.job_role ||
                            "mentor"
                          }
                          onChange={(event) =>
                            handleRoleChange(
                              mentor,
                              event.target.value
                            )
                          }
                        >

                          {roleOptions.map((role) => (
                            <option
                              key={role.value}
                              value={role.value}
                            >
                              {role.label}
                            </option>
                          ))}

                        </select>

                      </td>

                      {/* ACCESS */}
                      <td>

                        <button
                          type="button"
                          className={`access-toggle ${mentor.is_blocked
                            ? "blocked"
                            : "active"
                            }`}
                          onClick={() =>
                            handleAccessToggle(mentor)
                          }
                        >

                          <span className="toggle-circle"></span>

                          <span className="toggle-text">
                            {mentor.is_blocked
                              ? "Blocked"
                              : "Active"}
                          </span>

                        </button>

                      </td>

                    </tr>
                  );
                })}

              </tbody>

            </table>

          </div>
        )}

      </section>

    </div>
  );
}

export default ManagerSettingspage;