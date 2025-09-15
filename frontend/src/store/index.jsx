import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { baseApi } from './api/baseApi';
import authSlice from './slices/authSlice';
import filtersSlice from './slices/filtersSlice';
import uiSlice from './slices/uiSlice';
import modalSlice from './slices/modalSlice';
import './api/AuthApi';
import './api/callsApi';
import './api/filtersApi';
import './api/costApi';
import './api/userApi';

const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['auth', 'ui', 'filters'],
  blacklist: [baseApi.reducerPath],
};

const rootReducer = combineReducers({
  [baseApi.reducerPath]: baseApi.reducer,
  auth: authSlice,
  filters: filtersSlice,
  ui: uiSlice,
  modal: modalSlice,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/REGISTER'],
      },
    }).concat(baseApi.middleware),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export default store;
