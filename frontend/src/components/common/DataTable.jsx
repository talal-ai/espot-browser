import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';

const DataTable = ({ columns, data, onRowClick, loading = false, compact = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const cellPadding = compact ? 'px-4 py-2.5' : 'px-6 py-4';
  const cellText = compact ? 'text-sm' : 'text-sm';
  const headerText = compact ? 'text-xs' : 'text-xs';
  const searchSize = compact ? 'h-9 text-sm' : '';
  const resultText = compact ? 'text-xs' : 'text-sm';

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const filteredAndSortedData = useMemo(() => {
    let filtered = data.filter(row =>
      Object.values(row).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return filtered;
  }, [data, searchTerm, sortConfig]);

  return (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      {/* Search */}
      <div className="relative max-w-sm">
        <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 ${compact ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
        <Input
          type="text"
          placeholder="Search..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`pl-9 backdrop-blur-md bg-white/50 dark:bg-gray-800/50 ${searchSize}`}
          disabled={loading}
        />
      </div>

      {/* Table */}
      <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-900/70 border border-gray-200 dark:border-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`${cellPadding} text-left ${headerText} font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100/50 dark:hover:bg-gray-700/50 transition-colors`}
                    onClick={() => !loading && column.sortable && handleSort(column.key)}
                  >
                    <div className="flex items-center gap-1.5">
                      {column.label}
                      {column.sortable && sortConfig.key === column.key && (
                        sortConfig.direction === 'asc' ? (
                          <ChevronUp className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                        ) : (
                          <ChevronDown className={compact ? 'w-3.5 h-3.5' : 'w-4 h-4'} />
                        )
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i}>
                    {columns.map((col, j) => (
                      <td key={j} className={cellPadding}>
                        <Skeleton className={`w-full ${compact ? 'h-4.5' : 'h-5'}`} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                filteredAndSortedData.map((row, idx) => (
                  <tr
                    key={idx}
                    onClick={() => onRowClick && onRowClick(row)}
                    className={`transition-colors duration-150 ${onRowClick ? 'cursor-pointer' : 'cursor-default'} hover:bg-gray-100/90 dark:hover:bg-gray-800/70`}
                  >
                    {columns.map((column) => (
                      <td key={column.key} className={`${cellPadding} ${cellText} text-gray-900 dark:text-gray-100`}>
                        {column.render ? column.render(row[column.key], row) : row[column.key]}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results count */}
      {!loading && (
        <div className={`${resultText} text-gray-600 dark:text-gray-400`}>
          Showing {filteredAndSortedData.length} of {data.length} results
        </div>
      )}
    </div>
  );
};

export default DataTable;