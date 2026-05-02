import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./authSlice";
import financeReducer from "./financeSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    finance: financeReducer,
  },
});
