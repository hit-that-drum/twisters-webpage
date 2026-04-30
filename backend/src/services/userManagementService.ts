/**
 * Admin user-management facade. Implementation is split across
 * ./admin/ — userListService (pending/all-users reads),
 * userLifecycleService (approve, decline, delete user, clear profile
 * image), and userMutationService (edit user fields). This facade
 * preserves the named-export surface that authService already imports
 * from, so the auth controller chain doesn't need to change.
 */
export { getAdminUsers, getPendingUsers } from './admin/userListService.js';
export {
  approveUser,
  declineUser,
  deleteUser,
  deleteUserProfileImage,
} from './admin/userLifecycleService.js';
export { updateUser } from './admin/userMutationService.js';
