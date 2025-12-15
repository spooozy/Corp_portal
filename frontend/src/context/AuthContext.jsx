import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';
import { toast } from 'react-hot-toast';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const { data } = await api.get('/me');
        setUser(data);
      } catch (error) {
        localStorage.removeItem('token');
        setUser(null);
      }
    }
    setLoading(false);
  };

  const login = async (email, password) => {
    try {
      const { data } = await api.post('/login', { email, password });
      localStorage.setItem('token', data.token);
      setUser(data.user);
      await checkUser(); 
      toast.success('Добро пожаловать!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка входа');
      return false;
    }
  };

  const register = async (formData) => {
    try {
      await api.post('/register', formData);
      toast.success('Регистрация успешна! Теперь войдите.');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.error || 'Ошибка регистрации');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    toast.success('Вы вышли из системы');
  };

  return (
    <AuthContext.Provider value={{ user, login, register, logout, loading, checkUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);