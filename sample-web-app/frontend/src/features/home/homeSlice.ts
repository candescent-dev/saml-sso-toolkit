import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { HomeInputState, HomeState, ApiSuccessResponse, ApiErrorResponse } from './types';
import { getApi } from '../../services/api';

type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

// INITIAL STATE
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

// ASYNC THUNK
export const initiateSamlLogin = createAsyncThunk<
  ApiSuccessResponse,
  HomeInputState,
  { rejectValue: string }
>('home/initiateSamlLogin', async (payload, { rejectWithValue }) => {
  try {
    const api = getApi();
    const response = await api.post<ApiResponse>('saml/login', payload);
    if (!response.data.success) {
      return rejectWithValue(response.data.message);
    }
    return response.data;
  } catch (err: unknown) {
    let message = 'Unexpected server error';
    if (err instanceof Error) message = err.message;
    return rejectWithValue(message);
  }
});

// SLICE
const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
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
          action.payload ||
          'Something went wrong while initiating SSO login. Please check your inputs and try again.';
      });
  },
});

export const { setHomeInputState, resetHomeState } = homeSlice.actions;
export default homeSlice.reducer;
