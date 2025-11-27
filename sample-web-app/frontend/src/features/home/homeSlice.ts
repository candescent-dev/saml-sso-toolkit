import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { HomeState } from './types';

const initialState: HomeState = {
  acsUrl: '',
  publicCertificate: '',
  attributes: {
    firstName: 'John',
    lastName: 'Doe',
    memberId: 'AS83747TB',
    email: 'john.doe@example.com',
  },
};

const homeSlice = createSlice({
  name: 'home',
  initialState,
  reducers: {
    setHomeState(state, action: PayloadAction<HomeState>) {
      return { ...action.payload };
    },
  },
});

export const { setHomeState } = homeSlice.actions;
export default homeSlice.reducer;
