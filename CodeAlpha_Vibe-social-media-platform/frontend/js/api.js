// ============================================================
// Vibe — API Client
// Thin wrapper around fetch() for every backend endpoint.
// ============================================================

async function apiRequest(path, { method = 'GET', body = null, isFormData = false, auth = true } = {}) {
  const headers = {};
  if (!isFormData) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = Auth.getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: isFormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  } catch (networkErr) {
    throw new Error('Cannot reach the server. Please check your connection and try again.');
  }

  let data;
  try {
    data = await res.json();
  } catch {
    data = { success: false, message: 'Unexpected server response.' };
  }

  if (!res.ok) {
    const err = new Error(data.message || 'Something went wrong.');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

const API = {
  // ---- Auth ----
  register(formData) {
    return apiRequest('/auth/register', { method: 'POST', body: formData, isFormData: true, auth: false });
  },
  login(payload) {
    return apiRequest('/auth/login', { method: 'POST', body: payload, auth: false });
  },
  logout() {
    return apiRequest('/auth/logout', { method: 'POST' });
  },
  getMe() {
    return apiRequest('/auth/me');
  },

  // ---- Users ----
  getProfile(username) {
    return apiRequest(`/users/${encodeURIComponent(username)}`);
  },
  updateProfile(formData) {
    return apiRequest('/users/me', { method: 'PUT', body: formData, isFormData: true });
  },
  changePassword(payload) {
    return apiRequest('/users/me/password', { method: 'PUT', body: payload });
  },
  deleteAccount() {
    return apiRequest('/users/me', { method: 'DELETE' });
  },
  searchUsers(term) {
    return apiRequest(`/users/search?q=${encodeURIComponent(term)}`);
  },
  toggleFollow(userId) {
    return apiRequest(`/users/${userId}/follow`, { method: 'POST' });
  },
  getFollowers(userId) {
    return apiRequest(`/users/${userId}/followers`);
  },
  getFollowing(userId) {
    return apiRequest(`/users/${userId}/following`);
  },

  // ---- Posts ----
  getFeed(tab = 'all', page = 1) {
    return apiRequest(`/posts/feed?tab=${tab}&page=${page}&limit=10`);
  },
  getUserPosts(userId, page = 1) {
    return apiRequest(`/posts/user/${userId}?page=${page}&limit=10`);
  },
  getBookmarks(page = 1) {
    return apiRequest(`/posts/bookmarks?page=${page}&limit=10`);
  },
  getTrending() {
    return apiRequest('/posts/trending/hashtags');
  },
  getPost(id) {
    return apiRequest(`/posts/${id}`);
  },
  createPost(formData) {
    return apiRequest('/posts', { method: 'POST', body: formData, isFormData: true });
  },
  updatePost(id, formData) {
    return apiRequest(`/posts/${id}`, { method: 'PUT', body: formData, isFormData: true });
  },
  deletePost(id) {
    return apiRequest(`/posts/${id}`, { method: 'DELETE' });
  },
  toggleLike(postId) {
    return apiRequest(`/posts/${postId}/like`, { method: 'POST' });
  },
  toggleBookmark(postId) {
    return apiRequest(`/posts/${postId}/bookmark`, { method: 'POST' });
  },

  // ---- Comments ----
  getComments(postId) {
    return apiRequest(`/posts/${postId}/comments`);
  },
  addComment(postId, comment) {
    return apiRequest(`/posts/${postId}/comments`, { method: 'POST', body: { comment } });
  },
  deleteComment(id) {
    return apiRequest(`/posts/comments/${id}`, { method: 'DELETE' });
  },

  // ---- Notifications ----
  getNotifications(page = 1) {
    return apiRequest(`/notifications?page=${page}&limit=30`);
  },
  getUnreadCount() {
    return apiRequest('/notifications/unread-count');
  },
  markAllNotificationsRead() {
    return apiRequest('/notifications/read-all', { method: 'PUT' });
  },
  markNotificationRead(id) {
    return apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
  },
};
