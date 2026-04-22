import React from "react";

export function PaginationRow({ pages, currentPage, selectPage }) {
  if (pages <= 1) {
    return null;
  }

  const pagesToShow = 7;
  const firstPageToShow = currentPage - Math.floor(pagesToShow / 2);
  const firstPage = firstPageToShow < 0 ? 0 : firstPageToShow;
  const lastPageToShow = currentPage + Math.floor(pagesToShow / 2);
  const lastPage = lastPageToShow > pages ? pages : firstPage + pagesToShow;
  const displayArray = [...Array(pages).keys()].slice(firstPage, lastPage);

  const buttonClass = "btn-secondary min-w-[2.75rem] px-3 py-2";
  const activeClass = "min-w-[2.75rem] rounded-2xl border border-brand-400/40 bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-glow";

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2">
      {pages > pagesToShow && (
        <>
          <button type="button" className={buttonClass} disabled={currentPage === 0} onClick={() => selectPage(0)}>
            «
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={currentPage === 0}
            onClick={() => selectPage(currentPage - 1)}
          >
            ‹
          </button>
        </>
      )}

      {displayArray.map((page) => (
        <button
          key={page}
          type="button"
          className={currentPage === page ? activeClass : buttonClass}
          disabled={currentPage === page}
          onClick={() => selectPage(page)}
        >
          {page + 1}
        </button>
      ))}

      {pages > pagesToShow && (
        <>
          <button
            type="button"
            className={buttonClass}
            disabled={currentPage === pages - 1}
            onClick={() => selectPage(currentPage + 1)}
          >
            ›
          </button>
          <button
            type="button"
            className={buttonClass}
            disabled={currentPage === pages - 1}
            onClick={() => selectPage(pages - 1)}
          >
            »
          </button>
        </>
      )}
    </div>
  );
}
