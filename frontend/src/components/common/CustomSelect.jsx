import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({
  value,
  onChange,
  options = [],
  placeholder = 'Select an option',
  searchable = false,
  className = '',
  id,
  disabled = false,
  icon = null,
  size = 'md', // 'sm', 'md', 'lg'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const wrapperRef = useRef(null);
  const searchInputRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

  const handleMouseEnter = () => {
    if (disabled) return;
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    if (disabled) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setIsOpen(false);
      setSearchQuery('');
    }, 240);
  };

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Normalize options into { value, label, badge, icon, isHeader } objects
  const normalizedOptions = options.map((opt, idx) => {
    if (typeof opt === 'string' || typeof opt === 'number') {
      return { value: opt, label: String(opt) };
    }
    if (opt.isHeader || opt.type === 'header') {
      return {
        isHeader: true,
        label: opt.label || opt.name,
        key: `header-${idx}-${opt.label || opt.name}`,
      };
    }
    return {
      value: opt.value ?? opt.id ?? opt.name,
      label: opt.label ?? opt.name ?? opt.title ?? String(opt.value),
      badge: opt.badge,
      icon: opt.icon,
      disabled: opt.disabled,
      onDelete: opt.onDelete,
    };
  });

  const selectedOption = normalizedOptions.find(
    (opt) => !opt.isHeader && String(opt.value) === String(value)
  );

  // Filter options if searchable
  const filteredOptions = normalizedOptions.filter((opt) => {
    if (opt.isHeader) return !searchQuery;
    if (!searchQuery) return true;
    return opt.label.toLowerCase().includes(searchQuery.toLowerCase());
  });

  // Handle outside click & Escape key
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        setSearchQuery('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && searchInputRef.current) {
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);
    }
  }, [isOpen, searchable]);

  const handleSelect = (optVal, e) => {
    e.stopPropagation();
    if (disabled) return;
    onChange(optVal);
    setIsOpen(false);
    setSearchQuery('');
  };

  const isSearchActive = searchable && normalizedOptions.length > 5;

  return (
    <div
      ref={wrapperRef}
      className={`custom-select-container ${size} ${className} ${disabled ? 'disabled' : ''} ${isOpen ? 'is-open' : ''}`}
      id={id ? `${id}-container` : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Select Trigger */}
      <button
        type="button"
        className="custom-select-trigger"
        onClick={() => !disabled && setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <div className="custom-select-trigger-content">
          {icon && <span className="custom-select-icon">{icon}</span>}
          {selectedOption ? (
            <span className="custom-select-value">
              {selectedOption.icon && <span className="opt-icon">{selectedOption.icon}</span>}
              {selectedOption.label}
              {selectedOption.badge && (
                <span className="custom-select-badge">{selectedOption.badge}</span>
              )}
            </span>
          ) : (
            <span className="custom-select-placeholder">{placeholder}</span>
          )}
        </div>
        <span className={`custom-select-arrow ${isOpen ? 'arrow-up' : ''}`}>
          <i className="bi bi-chevron-down"></i>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="custom-select-dropdown" role="listbox">
          {isSearchActive && (
            <div className="custom-select-search-box">
              <i className="bi bi-search search-icon"></i>
              <input
                ref={searchInputRef}
                type="text"
                className="custom-select-search-input"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClick={(e) => e.stopPropagation()}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="search-clear-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                  }}
                >
                  <i className="bi bi-x"></i>
                </button>
              )}
            </div>
          )}

          <div className="custom-select-options-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt, idx) => {
                if (opt.isHeader) {
                  return (
                    <div key={opt.key || `hdr-${idx}`} className="custom-select-group-header">
                      {opt.label}
                    </div>
                  );
                }
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={String(opt.value)}
                    className={`custom-select-option ${isSelected ? 'selected' : ''} ${opt.disabled ? 'disabled' : ''}`}
                    role="option"
                    aria-selected={isSelected}
                    onClick={(e) => !opt.disabled && handleSelect(opt.value, e)}
                  >
                    <div className="custom-select-option-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                      {opt.icon && <span className="opt-icon">{opt.icon}</span>}
                      <span>{opt.label}</span>
                      {opt.badge && (
                        <span className="custom-select-badge">{opt.badge}</span>
                      )}
                    </div>
                    {opt.onDelete && (
                      <button
                        type="button"
                        className="custom-select-delete-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          opt.onDelete(opt.value);
                        }}
                        title={`Delete field '${opt.label}'`}
                        style={{
                          background: 'rgba(239, 68, 68, 0.08)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: '3px 7px',
                          fontSize: '0.82rem',
                          borderRadius: '5px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          marginLeft: '8px',
                          marginRight: isSelected ? '4px' : '0',
                          opacity: 0.9,
                          transition: 'all 0.15s ease',
                          flexShrink: 0,
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#ef4444';
                          e.currentTarget.style.color = '#ffffff';
                          e.currentTarget.style.borderColor = '#ef4444';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(239, 68, 68, 0.08)';
                          e.currentTarget.style.color = '#ef4444';
                          e.currentTarget.style.borderColor = 'rgba(239, 68, 68, 0.25)';
                        }}
                      >
                        <i className="bi bi-trash3" style={{ fontSize: '0.82rem' }}></i>
                      </button>
                    )}
                    {isSelected && (
                      <span className="custom-select-checkmark">
                        <i className="bi bi-check2"></i>
                      </span>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="custom-select-empty">
                <span>No options found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
