export const getToken = () => localStorage.getItem('scorer_token');
export const setToken = (token: string) => localStorage.setItem('scorer_token', token);
export const removeToken = () => localStorage.removeItem('scorer_token');
export const isAuthenticated = () => !!getToken();
