import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface FormState {
  initUrl: string;
  encCertificate: string;
  firstName: string;
  lastName: string;
  memberId: string;
  email: string;
}

const initialState: FormState = {
  initUrl: '',
  encCertificate: '',
  firstName: 'John',
  lastName: 'Deo',
  memberId: 'AS83747TB',
  email: 'john.doe@example.com',
};

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setInitUrl(state, action: PayloadAction<string>) {
      state.initUrl = action.payload;
    },
    setEncCertificate(state, action: PayloadAction<string>) {
      state.encCertificate = action.payload;
    },
    setFirstName(state, action: PayloadAction<string>) {
      state.firstName = action.payload;
    },
    setLastName(state, action: PayloadAction<string>) {
      state.lastName = action.payload;
    },
    setMemberId(state, action: PayloadAction<string>) {
      state.memberId = action.payload;
    },
    setEmail(state, action: PayloadAction<string>) {
      state.email = action.payload;
    },
  },
});

export const { setInitUrl, setEncCertificate, setFirstName, setLastName, setMemberId, setEmail } =
  homeSlice.actions;

export default homeSlice.reducer;
