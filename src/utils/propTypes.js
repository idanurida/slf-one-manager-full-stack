// FILE: src/utils/propTypes.js
// Reusable PropTypes definitions untuk konsistensi di seluruh aplikasi

import PropTypes from 'prop-types';

// ============================================================================
// COMMON SHAPES
// ============================================================================

/**
 * User object shape
 */
export const UserShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  email: PropTypes.string,
  full_name: PropTypes.string,
  role: PropTypes.string,
  phone_number: PropTypes.string,
  specialization: PropTypes.string,
  avatar_url: PropTypes.string,
  created_at: PropTypes.string,
});

/**
 * Profile object shape (extended user)
 */
export const ProfileShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  full_name: PropTypes.string,
  email: PropTypes.string,
  role: PropTypes.string,
  phone_number: PropTypes.string,
  specialization: PropTypes.string,
  avatar_url: PropTypes.string,
  is_active: PropTypes.bool,
});

/**
 * Project object shape
 */
export const ProjectShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string,
  status: PropTypes.string,
  address: PropTypes.string,
  city: PropTypes.string,
  province: PropTypes.string,
  building_type: PropTypes.string,
  building_area: PropTypes.number,
  floors_count: PropTypes.number,
  request_type: PropTypes.string,
  created_at: PropTypes.string,
  updated_at: PropTypes.string,
  client_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  project_lead_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  admin_lead_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
});

/**
 * Client object shape
 */
export const ClientShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string,
  email: PropTypes.string,
  phone: PropTypes.string,
  address: PropTypes.string,
  company_name: PropTypes.string,
  npwp: PropTypes.string,
});

/**
 * Document object shape
 */
export const DocumentShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  name: PropTypes.string,
  file_url: PropTypes.string,
  file_type: PropTypes.string,
  file_size: PropTypes.number,
  status: PropTypes.string,
  category: PropTypes.string,
  uploaded_by: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  uploaded_at: PropTypes.string,
  verified_by: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  verified_at: PropTypes.string,
});

/**
 * Inspection/Schedule object shape
 */
export const InspectionShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  project_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  inspector_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  scheduled_date: PropTypes.string,
  status: PropTypes.string,
  notes: PropTypes.string,
  location: PropTypes.string,
});

/**
 * Report object shape
 */
export const ReportShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  project_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  inspection_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  title: PropTypes.string,
  status: PropTypes.string,
  file_url: PropTypes.string,
  created_by: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  created_at: PropTypes.string,
});

/**
 * Approval object shape
 */
export const ApprovalShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  status: PropTypes.string,
  approved_by: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  approved_at: PropTypes.string,
  notes: PropTypes.string,
  rejection_reason: PropTypes.string,
});

/**
 * Notification object shape
 */
export const NotificationShape = PropTypes.shape({
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  type: PropTypes.string,
  message: PropTypes.string,
  read: PropTypes.bool,
  created_at: PropTypes.string,
  sender_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  recipient_id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
});

// ============================================================================
// ENUM TYPES
// ============================================================================

/**
 * Valid role values
 */
export const RoleType = PropTypes.oneOf([
  'superadmin',
  'head_consultant',
  'admin_lead',
  'admin_team',
  'project_lead',
  'team_leader',
  'inspector',
  'drafter',
  'client',
]);

/**
 * Valid project status values
 */
export const ProjectStatusType = PropTypes.oneOf([
  'draft',
  'submitted',
  'project_lead_review',
  'inspection_scheduled',
  'inspection_in_progress',
  'inspection_completed',
  'report_draft',
  'report_reviewed',
  'head_consultant_review',
  'completed',
  'cancelled',
]);

/**
 * Valid document status values
 */
export const DocumentStatusType = PropTypes.oneOf([
  'pending',
  'uploaded',
  'verified',
  'rejected',
  'revision_required',
]);

/**
 * Valid approval status values
 */
export const ApprovalStatusType = PropTypes.oneOf([
  'pending',
  'approved',
  'rejected',
  'revision_requested',
]);

/**
 * Valid inspection status values
 */
export const InspectionStatusType = PropTypes.oneOf([
  'scheduled',
  'in_progress',
  'completed',
  'cancelled',
  'rescheduled',
]);

// ============================================================================
// CALLBACK TYPES
// ============================================================================

/**
 * Common callback function types
 */
export const CallbackTypes = {
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
  onSuccess: PropTypes.func,
  onError: PropTypes.func,
  onChange: PropTypes.func,
  onSubmit: PropTypes.func,
  onDelete: PropTypes.func,
  onRefresh: PropTypes.func,
  onApprovalChange: PropTypes.func,
  onStatusChange: PropTypes.func,
};

// ============================================================================
// COMMON PROP SETS
// ============================================================================

/**
 * Props untuk form components
 */
export const FormComponentProps = {
  isEditing: PropTypes.bool,
  isLoading: PropTypes.bool,
  disabled: PropTypes.bool,
  onSave: PropTypes.func,
  onCancel: PropTypes.func,
};

/**
 * Props untuk list/table components
 */
export const ListComponentProps = {
  items: PropTypes.array,
  loading: PropTypes.bool,
  error: PropTypes.string,
  onRefresh: PropTypes.func,
  onItemClick: PropTypes.func,
};

/**
 * Props untuk modal/dialog components
 */
export const ModalComponentProps = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  title: PropTypes.string,
};

/**
 * Props untuk page components dengan auth
 */
export const AuthPageProps = {
  user: UserShape,
  profile: ProfileShape,
  userRole: RoleType,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Create optional version of a shape
 * @param {Object} shape - PropTypes shape
 * @returns {Object} - Optional shape
 */
export const optional = (shape) => {
  return PropTypes.oneOfType([shape, PropTypes.oneOf([null, undefined])]);
};

/**
 * Create array of shape
 * @param {Object} shape - PropTypes shape
 * @returns {Object} - Array of shape
 */
export const arrayOf = (shape) => PropTypes.arrayOf(shape);

export default {
  // Shapes
  UserShape,
  ProfileShape,
  ProjectShape,
  ClientShape,
  DocumentShape,
  InspectionShape,
  ReportShape,
  ApprovalShape,
  NotificationShape,
  
  // Enums
  RoleType,
  ProjectStatusType,
  DocumentStatusType,
  ApprovalStatusType,
  InspectionStatusType,
  
  // Callbacks
  CallbackTypes,
  
  // Prop Sets
  FormComponentProps,
  ListComponentProps,
  ModalComponentProps,
  AuthPageProps,
  
  // Helpers
  optional,
  arrayOf,
};
