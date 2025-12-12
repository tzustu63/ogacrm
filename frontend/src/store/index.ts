import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, TypedUseSelectorHook } from 'react-redux'
import authReducer from './slices/authSlice'
import schoolsReducer from './slices/schoolsSlice'
import contactsReducer from './slices/contactsSlice'
import interactionsReducer from './slices/interactionsSlice'
import partnershipsReducer from './slices/partnershipsSlice'
import searchReducer from './slices/searchSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    schools: schoolsReducer,
    contacts: contactsReducer,
    interactions: interactionsReducer,
    partnerships: partnershipsReducer,
    search: searchReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

// Typed hooks
export const useAppDispatch = () => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector