import {
  closeModal,
  setModalSearch,
  clearModalSelection,
  toggleModalItem,
  setModalLoading,
  setModalError,
  setModalItems,
} from "../../store/slices/modalSlice";
import React, { memo, useCallback, useEffect } from "react";
import { useSelector, useDispatch } from "react-redux";
import { createPortal } from "react-dom";
import { useDebounce } from "../../hooks/useDebounce";
import {
  useLazyGetCampaignsQuery,
  useLazyGetPublishersQuery,
  useLazyGetTargetsQuery,
  useLazyGetBuyersQuery,
} from "../../store/api/filtersApi";

const BaseModal = memo(({ modalType, title, onApply, children }) => {
  const dispatch = useDispatch();
  const modalState = useSelector((state) => state.modal.modals[modalType]);
const [triggerCampaigns] = useLazyGetCampaignsQuery();
const [triggerPublishers] = useLazyGetPublishersQuery();
const [triggerTargets] = useLazyGetTargetsQuery(); 
const [triggerBuyers] = useLazyGetBuyersQuery();   

let triggerFetch;
switch (modalType) {
  case "campaign":
    triggerFetch = triggerCampaigns;
    break;
  case "publisher":
    triggerFetch = triggerPublishers;
    break;
  case "target":
    triggerFetch = triggerTargets;
    break;
  case "buyer":
    triggerFetch = triggerBuyers;
    break;
  default:
    triggerFetch = async () => [];
}
const debouncedSearch = useDebounce(modalState.search, 300);
  const loadItems = useCallback(async () => {
    try {
      dispatch(setModalLoading({ modalType, loading: true }));
      dispatch(setModalError({ modalType, error: null }));

      const result = await triggerFetch({
        search: debouncedSearch,
        limit: 1000,
      }).unwrap();
      console.log("Raw result:", result);
      const itemsArray = result.map((item) => ({
        value: item.value || item.label,
        label: item.label,
        count: item.count,
      }));
      dispatch(setModalItems({ modalType, items: itemsArray }));
    } catch (error) {
      dispatch(
        setModalError({
          modalType,
          error: error.message || "Failed to load items",
        })
      );
    } finally {
      dispatch(setModalLoading({ modalType, loading: false }));
    }
  }, [modalType, debouncedSearch, triggerFetch, dispatch]);

  useEffect(() => {
    if (modalState.open) loadItems();
  }, [modalState.open, loadItems]);

  const handleClose = useCallback(() => {
    dispatch(closeModal({ modalType }));
  }, [modalType, dispatch]);

  const handleSearchChange = useCallback(
    (e) => {
      dispatch(setModalSearch({ modalType, search: e.target.value }));
    },
    [modalType, dispatch]
  );

  const handleToggleItem = useCallback(
    (itemId) => {
      dispatch(toggleModalItem({ modalType, itemId }));
    },
    [modalType, dispatch]
  );

  const handleClearSelection = useCallback(() => {
    dispatch(clearModalSelection({ modalType }));
  }, [modalType, dispatch]);


  const handleApply = useCallback(() => {
    onApply?.(modalState.selectedItems);
    handleClose();
  }, [onApply, modalState.selectedItems, handleClose]);

  if (!modalState.open) return null;

  return createPortal(
    <div
      className="modal show d-block"
      tabIndex="-1"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
    >
      <div className="modal-dialog modal-dialog-scrollable modal-lg">
        <div
          className="modal-content"
          style={{ background: "#0b1324", color: "#fff" }}
        >
          <div className="modal-header border-secondary">
            <h5 className="modal-title">{title}</h5>
            <button
              type="button"
              className="btn-close btn-close-white"
              onClick={handleClose}
              aria-label="Close"
            />
          </div>

          <div className="modal-body">
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control form-control-sm"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={modalState.search}
                onChange={handleSearchChange}
                aria-label={`Search ${title}`}
              />
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={handleClearSelection}
              >
                Clear
              </button>
              <button
                className="btn btn-sm btn-outline-info"
                onClick={loadItems}
                disabled={modalState.loading}
              >
                Refresh
              </button>
            </div>

            {modalState.loading && (
              <div className="d-flex align-items-center gap-2">
                <div
                  className="spinner-border spinner-border-sm"
                  role="status"
                />
                <span>Loading…</span>
              </div>
            )}

            {modalState.error && (
              <div className="alert alert-danger py-2">{modalState.error}</div>
            )}

            {!modalState.loading && !modalState.error && (
              <div
                className="border rounded p-2"
                style={{ maxHeight: 360, overflowY: "auto" }}
              >
                {modalState.items.length === 0 ? (
                  <div className="text-muted small">No items found.</div>
                ) : (
                  modalState.items.map((item, index) => {
                    const itemId = item.value || item.label || index;
                    const isChecked = modalState.selectedItems.includes(itemId);

                    return (
                      <div key={`${itemId}-${index}`} className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id={`${modalType}-${itemId}-${index}`}
                          checked={isChecked}
                          onChange={() => handleToggleItem(itemId)}
                        />
                        <label
                          className="form-check-label d-flex justify-content-between align-items-center"
                          htmlFor={`${modalType}-${itemId}-${index}`}
                        >
                          <span>
                            {item.label || item.name || `Item ${index + 1}`}
                          </span>
                          {item.count !== undefined && (
                            <span className="text-muted small">
                              ({item.count})
                            </span>
                          )}
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {children && <div className="mt-3">{children}</div>}
          </div>

          <div className="modal-footer border-secondary">
            <button className="btn btn-secondary" onClick={handleClose}>
              Close
            </button>
            <button className="btn btn-primary" onClick={handleApply}>
              Apply ({modalState.selectedItems.length})
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
});

BaseModal.displayName = "BaseModal";
export default BaseModal;
