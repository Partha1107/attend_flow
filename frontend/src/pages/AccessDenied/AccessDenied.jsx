import { useNavigate } from "react-router-dom";
import "./AccessDenied.css";

const AccessDenied = () => {
    const navigate = useNavigate();

    const handleBackToLogin = async () => {
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
                    This portal is only available to authorized
                    Kalvium mentors.
                </p>

                <p>
                    Please sign in using your official
                    <strong> @kalvium.com </strong>
                    
                    account.
                </p>

                <button onClick={handleBackToLogin}>
                    Back to Login
                </button>
            </div>
        </div>
    );
};

export default AccessDenied;