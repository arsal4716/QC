import React, { memo, useCallback, useMemo } from "react";
import PropTypes from "prop-types";
import { ChevronLeft, ChevronRight, MoreHorizontal } from "lucide-react";

const PaginationButton = memo(({ 
  children, 
  onClick, 
  disabled, 
  active, 
  className = "", 
  ...props 
}) => (
  <button
    {...props}
    onClick={onClick}
    disabled={disabled}
    className={`btn btn-sm border-0 ${active ? "bg-primary text-white" : "btn-outline-light text-white"} ${disabled ? "disabled opacity-50" : ""} ${className}`}
    type="button"
    style={{ 
      minWidth: '2rem', 
      margin: '0 2px',
      backgroundColor: active ? "#0d6efd" : "transparent",
      border: "1px solid #2d3748 !important"
    }}
  >
    {children}
  </button>
));
PaginationButton.displayName = "PaginationButton";

const Pagination = memo(({ 
  currentPage, 
  totalPages, 
  onPageChange, 
  loading,
  pageSize = 25,
  totalCount = 0,
  showPageSize = true 
}) => {
  const pageNumbers = useMemo(() => {
    if (totalPages <= 1) return [];
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const pages = [];
    if (currentPage <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", totalPages);
    } else if (currentPage >= totalPages - 3) {
      pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages);
    } else {
      pages.push(1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  const handlePageChange = useCallback((page) => {
    if (!loading && page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  }, [currentPage, totalPages, onPageChange, loading]);

  const startItem = useMemo(() => (currentPage - 1) * pageSize + 1, [currentPage, pageSize]);
  const endItem = useMemo(() => Math.min(currentPage * pageSize, totalCount), [currentPage, pageSize, totalCount]);

  if (totalPages <= 1) return null;

  return (
    <div className="d-flex justify-content-between align-items-center p-2">
      {showPageSize && totalCount > 0 && (
        <div className="text-white" style={{ fontSize: "12px" }}>
          Showing {startItem}-{endItem} of {totalCount.toLocaleString()} items
        </div>
      )}
      
      <div className="d-flex gap-1 align-items-center">
        <PaginationButton
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1 || loading}
          aria-label="Previous page"
        >
          <ChevronLeft size={14} />
        </PaginationButton>

        {pageNumbers.map((page, index) => (
          <PaginationButton
            key={index}
            onClick={() => typeof page === "number" && handlePageChange(page)}
            disabled={typeof page !== "number" || loading}
            active={page === currentPage}
            className={typeof page !== "number" ? "px-2" : ""}
            aria-label={typeof page === "number" ? `Page ${page}` : "More pages"}
            aria-current={page === currentPage ? "page" : undefined}
          >
            {typeof page === "number" ? page : <MoreHorizontal size={14} />}
          </PaginationButton>
        ))}

        <PaginationButton
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages || loading}
          aria-label="Next page"
        >
          <ChevronRight size={14} />
        </PaginationButton>
      </div>
    </div>
  );
});

Pagination.propTypes = {
  currentPage: PropTypes.number.isRequired,
  totalPages: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  pageSize: PropTypes.number,
  totalCount: PropTypes.number,
  showPageSize: PropTypes.bool,
};

Pagination.displayName = "Pagination";
export default Pagination;