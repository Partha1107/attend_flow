import { useNavigate } from "react-router-dom";
import "./AccessDenied.css";

const AccessDenied = () => {
    const navigate = useNavigate();

    const handleBackToLogin = () => {
        navigate("/login");
    };

    return (
        <div className="access-denied-page">
            <div className="access-denied-card">
                <div className="access-denied-icon">
                    !
                </div>

                <h1>Access Denied</h1>

                <p>
                    You don't have permission to access this portal.
                </p>

                <p>
                    Please contact the system administrator if you
                    believe you should have access.
                </p>

                <button onClick={handleBackToLogin}>
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;