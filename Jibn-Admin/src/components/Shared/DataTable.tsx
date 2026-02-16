import { ChevronLeft, ChevronRight } from 'lucide-react';
import './DataTable.css';

interface Column {
  header: string;
  accessor?: string | ((row: any, index: number) => any);
  width?: string;
  render?: (value: any, row?: any, index?: number) => React.ReactNode;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  loading?: boolean;
  pagination?: Pagination;
  onPageChange?: (page: number) => void;
  emptyMessage?: string;
}

const DataTable = ({ 
  columns, 
  data, 
  loading = false,
  pagination,
  onPageChange,
  emptyMessage = 'No data found'
}: DataTableProps) => {
  
  const getCellValue = (row: any, col: Column, rowIndex: number) => {
    if (col.accessor) {
      if (typeof col.accessor === 'function') {
        return col.accessor(row, rowIndex);
      }
      return row[col.accessor];
    }
    return null;
  };

  return (
    <div className="data-table-wrapper">
      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((col, index) => (
                <th key={index} style={{ width: col.width }}>
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="table-loading">
                    <div className="spinner"></div>
                    <span>Loading...</span>
                  </div>
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <div className="table-empty">{emptyMessage}</div>
                </td>
              </tr>
            ) : (
              data.map((row, rowIndex) => (
                <tr key={row._id || row.id || rowIndex}>
                  {columns.map((col, colIndex) => {
                    const cellValue = getCellValue(row, col, rowIndex);
                    return (
                      <td key={colIndex}>
                        {col.render ? col.render(cellValue, row, rowIndex) : cellValue}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.pages > 1 && (
        <div className="table-pagination">
          <span className="pagination-info">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
            {pagination.total} entries
          </span>
          <div className="pagination-controls">
            <button 
              className="pagination-btn"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft size={18} />
            </button>
            {[...Array(pagination.pages)].map((_, i) => (
              <button
                key={i + 1}
                className={`pagination-btn ${pagination.page === i + 1 ? 'active' : ''}`}
                onClick={() => onPageChange?.(i + 1)}
              >
                {i + 1}
              </button>
            )).slice(
              Math.max(0, pagination.page - 3),
              Math.min(pagination.pages, pagination.page + 2)
            )}
            <button 
              className="pagination-btn"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTable;
