import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { supabase } from "../../lib/supabase";
import { saveMentorProfile } from "../../api/mentor";
import "./MentorProfileSetup.css";

const MentorProfileSetup = () => {
  const navigate = useNavigate();

  const [mentorName, setMentorName] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [squad, setSquad] = useState("");
  const [jobRole, setJobRole] = useState("mentor");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    const loadUser = async () => {
      if (!supabase) {
        setError("Supabase is not configured.");
        setLoading(false);
        return;
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      if (userError || !user) {
        navigate("/login", { replace: true });
        return;
      }

      setMentorName(
        user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          "Mentor"
      );

      setMentorEmail(user.email || "");
      setLoading(false);
    };

    void loadUser();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!collegeName.trim()) {
      setError("Please enter your college name.");
      return;
    }

    if (!squad.trim()) {
      setError("Please select your squad.");
      return;
    }

    if (!jobRole) {
      setError("Please select your job role.");
      return;
    }

    try {
      setSaving(true);

      await saveMentorProfile({
        collegeName: collegeName.trim(),
        squad: squad.trim(),
        jobRole,
      });

      navigate("/dashboard", { replace: true });
    } catch (saveError) {
      console.error("Profile save error:", saveError);
      setError(
        saveError.message || "Failed to save your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="mentor-setup-page">
        <div className="mentor-setup-card">
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mentor-setup-page">
      <div className="mentor-setup-card">
        <div className="mentor-setup-header">
          <div className="mentor-avatar">
            {mentorName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1>Complete your profile</h1>
            <p>Welcome, {mentorName}</p>
          </div>
        </div>

        <div className="mentor-email">
          {mentorEmail}
        </div>

        <form onSubmit={handleSubmit}>
          {/* COLLEGE NAME */}
          <div className="form-group">
            <label htmlFor="collegeName">
              College Name
            </label>

            <input
              id="collegeName"
              type="text"
              value={collegeName}
              onChange={(event) =>
                setCollegeName(event.target.value)
              }
              placeholder="Enter your college name"
              autoComplete="organization"
              disabled={saving}
            />
          </div>

          {/* SQUAD */}
          <div className="form-group">
            <label htmlFor="squad">
              Squad
            </label>

            <select
              id="squad"
              value={squad}
              onChange={(event) =>
                setSquad(event.target.value)
              }
              disabled={saving}
            >
              <option value="">
                Select your squad
              </option>

              {Array.from(
                { length: 5 },
                (_, index) => String(138 + index)
              ).map((value) => (
                <option key={value} value={value}>
                  Squad {value}
                </option>
              ))}
            </select>
          </div>

          {/* JOB ROLE */}
          <div className="form-group">
            <label htmlFor="jobRole">
              Job Role
            </label>

            <select
              id="jobRole"
              value={jobRole}
              onChange={(event) =>
                setJobRole(event.target.value)
              }
              disabled={saving}
            >
              <option value="mentor">
                Mentor
              </option>

              <option value="campus_manager">
                Campus Manager
              </option>
            </select>
          </div>

          {/* ERROR */}
          {error && (
            <div className="mentor-setup-error">
              {error}
            </div>
          )}

          {/* SUBMIT */}
          <button
            type="submit"
            disabled={saving}
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default MentorProfileSetup;