import { useEffect, useMemo, useState } from "react";
import useDebouncedValue from "../../hooks/useDebouncedValue";
export default function BaseSelectModal({ id, title, fetcher, onApply }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(() => new Set());
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [search, setSearch] = useState("");
  const debounced = useDebouncedValue(search, 300);

  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;

    const onShown = () => loadList();
    el.addEventListener("shown.bs.modal", onShown);
    return () => el.removeEventListener("shown.bs.modal", onShown);
  }, [id]);

  useEffect(() => {
    const el = document.getElementById(id);
    if (!el) return;
    const isVisible = el.classList.contains("show");
    if (isVisible) loadList();
  }, [debounced]);

  const loadList = async () => {
    try {
      setErr("");
      setLoading(true);
      const data = await fetcher({ search: debounced, page: 1, limit: 2000 });
      setItems(data);
    } catch (e) {
      setErr(e.message || "Failed to load list");
    } finally {
      setLoading(false);
    }
  };

  const toggle = (slug) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const clearAll = () => setSelected(new Set());

  const normalizedItems = useMemo(
    () =>
      items.map((it) => ({
        slug: it.slug || it.value || it.name,
        label: it.name || it.value || it.slug,
        count: typeof it.count === "number" ? it.count : undefined,
      })),
    [items]
  );

  return (
    <div className="modal fade" id={id} tabIndex="-1" aria-hidden="true">
      <div className="modal-dialog modal-dialog-scrollable modal-lg">
        <div
          className="modal-content"
          style={{ background: "#0b1324", color: "#fff" }}
        >
          <div className="modal-header border-secondary">
            <h5 className="modal-title">{title}</h5>
            <button
              className="btn-close btn-close-white"
              data-bs-dismiss="modal"
              aria-label="Close"
            />
          </div>

          <div className="modal-body">
            <div className="d-flex gap-2 mb-3">
              <input
                className="form-control form-control-sm"
                placeholder={`Search ${title.toLowerCase()}…`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label={`Search ${title}`}
              />
              <button
                className="btn btn-sm btn-outline-warning"
                onClick={clearAll}
              >
                Clear
              </button>
              <button
                className="btn btn-sm btn-outline-info"
                onClick={loadList}
              >
                Refresh
              </button>
            </div>

            {loading && (
              <div className="d-flex align-items-center gap-2">
                <div
                  className="spinner-border spinner-border-sm"
                  role="status"
                />
                <span>Loading…</span>
              </div>
            )}
            {err && <div className="alert alert-danger py-2">{err}</div>}

            {!loading && !err && (
              <div
                className="border rounded p-2"
                style={{ maxHeight: 360, overflowY: "auto" }}
              >
                {normalizedItems.length === 0 ? (
                  <div className="text-muted small">No items found.</div>
                ) : (
                  normalizedItems.map(({ slug, label, count }) => (
                    <div className="form-check" key={slug}>
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id={`${id}-${slug}`}
                        checked={selected.has(slug)}
                        onChange={() => toggle(slug)}
                      />
                      <label
                        className="form-check-label"
                        htmlFor={`${id}-${slug}`}
                      >
                        {label}{" "}
                        {count !== undefined && (
                          <span className="text-muted">({count})</span>
                        )}
                      </label>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="modal-footer border-secondary">
            <button className="btn btn-secondary" data-bs-dismiss="modal">
              Close
            </button>
            <button
              className="btn btn-primary"
              data-bs-dismiss="modal"
              onClick={() => onApply?.(Array.from(selected))}
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
