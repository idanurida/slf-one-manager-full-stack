// FILE: src/utils/errorHandler.js
// Standardized error handling utility untuk konsistensi di seluruh aplikasi

import { toast } from 'sonner';

// Error types untuk kategorisasi
export const ERROR_TYPES = {
  NETWORK: 'NETWORK_ERROR',
  AUTH: 'AUTH_ERROR',
  VALIDATION: 'VALIDATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  PERMISSION: 'PERMISSION_ERROR',
  SERVER: 'SERVER_ERROR',
  UNKNOWN: 'UNKNOWN_ERROR',
};

// Error messages dalam Bahasa Indonesia
const ERROR_MESSAGES = {
  [ERROR_TYPES.NETWORK]: 'Koneksi jaringan bermasalah. Periksa koneksi internet Anda.',
  [ERROR_TYPES.AUTH]: 'Sesi Anda telah berakhir. Silakan login kembali.',
  [ERROR_TYPES.VALIDATION]: 'Data yang dimasukkan tidak valid.',
  [ERROR_TYPES.NOT_FOUND]: 'Data yang dicari tidak ditemukan.',
  [ERROR_TYPES.PERMISSION]: 'Anda tidak memiliki akses untuk melakukan aksi ini.',
  [ERROR_TYPES.SERVER]: 'Terjadi kesalahan pada server. Coba lagi nanti.',
  [ERROR_TYPES.UNKNOWN]: 'Terjadi kesalahan. Silakan coba lagi.',
};

// HTTP status to error type mapping
const STATUS_TO_ERROR_TYPE = {
  400: ERROR_TYPES.VALIDATION,
  401: ERROR_TYPES.AUTH,
  403: ERROR_TYPES.PERMISSION,
  404: ERROR_TYPES.NOT_FOUND,
  422: ERROR_TYPES.VALIDATION,
  500: ERROR_TYPES.SERVER,
  502: ERROR_TYPES.SERVER,
  503: ERROR_TYPES.SERVER,
};

/**
 * Determine error type from error object
 * @param {Error|Object} error - Error object
 * @returns {string} - Error type
 */
export const getErrorType = (error) => {
  // Network error
  if (error.message === 'Failed to fetch' || error.code === 'ECONNREFUSED') {
    return ERROR_TYPES.NETWORK;
  }

  // Supabase error
  if (error.code) {
    if (error.code === 'PGRST116') return ERROR_TYPES.NOT_FOUND;
    if (error.code === '42501' || error.code === 'PGRST301') return ERROR_TYPES.PERMISSION;
    if (error.code === 'JWT_EXPIRED' || error.code === '401') return ERROR_TYPES.AUTH;
  }

  // HTTP status based
  if (error.status || error.statusCode) {
    const status = error.status || error.statusCode;
    return STATUS_TO_ERROR_TYPE[status] || ERROR_TYPES.UNKNOWN;
  }

  // Response based (axios style)
  if (error.response?.status) {
    return STATUS_TO_ERROR_TYPE[error.response.status] || ERROR_TYPES.UNKNOWN;
  }

  return ERROR_TYPES.UNKNOWN;
};

/**
 * Get user-friendly error message
 * @param {Error|Object} error - Error object
 * @param {string} fallback - Fallback message
 * @returns {string} - User-friendly message
 */
export const getErrorMessage = (error, fallback = null) => {
  // Custom message from API
  if (error.message && !error.message.includes('fetch')) {
    // Check if it's a user-friendly message (not technical)
    const technicalPatterns = ['undefined', 'null', 'TypeError', 'ReferenceError', 'SyntaxError'];
    const isTechnical = technicalPatterns.some(p => error.message.includes(p));
    if (!isTechnical) {
      return error.message;
    }
  }

  // Supabase error message
  if (error.details) {
    return error.details;
  }

  // Response data message
  if (error.response?.data?.message) {
    return error.response.data.message;
  }

  // Fallback to type-based message
  const errorType = getErrorType(error);
  return fallback || ERROR_MESSAGES[errorType] || ERROR_MESSAGES[ERROR_TYPES.UNKNOWN];
};

/**
 * Main error handler - logs and shows toast
 * @param {Error|Object} error - Error object
 * @param {string} context - Context where error occurred (for logging)
 * @param {Object} options - Additional options
 * @param {boolean} options.showToast - Show toast notification (default: true)
 * @param {string} options.fallbackMessage - Custom fallback message
 * @param {Function} options.onAuthError - Callback for auth errors
 * @returns {Object} - { type, message, originalError }
 */
export const handleApiError = (error, context = 'API', options = {}) => {
  const {
    showToast = true,
    fallbackMessage = null,
    onAuthError = null,
  } = options;

  const errorType = getErrorType(error);
  const message = getErrorMessage(error, fallbackMessage);

  // Log error for debugging
  console.error(`[${context}] ${errorType}:`, {
    message,
    originalError: error,
    code: error.code,
    status: error.status || error.response?.status,
  });

  // Show toast notification
  if (showToast) {
    if (errorType === ERROR_TYPES.AUTH) {
      toast.error(message, {
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login',
        },
      });
    } else {
      toast.error(message);
    }
  }

  // Handle auth error callback
  if (errorType === ERROR_TYPES.AUTH && onAuthError) {
    onAuthError(error);
  }

  return {
    type: errorType,
    message,
    originalError: error,
  };
};

/**
 * Async wrapper with error handling
 * @param {Function} asyncFn - Async function to wrap
 * @param {string} context - Context for error logging
 * @param {Object} options - Error handler options
 * @returns {Promise<[data, error]>} - Tuple of [data, error]
 */
export const withErrorHandling = async (asyncFn, context = 'API', options = {}) => {
  try {
    const result = await asyncFn();
    return [result, null];
  } catch (error) {
    const handledError = handleApiError(error, context, options);
    return [null, handledError];
  }
};

/**
 * Create context-specific error handler
 * @param {string} context - Default context
 * @returns {Function} - Configured error handler
 */
export const createErrorHandler = (context) => {
  return (error, options = {}) => handleApiError(error, context, options);
};

// Pre-configured handlers for common contexts
export const handleProjectError = createErrorHandler('Project');
export const handleAuthError = createErrorHandler('Auth');
export const handleDocumentError = createErrorHandler('Document');
export const handleInspectionError = createErrorHandler('Inspection');
export const handleReportError = createErrorHandler('Report');
export const handleUserError = createErrorHandler('User');
export const handleScheduleError = createErrorHandler('Schedule');

/**
 * Form validation error handler
 * @param {Object} errors - Validation errors object
 * @param {Object} fieldLabels - Map of field names to labels
 */
export const handleValidationErrors = (errors, fieldLabels = {}) => {
  const errorMessages = Object.entries(errors)
    .map(([field, error]) => {
      const label = fieldLabels[field] || field;
      const message = typeof error === 'string' ? error : error.message || 'tidak valid';
      return `${label}: ${message}`;
    })
    .join('\n');

  toast.error('Validasi gagal', {
    description: errorMessages,
  });

  return errors;
};

/**
 * Supabase specific error handler
 * @param {Object} supabaseError - Supabase error object
 * @param {string} context - Context for logging
 */
export const handleSupabaseError = (supabaseError, context = 'Supabase') => {
  if (!supabaseError) return null;

  // Map Supabase specific errors
  const supabaseErrorMap = {
    'PGRST116': 'Data tidak ditemukan',
    '23505': 'Data sudah ada (duplikat)',
    '23503': 'Data terkait tidak ditemukan',
    '42501': 'Tidak memiliki akses',
    '22P02': 'Format data tidak valid',
  };

  const customMessage = supabaseErrorMap[supabaseError.code];
  
  return handleApiError(
    { ...supabaseError, message: customMessage || supabaseError.message },
    context
  );
};

export default {
  ERROR_TYPES,
  getErrorType,
  getErrorMessage,
  handleApiError,
  withErrorHandling,
  createErrorHandler,
  handleValidationErrors,
  handleSupabaseError,
  // Pre-configured handlers
  handleProjectError,
  handleAuthError,
  handleDocumentError,
  handleInspectionError,
  handleReportError,
  handleUserError,
  handleScheduleError,
};
