import "./Loader.css";

const Loader = ({ fullScreen = false, size = "medium", text = "" }) => {
  return (
    <div className={`loader-wrapper ${fullScreen ? "loader-fullscreen" : ""}`}>
      <div className={`loader ${size}`}>
        <span></span>
        <span></span>
        <span></span>
        <span></span>
      </div>

      {text && <p className="loader-text">{text}</p>}
    </div>
  );
};

export default Loader;