import { AxiosError } from 'axios';
import { getApi } from '../../services/api';
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { HomeInputState, HomeState, ApiSuccessResponse, ApiErrorResponse } from './types';

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// -------------------- INITIAL STATE --------------------
const initialState: HomeState = {
  acsUrl: '',
  publicCertificate: '',
  attributes: {
    firstName: 'John',
    lastName: 'Doe',
    memberId: 'AS83747TB',
    email: 'john.doe@example.com',
  },
  loading: false,
  xml: null,
  error: null,
};

// -------------------- ASYNC THUNKS --------------------

// SAML Login
export const initiateSamlLogin = createAsyncThunk<
  ApiSuccessResponse,
  HomeInputState,
  { rejectValue: { errorCode?: string; errorReason: string } }
>('home/initiateSamlLogin', async (payload, { rejectWithValue }) => {
  try {
    const api = getApi();
    const response = await api.post<ApiResponse>('saml/login', payload);
    if (!response.data.success) {
      const errorResponse = response.data as ApiErrorResponse;
      return rejectWithValue({
        errorCode: errorResponse.errorCode || String(response.status),
        errorReason: errorResponse.errorReason || errorResponse.message,
      });
    }
    return response.data;
  } catch (err: unknown) {
    let message = 'Unexpected server error';
    let statusCode: string | undefined;
    if (err instanceof AxiosError) {
      // Extract status code from axios error
      statusCode = err.response?.status ? String(err.response.status) : undefined;
      message = err.response?.data?.message || err.message || 'Unexpected server error';
      // If response has error data, try to extract errorReason
      if (err.response?.data && typeof err.response.data === 'object') {
        const errorData = err.response.data as any;
        return rejectWithValue({
          errorCode: errorData.errorCode || statusCode,
          errorReason: errorData.errorReason || errorData.message || message,
        });
      }
    } else if (err instanceof Error) {
      message = err.message;
    }
    return rejectWithValue({
      errorCode: statusCode,
      errorReason: message,
    });
  }
});

// -------------------- SLICE --------------------
const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    /** Set loading state */
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setHomeInputState(state, action: PayloadAction<HomeInputState>) {
      state.acsUrl = action.payload.acsUrl;
      state.publicCertificate = action.payload.publicCertificate;
      state.attributes = { ...action.payload.attributes };
    },
    resetHomeState(state) {
      state.acsUrl = '';
      state.publicCertificate = '';
      state.attributes = {
        firstName: 'John',
        lastName: 'Doe',
        memberId: 'AS83747TB',
        email: 'john.doe@example.com',
      };
      state.loading = false;
      state.xml = null;
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // -------------------- initiateSamlLogin --------------------
    builder
      .addCase(initiateSamlLogin.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(initiateSamlLogin.fulfilled, (state, action) => {
        state.loading = false;
        state.acsUrl = action.payload.acsUrl;
        state.publicCertificate = action.payload.publicCertificate;
        state.xml = action.payload.xml;
      })
      .addCase(initiateSamlLogin.rejected, (state, action) => {
        state.loading = false;
        state.error =
          action.payload?.errorReason ||
          'Something went wrong while initiating SSO login. Please check your inputs and try again.';
      });
  },
});

// -------------------- EXPORTS --------------------
export const { setLoading, setHomeInputState, resetHomeState } = homeSlice.actions;
export default homeSlice.reducer;
