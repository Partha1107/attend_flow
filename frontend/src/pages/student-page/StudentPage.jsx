import { useState } from "react";
import "./StudentPage.css";

const students = [
  {
    id: "STU001",
    name: "Arun Kumar",
    squad: "138",
    attendance: 92,
    status: "Present",
    email: "arun.kumar@example.com",
    phone: "+91 98765 43210",
    dob: "15 March 2005",
    gender: "Male",
  },
  {
    id: "STU045",
    name: "Priya Sharma",
    squad: "138",
    attendance: 88,
    status: "Present",
    email: "priya.sharma@example.com",
    phone: "+91 98765 43211",
    dob: "20 July 2005",
    gender: "Female",
  },
  {
    id: "STU089",
    name: "Rahul Kumar",
    squad: "139",
    attendance: 76,
    status: "Absent",
    email: "rahul.kumar@example.com",
    phone: "+91 98765 43212",
    dob: "12 January 2004",
    gender: "Male",
  },
  {
    id: "STU112",
    name: "Divya S",
    squad: "138",
    attendance: 95,
    status: "Present",
    email: "divya.s@example.com",
    phone: "+91 98765 43213",
    dob: "5 September 2006",
    gender: "Female",
  },
  {
    id: "STU134",
    name: "Karthik R",
    squad: "139",
    attendance: 81,
    status: "Present",
    email: "karthik.r@example.com",
    phone: "+91 98765 43214",
    dob: "28 November 2004",
    gender: "Male",
  },
];

function StudentPage() {
  const [search, setSearch] = useState("");
  const [squad, setSquad] = useState("");
  const [attendanceStatus, setAttendanceStatus] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [showAddStudent, setShowAddStudent] = useState(false);

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
          onClick={() => setShowAddStudent(true)}
        >
          <span>+</span>
          Add Student
        </button>
      </div>

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

        {filteredStudents.length > 0 ? (
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
                  className={`status-badge ${
                    student.status === "Present"
                      ? "status-present"
                      : "status-absent"
                  }`}
                >
                  <span className="status-dot"></span>
                  {student.status}
                </span>
              </div>

              <div>
                <button
                  className="view-profile-btn"
                  onClick={() => setSelectedStudent(student)}
                >
                  View Profile
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