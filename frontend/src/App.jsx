import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Documents from './pages/Documents';
import JoinPage from './pages/JoinPage';
import UserProfile from './pages/UserProfile';
import TeamProfile from './pages/TeamProfile';
import OrgProfile from './pages/OrgProfile'; 
import { GoogleOAuthProvider } from '@react-oauth/google';

const GOOGLE_CLIENT_ID = "";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/profile" element={<UserProfile />} />
            <Route path="/users/:id" element={<UserProfile />} /> 
            <Route path="/join" element={<JoinPage />} />
            <Route path="/teams/:id" element={<TeamProfile />} />
            <Route path="/organizations/:id" element={<OrgProfile />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
        </GoogleOAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;