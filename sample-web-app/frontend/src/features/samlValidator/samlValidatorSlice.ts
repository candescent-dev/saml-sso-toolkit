import JSZip from 'jszip';
import { AxiosError } from 'axios';
import { getApi } from '../../services/api';
import { SamlValidatorState } from './type';
import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';

const initialState: SamlValidatorState = {
  error: null,
  htmlFileUrl: '',
  xmlFileUrl: '',
  runValidatorLoading: false,
  publishSamlSettingLoading: false,
};

// -------------------- Async Thunk --------------------
export const fetchE2EReports = createAsyncThunk<
  { htmlFileUrl: string; xmlFileUrl: string },
  void,
  { rejectValue: { error: string } }
>('e2eReports/fetch', async (_, { rejectWithValue }) => {
  try {
    const api = getApi();
    const response = await api.post('e2e-test', null, {
      responseType: 'arraybuffer',
    });
    const zipData = response.data;
    const zip = await JSZip.loadAsync(zipData);
    const htmlContent = (await zip.file('e2e-report.html')?.async('string')) || '';
    const xmlContent = (await zip.file('jest-e2e.xml')?.async('string')) || '';
    const htmlFileUrl = URL.createObjectURL(new Blob([htmlContent], { type: 'text/html' }));
    const xmlFileUrl = URL.createObjectURL(new Blob([xmlContent], { type: 'text/xml' }));
    return { htmlFileUrl, xmlFileUrl };
  } catch (err: unknown) {
    let message = 'Server Error: Something went wrong. Please try again later';
    if (err instanceof AxiosError) {
      const data = err.response?.data;
      // Case: responseType: 'arraybuffer' → errors come back as ArrayBuffer
      if (data instanceof ArrayBuffer) {
        try {
          const decodedJson = JSON.parse(new TextDecoder().decode(data));
          if (decodedJson?.message) {
            message = decodedJson.message;
          }
        } catch {
          // If decoding fails, keep default message
        }
      } else if (data?.message) {
        // Case: Axios parsed JSON normally
        message = data.message;
      } else if (err.message) {
        // Fallback to Axios error message
        message = err.message;
      }
    } else if (err instanceof Error) {
      message = err.message;
    }
    return rejectWithValue({ error: message });
  }
});

// -------------------- Slice --------------------
const samlValidatorSlice = createSlice({
  name: 'e2eReports',
  initialState,
  reducers: {
    /** Set loading state */
    setPublishSamlSettingLoading: (state, action: PayloadAction<boolean>) => {
      state.publishSamlSettingLoading = action.payload;
    },
    /** Reset the samlValidator state to initial values */
    resetSamlValidatorState(state) {
      if (state.htmlFileUrl) URL.revokeObjectURL(state.htmlFileUrl);
      if (state.xmlFileUrl) URL.revokeObjectURL(state.xmlFileUrl);
      state.error = null;
      state.htmlFileUrl = '';
      state.xmlFileUrl = '';
      state.runValidatorLoading = false;
      state.publishSamlSettingLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchE2EReports.pending, (state) => {
      state.error = null;
      state.runValidatorLoading = true;
      if (state.htmlFileUrl) URL.revokeObjectURL(state.htmlFileUrl);
      if (state.xmlFileUrl) URL.revokeObjectURL(state.xmlFileUrl);
      state.htmlFileUrl = '';
      state.xmlFileUrl = '';
    });
    builder.addCase(fetchE2EReports.fulfilled, (state, action) => {
      state.runValidatorLoading = false;
      state.htmlFileUrl = action.payload.htmlFileUrl;
      state.xmlFileUrl = action.payload.xmlFileUrl;
    });
    builder.addCase(fetchE2EReports.rejected, (state, action) => {
      state.runValidatorLoading = false;
      state.error = action.payload?.error || 'Something went wrong. Please try again later';
    });
  },
});

export const { setPublishSamlSettingLoading, resetSamlValidatorState } = samlValidatorSlice.actions;
export default samlValidatorSlice.reducer;