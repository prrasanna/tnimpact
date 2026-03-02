// Authentication and role helpers using localStorage.
const USERS_KEY = "vla_users";
const CURRENT_USER_KEY = "vla_current_user";
const CURRENT_ROLE_KEY = "vla_role";

export const roleToRoute = {
  Admin: "/admin",
  "Warehouse Staff": "/warehouse",
  "Delivery Person": "/delivery",
};

export const getStoredUsers = () => {
  const raw = localStorage.getItem(USERS_KEY);
  return raw ? JSON.parse(raw) : {};
};

export const saveUser = ({ name, email, password, role }) => {
  const users = getStoredUsers();
  users[email] = { name, email, password, role };
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const loginUser = (email, password) => {
  const users = getStoredUsers();
  const user = users[email];

  if (!user || user.password !== password) {
    return null;
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem(CURRENT_ROLE_KEY, user.role);
  return user;
};

export const setCurrentUser = (email) => {
  const users = getStoredUsers();
  const user = users[email];

  if (!user) {
    return null;
  }

  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  localStorage.setItem(CURRENT_ROLE_KEY, user.role);
  return user;
};

export const getCurrentRole = () => localStorage.getItem(CURRENT_ROLE_KEY);

export const getCurrentUser = () => {
  const raw = localStorage.getItem(CURRENT_USER_KEY);
  return raw ? JSON.parse(raw) : null;
};

export const logoutUser = () => {
  localStorage.removeItem(CURRENT_USER_KEY);
  localStorage.removeItem(CURRENT_ROLE_KEY);
};
