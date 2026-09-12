import { useContext } from "react";
import { AuthContext } from "./authContextValue";

export const useAuth = () => {
    return useContext(AuthContext);
};