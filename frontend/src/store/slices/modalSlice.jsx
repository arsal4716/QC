// src/store/slices/modalSlice.js
import { createSlice } from "@reduxjs/toolkit";
const makeModalState = () => ({
  open: false,
  selectedItems: [],
  search: "",
  loading: false,
  error: null,
  items: [],
});

const initialState = {
  modals: {
    campaign: makeModalState(),
    publisher: makeModalState(),
    filters: { open: false },
    target: makeModalState(),
    buyer: makeModalState(),
 recordDetail: {          
      open: false,
      data: null
    },  },
};

const modalSlice = createSlice({
  name: "modal",
  initialState,
  reducers: {
    openModal: (state, action) => {
      const { modalType } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].open = true;
    },
    closeModal: (state, action) => {
      const { modalType } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].open = false;
    },
    setModalSearch: (state, action) => {
      const { modalType, search = "" } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].search = String(search);
    },
    setModalLoading: (state, action) => {
      const { modalType, loading = false } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].loading = !!loading;
    },
    setModalError: (state, action) => {
      const { modalType, error = null } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].error = error;
    },
    setModalItems: (state, action) => {
      const { modalType, items = [] } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].items = Array.isArray(items) ? items : [];
    },
    toggleModalItem: (state, action) => {
      const { modalType, itemId } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      const s = new Set(state.modals[modalType].selectedItems);
      if (s.has(itemId)) s.delete(itemId);
      else s.add(itemId);
      state.modals[modalType].selectedItems = Array.from(s);
    },
    clearModalSelection: (state, action) => {
      const { modalType } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].selectedItems = [];
    },
    setModalSelection: (state, action) => {
      const { modalType, selectedItems = [] } = action.payload || {};
      if (!modalType || !state.modals[modalType]) return;
      state.modals[modalType].selectedItems = Array.isArray(selectedItems)
        ? selectedItems
        : [];
    },
    setRecordDetail: (state, action) => {
      state.modals.recordDetail = {
        open: true,
        data: action.payload,
      };
    },
    clearRecordDetail: (state) => {
      state.modals.recordDetail = null;
    },
  },
});

export const {
  openModal,
  closeModal,
  setModalSearch,
  setModalLoading,
  setModalError,
  setModalItems,
  toggleModalItem,
  clearModalSelection,
  setModalSelection,
  setRecordDetail,
  clearRecordDetail,
} = modalSlice.actions;

export const selectModalState = (modalType) => (state) =>
  state.modal?.modals?.[modalType] ?? null;
export const selectIsModalOpen = (modalType) => (state) =>
  !!state.modal?.modals?.[modalType]?.open;
export const selectRecordDetail = (state) => state.modal?.modals?.recordDetail;

export default modalSlice.reducer;
