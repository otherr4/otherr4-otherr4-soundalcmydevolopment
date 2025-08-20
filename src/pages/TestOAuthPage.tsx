import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const TestOAuthPage = () => {
  const [authUrl, setAuthUrl] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string>(axios.defaults.baseURL || 'Not configured');
  const [backendPort, setBackendPort] = useState<string | null>(sessionStorage.getItem('backend_port') || null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  
  useEffect(() => {
    fetchAuthUrl();
  }, []);
  
  const fetchAuthUrl = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Log our connection attempt
      console.log('Fetching auth URL from:', `${axios.defaults.baseURL}/api/auth/google/url`);
      
      const response = await axios.get('/api/auth/google/url');
      console.log('Auth URL response:', response.data);
      
      if (response.data && response.data.url) {
        setAuthUrl(response.data.url);
        
        // Store the working backend port if provided
        if (response.data.backendPort) {
          sessionStorage.setItem('backend_port', response.data.backendPort);
          setBackendPort(response.data.backendPort);
          console.log(`Saved working backend port: ${response.data.backendPort}`);
        }
      } else {
        setError('Invalid response format from server');
      }
    } catch (err) {
      console.error('Error fetching Google auth URL:', err);
      setError(`Failed to fetch auth URL: ${err instanceof Error ? err.message : 'Unknown error'}`);
      toast.error('Failed to connect to authentication server');
    } finally {
      setLoading(false);
    }
  };
  
  const handleLoginWithGoogle = () => {
    if (!authUrl) {
      toast.error('Auth URL not available');
      return;
    }
    
    // Open Google OAuth in a popup window
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2.5;
    
    const popup = window.open(
      authUrl,
      'googleLogin',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Set up message listener for the OAuth callback
    const messageHandler = (event: MessageEvent) => {
      console.log('Received message:', event);
      
      if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
        // Handle successful authentication
        toast.success('Successfully signed in with Google!');
        console.log('Google auth data:', event.data);
        
        if (popup) popup.close();
        
        // Here you would typically store the user data and redirect
        localStorage.setItem('user', JSON.stringify(event.data.user));
        window.location.href = '/dashboard';
      } else if (event.data.type === 'GOOGLE_AUTH_ERROR') {
        // Handle authentication error
        toast.error('Failed to sign in with Google');
        console.error('Google auth error:', event.data.error);
        
        if (popup) popup.close();
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Set a timeout to remove the listener if the popup is closed without completing auth
    const checkPopupClosed = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(checkPopupClosed);
        window.removeEventListener('message', messageHandler);
        console.log('Popup closed, removed message listener');
      }
    }, 1000);
  };
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h1 className="text-2xl font-bold mb-6">Test OAuth Connection</h1>
        
        <div className="mb-6">
          <h2 className="text-lg font-semibold mb-2">Current API Configuration</h2>
          <div className="bg-gray-50 p-3 rounded border">
            <p><strong>Base URL:</strong> {apiUrl}</p>
            {backendPort && <p><strong>Detected Backend Port:</strong> {backendPort}</p>}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-6">
            <p className="font-semibold">Error</p>
            <p className="text-sm mt-1">{error}</p>
          </div>
        )}
        
        <div className="space-y-4">
          <button
            onClick={fetchAuthUrl}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Refresh Auth URL'}
          </button>
          
          <button
            onClick={handleLoginWithGoogle}
            disabled={!authUrl || loading}
            className="w-full bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-50 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Sign in with Google
          </button>
        </div>
        
        {authUrl && (
          <div className="mt-6">
            <h3 className="text-sm font-semibold mb-1">Google Auth URL</h3>
            <div className="bg-gray-50 p-2 rounded border text-xs break-all">
              {authUrl}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TestOAuthPage; 