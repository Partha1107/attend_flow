import { useEffect, useState } from "react";
import "./StudentPage.css";



function StudentPage() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [squad, setSquad] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [detailsStudent, setDetailsStudent] = useState(null);

  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");

  const openDetailsModal = (student) => {
    setDetailsStudent(student);

    setParentName(student.parent_name || "");
    setParentEmail(student.parent_email || "");
    setParentPhone(student.parent_phone || "");

    setShowDetailsModal(true);
  };

  const saveStudentDetails = async (e) => {
    e.preventDefault();

    if (!detailsStudent) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/attendance/students/${detailsStudent.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            parent_name: parentName,
            parent_email: parentEmail,
            parent_phone: parentPhone,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || "Failed to save details"
        );
      }

      setStudents((currentStudents) =>
        currentStudents.map((student) =>
          student.id === detailsStudent.id
            ? result.student
            : student
        )
      );

      setShowDetailsModal(false);
      setDetailsStudent(null);

      alert("Student details saved successfully.");
    } catch (error) {
      console.error("Save student details error:", error);
      alert(error.message || "Failed to save student details.");
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/attendance/students`
      );

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.message || "Failed to fetch students");
      }

      setStudents(result.students || []);
    } catch (error) {
      console.error("Failed to fetch students:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const filteredStudents = students.filter((student) => {
    const matchesSearch =
      student.name.toLowerCase().includes(search.toLowerCase()) ||
      student.id.toLowerCase().includes(search.toLowerCase());

    const matchesSquad =
      !squad || student.squad === squad;

    const matchesStatus =
      !attendanceStatus ||
      student.status === attendanceStatus;

    return (
      matchesSearch &&
      matchesSquad &&
      matchesStatus
    );
  });

  const clearFilters = () => {
    setSearch("");
    setSquad("");
    setAttendanceStatus("");
  };

  return (
    <div className="student-page">
      {/* Page Header */}
      <div className="student-page-header">
        <div>
          <h1>Students</h1>
          <p>Manage student profiles and view attendance information.</p>
        </div>

        <button
          className="add-student-btn"
          onClick={fetchStudents}
        >
          <span>↻</span>
          Refresh Students
        </button>
      </div>

      {showDetailsModal && detailsStudent && (
        <div
          className="modal-overlay"
          onClick={() => setShowDetailsModal(false)}
        >
          <div
            className="add-student-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowDetailsModal(false)}
            >
              ×
            </button>

            <h2>
              {detailsStudent.parent_email
                ? "Edit Student Details"
                : "Add Student Details"}
            </h2>

            <p>
              {detailsStudent.name} · {detailsStudent.email}
            </p>

            <form onSubmit={saveStudentDetails}>
              <div className="form-grid">

                <input
                  type="text"
                  value={detailsStudent.name || ""}
                  readOnly
                  placeholder="Student Name"
                />

                <input
                  type="email"
                  value={detailsStudent.email || ""}
                  readOnly
                  placeholder="Student Email"
                />

                <input
                  type="text"
                  value={parentName}
                  onChange={(e) => setParentName(e.target.value)}
                  placeholder="Parent Name"
                />

                <input
                  type="email"
                  value={parentEmail}
                  onChange={(e) => setParentEmail(e.target.value)}
                  placeholder="Parent Email"
                  required
                />

                <input
                  type="tel"
                  value={parentPhone}
                  onChange={(e) => setParentPhone(e.target.value)}
                  placeholder="Parent Phone"
                />

              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="close-profile-btn"
                  onClick={() => setShowDetailsModal(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="edit-profile-btn"
                >
                  Save Details
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="filter-container">
        <div className="search-box">
          <svg
            viewBox="0 0 24 24"
            className="search-icon"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-4-4" />
          </svg>

          <input
            type="text"
            placeholder="Search students by name or student ID"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={squad}
          onChange={(e) => setSquad(e.target.value)}
        >
          <option value="">Squad</option>
          <option value="138">138</option>
          <option value="139">139</option>
        </select>

        <select
          value={attendanceStatus}
          onChange={(e) => setAttendanceStatus(e.target.value)}
        >
          <option value="">Attendance Status</option>
          <option value="Present">Present</option>
          <option value="Absent">Absent</option>
        </select>

        <button className="clear-filter-btn" onClick={clearFilters}>
          Clear Filters
        </button>
      </div>

      {/* Statistics */}
      <div className="statistics-grid">
        <div className="stat-card">
          <div className="stat-icon">♙</div>
          <div>
            <p>Total Students</p>
            <h2>150</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">✓</div>
          <div>
            <p>Present Today</p>
            <h2>132</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">⌁</div>
          <div>
            <p>Absent Today</p>
            <h2>18</h2>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">◔</div>
          <div>
            <p>Average Attendance</p>
            <h2>87%</h2>
          </div>
        </div>
      </div>

      {/* Student Table */}
      <div className="student-table-container">
        <div className="student-table-header">
          <span>Student</span>
          <span>Squad</span>
          <span>Attendance %</span>
          <span>Status</span>
          <span>Action</span>
        </div>

        {loading ? (
          <div className="empty-state">
            <h3>Loading students...</h3>
          </div>
        ) : filteredStudents.length > 0 ? (
          filteredStudents.map((student) => (
            <div className="student-row" key={student.id}>
              <div className="student-name">
                <strong>{student.name}</strong>
                <small>{student.id}</small>
              </div>

              <div>{student.squad}</div>

              <div>
                <span className="attendance-badge">
                  {student.attendance}%
                </span>
              </div>

              <div>
                <span
                  className={`status-badge ${student.status === "Present"
                    ? "status-present"
                    : "status-absent"
                    }`}
                >
                  <span className="status-dot"></span>
                  {student.status}
                </span>
              </div>

              <div className="student-actions">
                <button
                  className="view-profile-btn"
                  onClick={() => setSelectedStudent(student)}
                >
                  View Profile
                </button>

                <button
                  className="add-details-btn"
                  onClick={() => openDetailsModal(student)}
                >
                  {student.parent_email ? "Edit Details" : "Add Details"}
                </button>
              </div>

            </div>
          ))
        ) : (
          <div className="empty-state">
            <h3>No students found</h3>
            <p>Try changing your search or filter criteria.</p>

            <button onClick={clearFilters}>
              Clear Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        <div className="pagination">
          <strong>
            Showing 1–{filteredStudents.length} of 150 students
          </strong>

          <div className="pagination-buttons">
            <button disabled>Previous</button>
            <button className="active-page">1</button>
            <button>2</button>
            <button>3</button>
            <span>...</span>
            <button>Next</button>
          </div>
        </div>
      </div>

      {/* Student Profile Modal */}
      {selectedStudent && (
        <div
          className="modal-overlay"
          onClick={() => setSelectedStudent(null)}
        >
          <div
            className="student-profile-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setSelectedStudent(null)}
            >
              ×
            </button>

            <div className="profile-header">
              <div className="profile-avatar">
                {selectedStudent.name.charAt(0)}
              </div>

              <div>
                <h2>Student Profile</h2>
                <h3>{selectedStudent.name}</h3>
                <p>{selectedStudent.id}</p>
              </div>

              <span className="active-badge">Active</span>
            </div>

            <div className="profile-section">
              <h4>Personal Information</h4>

              <div className="profile-grid">
                <div>
                  <span>Full Name</span>
                  <strong>{selectedStudent.name}</strong>
                </div>

                <div>
                  <span>Student ID</span>
                  <strong>{selectedStudent.id}</strong>
                </div>

                <div>
                  <span>Email</span>
                  <strong>{selectedStudent.email}</strong>
                </div>

                <div>
                  <span>Parent's Number</span>
                  <strong>{selectedStudent.phone}</strong>
                </div>

                <div>
                  <span>Date of Birth</span>
                  <strong>{selectedStudent.dob}</strong>
                </div>

                <div>
                  <span>Gender</span>
                  <strong>{selectedStudent.gender}</strong>
                </div>
              </div>
            </div>

            <div className="profile-section">
              <h4>Academic Information</h4>

              <div className="profile-grid">
                <div>
                  <span>Squad</span>
                  <strong>{selectedStudent.squad}</strong>
                </div>

              </div>
            </div>

            <div className="attendance-summary">
              <div>
                <span>Overall Attendance</span>
                <strong>{selectedStudent.attendance}%</strong>
              </div>

              <div className="progress-bar">
                <div
                  style={{
                    width: `${selectedStudent.attendance}%`,
                  }}
                ></div>
              </div>

              <div className="attendance-details">
                <span>Present: 92 days</span>
                <span>Absent: 8 days</span>
                <span>Total: 100 days</span>
              </div>
            </div>

            <div className="modal-actions">
              <button
                className="edit-profile-btn"
                onClick={() =>
                  alert("Edit Profile functionality can be added here.")
                }
              >
                Edit Profile
              </button>

              <button
                className="close-profile-btn"
                onClick={() => setSelectedStudent(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddStudent && (
        <div
          className="modal-overlay"
          onClick={() => setShowAddStudent(false)}
        >
          <div
            className="add-student-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close"
              onClick={() => setShowAddStudent(false)}
            >
              ×
            </button>

            <h2>Add New Student</h2>
            <p>Add student information to the system.</p>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                alert("Student added successfully.");
                setShowAddStudent(false);
              }}
            >
              <div className="form-grid">
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                />

                <input
                  type="text"
                  placeholder="Student ID"
                  required
                />

                <input
                  type="email"
                  placeholder="Email"
                  required
                />

                <input
                  type="tel"
                  placeholder="Student Phone Number"
                  required
                />

                <input
                  type="tel"
                  placeholder="Parent's Number"
                  required
                />

                <input
                  type="email"
                  placeholder="Parent Email"
                  required
                />

                <select required defaultValue="">
                  <option value="" disabled>
                    Squad
                  </option>
                  <option value="138">138</option>
                  <option value="139">139</option>
                </select>


              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="close-profile-btn"
                  onClick={() => setShowAddStudent(false)}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="edit-profile-btn"
                >
                  Add Student
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default StudentPage;