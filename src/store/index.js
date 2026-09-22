import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from './notificationsSlice';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    notifications: notificationsReducer,
    ui: uiReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false, // Allows flexible date/payload objects
    }),
});

export default store;
