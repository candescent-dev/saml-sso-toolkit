import { configureStore } from '@reduxjs/toolkit';
import homeReducer from '../features/home/homeSlice';
import samlValidatorReducer from '../features/samlValidator/samlValidatorSlice';

export const store = configureStore({
  reducer: {
    home: homeReducer,
    samlValidator: samlValidatorReducer
  },
  devTools: process.env.NODE_ENV !== 'production',
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
