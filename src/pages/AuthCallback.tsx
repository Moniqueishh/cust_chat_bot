import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { decodeBase64Token, isTokenExpired } from '../utils/auth';
import { Loader2, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export default function AuthCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const token = searchParams.get('token');
    if (!token) {
      setError('No token provided');
      return;
    }

    const payload = decodeBase64Token(token);
    if (!payload) {
      setError('Invalid token format');
      return;
    }

    if (isTokenExpired(payload.exp)) {
      setIsExpired(true);
      return;
    }

    // Store to localStorage
    localStorage.setItem('jt_email', payload.email);
    localStorage.setItem('jt_tokenPayload', JSON.stringify(payload));
    
    // Redirect to projects
    navigate('/projects');
  }, [searchParams, navigate]);

  if (isExpired) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-3xl shadow-xl border border-teal-50 max-w-md w-full text-center space-y-6"
        >
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Link Expired</h1>
          <p className="text-slate-600">
            This magic link has expired for your security. Please request a new one.
          </p>
          <Link 
            to="/" 
            className="block w-full py-4 bg-teal-600 text-white rounded-2xl font-bold shadow-lg shadow-teal-600/20 active:scale-95 transition-transform"
          >
            Back to Login
          </Link>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="bg-white p-8 rounded-3xl shadow-xl border border-teal-50 max-w-md w-full text-center space-y-6">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="text-red-500" size={32} />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Authentication Error</h1>
          <p className="text-slate-600">{error}</p>
          <Link to="/" className="block w-full py-4 bg-teal-600 text-white rounded-2xl font-bold">
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
      <Loader2 className="text-teal-600 animate-spin mb-4" size={48} />
      <p className="text-slate-600 font-medium">Verifying your access...</p>
    </div>
  );
}
