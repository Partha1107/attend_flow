import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import { supabase } from "../../lib/supabase";
import {
  saveMentorProfile,
  getMentorProfile,
  getAvailableSquads,
} from "../../api/mentor";

import "./MentorProfileSetup.css";

const MentorProfileSetup = () => {
  const navigate = useNavigate();

  // ============================================================
  // USER DETAILS
  // ============================================================

  const [mentorName, setMentorName] = useState("");
  const [mentorEmail, setMentorEmail] = useState("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [hasProfile, setHasProfile] = useState(false);

  // ============================================================
  // PROFILE DETAILS
  // ============================================================

  const [collegeName, setCollegeName] = useState("");

  // Empty initially because the user must choose the job role first
  const [jobRole, setJobRole] = useState("");

  const [squad, setSquad] = useState("");

  // Available squads from database
  const [availableSquads, setAvailableSquads] = useState([]);

  // ============================================================
  // UI STATES
  // ============================================================

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ============================================================
  // LOAD USER + AVAILABLE SQUADS + EXISTING PROFILE
  // ============================================================

  useEffect(() => {
    let mounted = true;

    const loadUserAndProfile = async () => {
      if (!supabase) {
        if (mounted) {
          setError("Supabase is not configured.");
          setLoading(false);
        }

        return;
      }

      try {
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

        setIsLoggedIn(true);

        // Get mentor name
        setMentorName(
          user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "Mentor"
        );

        // Get mentor email
        setMentorEmail(user.email || "");

        // Load existing profile if it exists
        try {
          const profileResult = await getMentorProfile();
          if (profileResult?.profile && mounted) {
            const profile = profileResult.profile;
            setHasProfile(true);
            if (profile.college_name) setCollegeName(profile.college_name);
            if (profile.job_role) setJobRole(profile.job_role);
            if (profile.squad) setSquad(profile.squad);
          }
        } catch {
          // Profile may not exist yet on initial setup, which is expected
        }

        setLoading(false);
      } catch (userError) {
        console.error("User loading error:", userError);

        if (mounted) {
          setError("Failed to load your profile.");
          setLoading(false);
        }
      }
    };

    const loadSquads = async () => {
      try {
        const result = await getAvailableSquads();

        if (!mounted) {
          return;
        }

        setAvailableSquads(result?.squads || []);
      } catch (squadError) {
        console.error("Squad loading error:", squadError);

        if (mounted) {
          setError("Failed to load available squads.");
        }
      }
    };

    void loadUserAndProfile();
    void loadSquads();

    return () => {
      mounted = false;
    };
  }, [navigate]);

  // ============================================================
  // JOB ROLE CHANGE
  // ============================================================

  const handleJobRoleChange = (event) => {
    const selectedRole = event.target.value;

    setJobRole(selectedRole);
    setError("");

    // Campus Manager does not belong to one squad
    if (selectedRole === "campus_manager") {
      setSquad("all");
      return;
    }

    // Mentor needs an actual squad
    setSquad("");
  };

  // ============================================================
  // SUBMIT
  // ============================================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError("");

    // ----------------------------------------------------------
    // COLLEGE VALIDATION
    // ----------------------------------------------------------

    if (!collegeName.trim()) {
      setError("Please enter your college name.");
      return;
    }

    // ----------------------------------------------------------
    // JOB ROLE VALIDATION
    // ----------------------------------------------------------

    if (!jobRole) {
      setError("Please select your job role.");
      return;
    }

    // ----------------------------------------------------------
    // SQUAD VALIDATION
    // Only Mentor requires a squad
    // ----------------------------------------------------------

    if (jobRole === "mentor" && !squad.trim()) {
      setError("Please select your squad.");
      return;
    }

    try {
      setSaving(true);

      // Campus Manager always gets squad = "all"
      const profileSquad =
        jobRole === "campus_manager"
          ? "all"
          : squad.trim();

      await saveMentorProfile({
        collegeName: collegeName.trim(),
        squad: profileSquad,
        jobRole,
      });

      // Profile saved successfully
      navigate("/dashboard", {
        replace: true,
      });
    } catch (saveError) {
      console.error("Profile save error:", saveError);

      setError(
        saveError.message ||
          "Failed to save your profile."
      );
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // LOADING SCREEN
  // ============================================================

  if (loading) {
    return (
      <div className="mentor-setup-page">
        <div className="mentor-setup-card">
          <p>Loading your profile...</p>
        </div>
      </div>
    );
  }

  // ============================================================
  // MAIN UI
  // ============================================================

  return (
    <div className="mentor-setup-page">
      <div className="mentor-setup-card">

        {/* ======================================================
            TOP NAVIGATION (WHEN LOGGED IN)
        ====================================================== */}

        {isLoggedIn && (
          <div className="mentor-setup-top-nav">
            <button
              type="button"
              className="mentor-setup-back-link"
              onClick={() => navigate("/dashboard")}
            >
              <ArrowLeft size={16} />
              Go to Dashboard
            </button>
          </div>
        )}

        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mentor-setup-header">
          <div className="mentor-avatar">
            {mentorName.charAt(0).toUpperCase()}
          </div>

          <div>
            <h1>{hasProfile ? "Mentor Profile" : "Complete your profile"}</h1>

            <p>
              Welcome, {mentorName}
            </p>
          </div>
        </div>

        {/* ======================================================
            EMAIL
        ====================================================== */}

        <div className="mentor-email">
          {mentorEmail}
        </div>

        {/* ======================================================
            FORM
        ====================================================== */}

        <form onSubmit={handleSubmit}>

          {/* ====================================================
              COLLEGE NAME
          ==================================================== */}

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

          {/* ====================================================
              JOB ROLE
          ==================================================== */}

          <div className="form-group">
            <label htmlFor="jobRole">
              Job Role
            </label>

            <select
              id="jobRole"
              value={jobRole}
              onChange={handleJobRoleChange}
              disabled={saving}
            >
              <option value="">
                Select your job role
              </option>

              <option value="mentor">
                Mentor
              </option>

              <option value="campus_manager">
                Campus Manager
              </option>
            </select>
          </div>

          {/* ====================================================
              SQUAD

              Only visible when Job Role = Mentor
          ==================================================== */}

          {jobRole === "mentor" && (
            <div className="form-group">
              <label htmlFor="squad">
                Squad
              </label>

              <select
                id="squad"
                value={squad}
                onChange={(event) => {
                  setSquad(event.target.value);
                  setError("");
                }}
                disabled={saving}
              >
                <option value="">
                  Select your squad
                </option>

                {availableSquads.map((value) => (
                  <option
                    key={value}
                    value={value}
                  >
                    Squad {value}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* ====================================================
              ERROR
          ==================================================== */}

          {error && (
            <div
              className="mentor-setup-error"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* ====================================================
              ACTIONS
          ==================================================== */}

          <div className="mentor-setup-actions">
            <button
              type="submit"
              className="mentor-setup-submit-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : hasProfile
                  ? "Save Changes"
                  : "Continue"}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default MentorProfileSetup;