import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import api from "../lib/api";

export const registerUser = createAsyncThunk(
  "auth/registerUser",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/user/register", payload);
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Registration failed");
    }
  },
);

export const verifyOtp = createAsyncThunk(
  "auth/verifyOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/user/verify-email", payload);
      if (data.accessToken) {
        localStorage.setItem("accessToken", data.accessToken);
      }
      return data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "OTP verification failed");
    }
  },
);

export const resendOtp = createAsyncThunk(
  "auth/resendOtp",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/user/resend-otp", payload);
      return data.message;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to resend OTP");
    }
  },
);

export const loginUser = createAsyncThunk(
  "auth/loginUser",
  async (payload, { rejectWithValue }) => {
    try {
      const { data } = await api.post("/user/login", payload);
      localStorage.setItem("accessToken", data.accessToken);
      return data;
    } catch (error) {
      const responseData = error.response?.data;
      if (responseData?.requiresOtpVerification) {
        return rejectWithValue({
          message: responseData.message,
          requiresOtpVerification: true,
        });
      }
      return rejectWithValue({
        message: responseData?.message || "Login failed",
      });
    }
  },
);

export const fetchMe = createAsyncThunk(
  "auth/fetchMe",
  async (_, { rejectWithValue }) => {
    try {
      const { data } = await api.get("/user/me");
      return data.user;
    } catch (error) {
      return rejectWithValue("Unable to load profile");
    }
  },
);

export const logoutUser = createAsyncThunk("auth/logoutUser", async () => {
  try {
    await api.post("/user/logout");
  } catch {
    // Keep logout UX reliable even if server session is already invalid/expired.
  }
  localStorage.removeItem("accessToken");
});

const authSlice = createSlice({
  name: "auth",
  initialState: {
    user: null,
    pendingEmail: "",
    isAuthenticated: Boolean(localStorage.getItem("accessToken")),
    loading: false,
    error: "",
    requiresOtp: false,
    message: "",
  },
  reducers: {
    clearAuthState: (state) => {
      state.error = "";
      state.message = "";
    },
    setPendingEmail: (state, action) => {
      state.pendingEmail = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(registerUser.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.loading = false;
        state.pendingEmail = action.meta.arg.email;
        state.requiresOtp = true;
        state.message = action.payload.message;
      })
      .addCase(registerUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(verifyOtp.pending, (state) => {
        state.loading = true;
        state.error = "";
      })
      .addCase(verifyOtp.fulfilled, (state, action) => {
        state.loading = false;
        state.requiresOtp = false;
        state.message = action.payload.message;
        if (action.payload.accessToken) {
          state.user = action.payload.user;
          state.isAuthenticated = true;
        }
      })
      .addCase(verifyOtp.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = "";
        state.requiresOtp = false;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload?.message || "Login failed";
        state.requiresOtp = Boolean(action.payload?.requiresOtpVerification);
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.isAuthenticated = false;
        state.user = null;
        localStorage.removeItem("accessToken");
      })
      .addCase(logoutUser.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
        state.requiresOtp = false;
        state.pendingEmail = "";
      })
      .addCase(resendOtp.fulfilled, (state, action) => {
        state.message = action.payload;
      })
      .addCase(resendOtp.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { clearAuthState, setPendingEmail } = authSlice.actions;
export default authSlice.reducer;
