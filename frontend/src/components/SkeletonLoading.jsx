import "./SkeletonLoading.css";

const SkeletonBlock = ({ className = "" }) => (
    <div className={`skeleton-block ${className}`} />
);

const SkeletonRow = ({ children }) => (
    <div className="skeleton-row">{children}</div>
);

// ============================================================
// STUDENTS TABLE SKELETON
// ============================================================

const StudentsSkeleton = ({ rows = 7 }) => {
    return (
        <div className="skeleton-table students-skeleton">
            {/* Header */}
            <div className="skeleton-table-header students-header">
                <SkeletonBlock className="header-student" />
                <SkeletonBlock className="header-email" />
                <SkeletonBlock className="header-squad" />
                <SkeletonBlock className="header-attendance" />
                <SkeletonBlock className="header-parent" />
                <SkeletonBlock className="header-actions" />
            </div>

            {/* Rows */}
            {Array.from({ length: rows }).map((_, index) => (
                <SkeletonRow key={index}>
                    <div className="student-skeleton-info">
                        <SkeletonBlock className="student-avatar" />

                        <div className="student-name-lines">
                            <SkeletonBlock className="student-name" />
                            <SkeletonBlock className="student-name-small" />
                        </div>
                    </div>

                    <SkeletonBlock className="student-email-value" />

                    <SkeletonBlock className="student-squad-value" />

                    <SkeletonBlock className="student-attendance-value" />

                    <SkeletonBlock className="student-parent-value" />

                    <div className="student-actions">
                        <SkeletonBlock className="action-button" />
                        <SkeletonBlock className="action-button" />
                        <SkeletonBlock className="action-button action-button-wide" />
                        <SkeletonBlock className="action-button action-send" />
                    </div>
                </SkeletonRow>
            ))}
        </div>
    );
};

// ============================================================
// PARENT CONTACTS SKELETON
// ============================================================

const ContactsSkeleton = ({ rows = 8 }) => {
    return (
        <div className="skeleton-table contacts-skeleton">
            {/* Header */}
            <div className="skeleton-table-header contacts-header">
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
            </div>

            {Array.from({ length: rows }).map((_, index) => (
                <SkeletonRow key={index}>
                    <SkeletonBlock className="contact-name" />

                    <SkeletonBlock className="contact-email" />

                    <SkeletonBlock className="contact-input" />

                    <SkeletonBlock className="contact-input contact-parent-email" />

                    <SkeletonBlock className="contact-input" />
                </SkeletonRow>
            ))}
        </div>
    );
};

// ============================================================
// DASHBOARD ATTENTION SKELETON
// ============================================================

const AttentionSkeleton = ({ rows = 5 }) => {
    return (
        <div className="skeleton-table attention-skeleton">
            {/* Header */}
            <div className="skeleton-table-header attention-header">
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
                <SkeletonBlock />
            </div>

            {Array.from({ length: rows }).map((_, index) => (
                <SkeletonRow key={index}>
                    <SkeletonBlock className="attention-student" />

                    <SkeletonBlock className="attention-squad" />

                    <SkeletonBlock className="attention-attendance" />

                    <SkeletonBlock className="attention-status" />

                    <SkeletonBlock className="attention-date" />
                </SkeletonRow>
            ))}
        </div>
    );
};

// ============================================================
// MAIN COMPONENT
// ============================================================

const SkeletonLoading = ({
    type = "students",
    rows,
}) => {
    switch (type) {
        case "contacts":
            return <ContactsSkeleton rows={rows || 8} />;

        case "attention":
            return <AttentionSkeleton rows={rows || 5} />;

        case "students":
        default:
            return <StudentsSkeleton rows={rows || 7} />;
    }
};

export default SkeletonLoading;