import { useEffect, useRef, useState } from "react";
import {
  Download,
  Save,
  Upload,
} from "lucide-react";
import * as XLSX from "xlsx";
import SkeletonLoading from "../../components/SkeletonLoading";

import {
  getMentorStudents,
  updateStudentContact,
} from "../../api/mentor";

import "./ParentEmailImport.css";


// =====================================================
// VALIDATION
// =====================================================

const EMAIL_PATTERN =
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PHONE_PATTERN = /^\d{10}$/;

// =====================================================
// EXCEL HELPERS
// =====================================================

const normalizeColumn = (value) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");


const normalizeEmail = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const getColumn = (
  headers,
  candidates
) =>
  headers.find((header) =>
    candidates.includes(
      normalizeColumn(header)
    )
  );


// =====================================================
// VALIDATION HELPERS
// =====================================================

const isValidEmail = (value) =>
  !value ||
  EMAIL_PATTERN.test(
    String(value).trim()
  );


const isValidPhone = (value) =>
  !value ||
  PHONE_PATTERN.test(
    String(value).trim()
  );


// =====================================================
// COMPONENT
// =====================================================

function ParentEmailImport() {
  const fileInputRef = useRef(null);

  const [students, setStudents] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [importing, setImporting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [squad, setSquad] =
    useState("");

  // =====================================================
  // LOAD ASSIGNED SQUAD STUDENTS
  // =====================================================

  useEffect(() => {
    loadStudents();
  }, []);


  const loadStudents = async () => {
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      /*
       * IMPORTANT:
       * We do not pass squad from the frontend.
       *
       * Backend gets the mentor's squad from
       * mentor_profiles using the authenticated user.
       */

      const result =
        await getMentorStudents();
      setSquad(result.squad || "");

      const loadedStudents =
        (result.students || []).map(
          (student) => ({
            id: student.id,

            name:
              student.name || "",

            email:
              student.email || "",

            phone:
              student.phone ||
              student.student_phone ||
              "",

            parentEmail:
              student.parent_email ||
              student.parentEmail ||
              "",

            parentPhone:
              student.parent_phone ||
              student.parentPhone ||
              "",
          })
        );

      setStudents(
        loadedStudents
      );
    } catch (loadError) {
      console.error(
        "Failed to load squad students:",
        loadError
      );

      setError(
        loadError.message ||
        "Failed to load students for your assigned squad."
      );
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    // Load after mount inside a callback so the initial
    // render is not cascaded by synchronous setState.
    const loadTimer = setTimeout(() => {
      loadStudents();
    }, 0);

    return () => clearTimeout(loadTimer);
  }, []);


  const updateStudent = (
    studentId,
    field,
    value
  ) => {
    setStudents(
      (currentStudents) =>
        currentStudents.map(
          (student) =>
            student.id === studentId
              ? {
                ...student,
                [field]: value,
              }
              : student
        )
    );

    setSuccess("");
    setError("");
  };


  // =====================================================
  // VALIDATION
  // =====================================================

  const getRowError = (student) => {
    // Parent Email validation
    if (
      student.parentEmail &&
      !isValidEmail(student.parentEmail)
    ) {
      return "Invalid parent email";
    }

    // Student Phone validation
    if (
      student.phone &&
      !isValidPhone(student.phone)
    ) {
      return "Invalid phone";
    }

    // Parent Phone validation
    if (
      student.parentPhone &&
      !isValidPhone(student.parentPhone)
    ) {
      return "Invalid parent phone";
    }

    return "";
  };


  // =====================================================
  // IMPORT EXCEL
  // =====================================================

  const handleExcelImport =
    async (event) => {
      const file =
        event.target.files?.[0];

      if (!file) return;

      setError("");
      setSuccess("");
      setImporting(true);

      try {
        // -------------------------------------------------
        // CHECK FILE
        // -------------------------------------------------

        if (
          !/\.(xlsx|xls)$/i.test(
            file.name
          )
        ) {
          throw new Error(
            "Please select an .xlsx or .xls file."
          );
        }


        // -------------------------------------------------
        // READ WORKBOOK
        // -------------------------------------------------

        const workbook =
          XLSX.read(
            await file.arrayBuffer(),
            {
              type: "array",
            }
          );


        const firstSheet =
          workbook.Sheets[
          workbook.SheetNames[0]
          ];

        if (!firstSheet) {
          throw new Error(
            "The Excel file is empty."
          );
        }


        // -------------------------------------------------
        // CONVERT SHEET TO JSON
        // -------------------------------------------------

        const excelRows =
          XLSX.utils.sheet_to_json(
            firstSheet,
            {
              defval: "",
              raw: false,
            }
          );

        if (!excelRows.length) {
          throw new Error(
            "The Excel file does not contain any data."
          );
        }


        // -------------------------------------------------
        // FIND COLUMNS
        // -------------------------------------------------

        const headers =
          Object.keys(
            excelRows[0]
          );


        const nameColumn =
          getColumn(
            headers,
            [
              "studentname",
              "name",
            ]
          );


        const emailColumn =
          getColumn(
            headers,
            [
              "studentemail",
              "email",
              "studentemailaddress",
            ]
          );


        const phoneColumn =
          getColumn(
            headers,
            [
              "phone",
              "studentphone",
              "studentphonenumber",
            ]
          );


        const parentEmailColumn =
          getColumn(
            headers,
            [
              "parentemail",
              "parentemailaddress",
            ]
          );


        const parentPhoneColumn =
          getColumn(
            headers,
            [
              "parentphone",
              "parentphonenumber",
            ]
          );


        if (!emailColumn) {
          throw new Error(
            "Missing Student Email column in the Excel file."
          );
        }


        // -------------------------------------------------
        // MATCH AGAINST CURRENT SQUAD
        // -------------------------------------------------

        const studentsByEmail =
          new Map();

        students.forEach(
          (student) => {
            studentsByEmail.set(
              normalizeEmail(
                student.email
              ),
              student
            );
          }
        );


        let matchedCount = 0;
        let skippedCount = 0;


        setStudents(
          (currentStudents) =>
            currentStudents.map(
              (student) => {
                const excelRow =
                  excelRows.find(
                    (row) =>
                      normalizeEmail(
                        row[
                        emailColumn
                        ]
                      ) ===
                      normalizeEmail(
                        student.email
                      )
                  );


                if (!excelRow) {
                  return student;
                }


                matchedCount += 1;


                return {
                  ...student,

                  /*
                   * Student identity always comes
                   * from the database.
                   */

                  name:
                    student.name,

                  email:
                    student.email,

                  phone: phoneColumn
                    ? String(
                      excelRow[
                      phoneColumn
                      ] || ""
                    ).trim()
                    : student.phone,

                  parentEmail:
                    parentEmailColumn
                      ? String(
                        excelRow[
                        parentEmailColumn
                        ] || ""
                      ).trim()
                      : student.parentEmail,

                  parentPhone:
                    parentPhoneColumn
                      ? String(
                        excelRow[
                        parentPhoneColumn
                        ] || ""
                      ).trim()
                      : student.parentPhone,
                };
              }
            )
        );


        // -------------------------------------------------
        // COUNT NON-MATCHING EXCEL ROWS
        // -------------------------------------------------

        for (
          const row of excelRows
        ) {
          const email =
            normalizeEmail(
              row[emailColumn]
            );

          if (
            !studentsByEmail.has(
              email
            )
          ) {
            skippedCount += 1;
          }
        }


        // -------------------------------------------------
        // SUCCESS MESSAGE
        // -------------------------------------------------

        setSuccess(
          `Excel imported into the table. ${matchedCount} students matched${skippedCount
            ? `, ${skippedCount} rows skipped because they are not part of your assigned squad`
            : ""
          }. Review the changes before saving.`
        );
      } catch (importError) {
        console.error(
          "Excel import error:",
          importError
        );

        setError(
          importError.message ||
          "Failed to import the Excel file."
        );
      } finally {
        setImporting(false);

        /*
         * Allow selecting the same file again.
         */

        event.target.value = "";
      }
    };


  // =====================================================
  // DOWNLOAD EXCEL TEMPLATE
  // =====================================================

  const downloadTemplate =
    () => {
      if (!students.length) {
        setError(
          "There are no students available to create the template."
        );

        return;
      }


      const templateRows =
        students.map(
          (student) => ({
            "Student Name":
              student.name,

            "Student Email":
              student.email,

            Phone:
              student.phone || "",

            "Parent Email":
              student.parentEmail || "",

            "Parent Phone":
              student.parentPhone || "",
          })
        );


      const worksheet =
        XLSX.utils.json_to_sheet(
          templateRows
        );


      worksheet["!cols"] = [
        { wch: 25 },
        { wch: 35 },
        { wch: 18 },
        { wch: 35 },
        { wch: 18 },
      ];


      const workbook =
        XLSX.utils.book_new();


      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Student Contacts"
      );



      XLSX.writeFile(
        workbook,
        `student_contact_template_${squad}.xlsx`
      );


      setSuccess(
        "Excel template downloaded successfully."
      );
    };


  // =====================================================
  // SAVE CHANGES TO BACKEND
  // =====================================================

  const saveChanges = async () => {
    setError("");
    setSuccess("");

    // Check all students before saving anything
    const invalidStudents = students
      .map((student) => ({
        student,
        error: getRowError(student),
      }))
      .filter((item) => item.error);

    // STOP HERE if there are invalid values
    if (invalidStudents.length > 0) {
      const message = invalidStudents
        .map(
          ({ student, error: studentError }) =>
            `${student.name} — ${studentError}`
        )
        .join("\n");

      setError(message);

      // VERY IMPORTANT
      return;
    }

    try {
      setSaving(true);

      await Promise.all(
        students.map((student) =>
          updateStudentContact(student.id, {
            phone: student.phone,
            parent_email: student.parentEmail,
            parent_phone: student.parentPhone,
          })
        )
      );

      setSuccess("Student contact details saved successfully.");
    } catch (err) {
      setError(err.message || "Failed to save changes.");
    } finally {
      setSaving(false);
    }
  };



  // =====================================================
  // UI
  // =====================================================

  return (
    <section className="parent-email-page">

      {/* =================================================
          HEADER
          ================================================= */}

      <header className="parent-email-header">

        <div>
          <h1>
            Student Contact Management
          </h1>

          <p>
            Manage contact information
            for students in your
            assigned squad.
          </p>
        </div>


        <div className="parent-email-header-actions">

          {/* Hidden Excel input */}

          <input
            ref={fileInputRef}
            className="parent-email-file-input"
            type="file"
            accept=".xlsx,.xls"
            onChange={
              handleExcelImport
            }
          />


          {/* Import Excel */}

          <button
            type="button"
            className="parent-email-secondary-button"
            onClick={() =>
              fileInputRef.current?.click()
            }
            disabled={importing}
          >

            <Upload size={17} />

            {importing
              ? "Importing..."
              : "Import Excel"}

          </button>


          {/* Download Template */}

          <button
            type="button"
            className="parent-email-secondary-button"
            onClick={
              downloadTemplate
            }
            disabled={
              loading ||
              !students.length
            }
          >

            <Download size={17} />

            Download Template

          </button>

        </div>

      </header>


      {/* =================================================
          ERROR MESSAGE
          ================================================= */}


      {/* =================================================
          SUCCESS MESSAGE
          ================================================= */}

      {success && (
        <div className="parent-email-message parent-email-success">
          {success}
        </div>
      )}
      {error && (
        <div className="contact-error-box" role="alert">
          <div className="contact-error-title">
            Please correct the following:
          </div>

          <div className="contact-error-list">
            {error.split("\n").map((message, index) => (
              <div className="contact-error-item" key={index}>
                {message}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* =================================================
          TABLE CARD
          ================================================= */}

      <div className="parent-email-card parent-email-preview-card">

        <div className="parent-email-preview-header">

          <div>

            <h2>
              Student Contacts
            </h2>

            <p>
              {loading
                ? "loadStudent...."
                : `${students.length} students in your assigned squad`}
            </p>

          </div>


          {/* SAVE */}

          <button
            type="button"
            className="parent-email-primary-button"
            onClick={
              saveChanges
            }
            disabled={
              loading ||
              saving ||
              !students.length
            }
          >

            <Save size={17} />

            {saving
              ? "Saving..."
              : "Save Changes"}

          </button>

        </div>


        {/* =================================================
            LOADING
            ================================================= */}

        {loading ? (
          <div className="parent-email-skeleton-wrapper">
            <SkeletonLoading
              type="contacts"
              rows={8}
            />
          </div>

        ) : students.length === 0 ? (

          <div className="parent-email-empty">
            No students found in your assigned squad.
          </div>

        ) : (

          <div className="parent-email-table-wrapper">

            <table className="parent-email-table">

              <thead>

                <tr>

                  <th>
                    Student Name
                  </th>

                  <th>
                    Student Email
                  </th>

                  <th>
                    Phone
                  </th>

                  <th>
                    Parent Email
                  </th>

                  <th>
                    Parent Phone
                  </th>

                </tr>

              </thead>


              <tbody>

                {students.map(
                  (student) => {

                    const rowError =
                      getRowError(
                        student
                      );


                    return (
                      <tr
                        key={
                          student.id
                        }
                      >

                        {/* =================================
                            STUDENT NAME
                            ================================= */}

                        <td>

                          <div className="student-name-cell">
                            {student.name ||
                              "-"}
                          </div>

                        </td>


                        {/* =================================
                            STUDENT EMAIL
                            ================================= */}

                        <td>

                          <div className="student-email-cell">
                            {student.email ||
                              "-"}
                          </div>

                        </td>


                        {/* =================================
                            PHONE
                            ================================= */}

                        <td>
                          <input
                            className={
                              rowError === "Invalid phone"
                                ? "table-input table-input-error"
                                : "table-input"
                            }
                            type="number"
                            min="0"
                            max="9999999999"
                            step="1"
                            value={student.phone}
                            placeholder="10-digit phone number"
                            onChange={(event) => {
                              const value = event.target.value;

                              if (value === "" || /^\d{0,10}$/.test(value)) {
                                updateStudent(student.id, "phone", value);
                              }
                            }}
                          />
                        </td>


                        {/* =================================
                            PARENT EMAIL
                            ================================= */}

                        <td>

                          <input
                            className={
                              rowError ===
                                "Invalid parent email"
                                ? "table-input table-input-error"
                                : "table-input"
                            }
                            type="email"
                            value={
                              student.parentEmail
                            }
                            placeholder="Parent email"
                            onChange={(
                              event
                            ) =>
                              updateStudent(
                                student.id,
                                "parentEmail",
                                event.target
                                  .value
                              )
                            }
                          />

                        </td>


                        {/* =================================
                            PARENT PHONE
                            ================================= */}

                        <td>

                          <input
                            className={
                              rowError === "Invalid parent phone"
                                ? "table-input table-input-error"
                                : "table-input"
                            }
                            type="number"
                            min="0"
                            max="9999999999"
                            step="1"
                            value={student.parentPhone}
                            placeholder="10-digit phone number"
                            onChange={(event) => {
                              const value = event.target.value;

                              if (value === "" || /^\d{0,10}$/.test(value)) {
                                updateStudent(student.id, "parentPhone", value);
                              }
                            }}
                          />

                        </td>

                      </tr>
                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>

    </section>
  );
}


export default ParentEmailImport;