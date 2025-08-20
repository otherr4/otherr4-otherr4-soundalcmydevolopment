import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, getCountFromServer } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { 
  Users, 
  UserCheck, 
  Clock, 
  Music, 
  Globe, 
  BarChart,
  ArrowUp,
  ArrowDown,
  ArrowRight,
  Info
} from 'lucide-react';
import { API_URL } from '../../config/constants';

// Ultra-optimized Google Drive URL converter
const getGoogleDriveDirectUrl = (url: string): string => {
  if (!url) return '';
  
  if (url.includes('drive.google.com')) {
    let fileId = '';
    
    const fileIdMatch = url.match(/\/file\/d\/([^/]+)/);
    if (fileIdMatch) {
      fileId = fileIdMatch[1];
    } else {
      const ucMatch = url.match(/[?&]id=([^&]+)/);
      if (ucMatch) {
        fileId = ucMatch[1];
      } else {
        const openMatch = url.match(/\bid=([^&]+)/);
        if (openMatch) {
          fileId = openMatch[1];
        }
      }
    }

    if (fileId) {
      // Use optimized direct URL without timestamp for better caching
      return `https://images.weserv.nl/?url=drive.google.com/uc?export=view%26id=${fileId}`;
    }
  }
  
  return url;
};

// Ultra-fast profile image URL resolver with caching
const getProfileImageUrl = (path?: string): string => {
  if (!path) return '/default-avatar.svg';
  
  if (path.includes('drive.google.com')) {
    return getGoogleDriveDirectUrl(path);
  } else if (path.startsWith('/')) {
    return path;
  } else if (path.startsWith('http')) {
    return path;
  } else {
    return `${API_URL}${path}`;
  }
};

function formatJoinDate(createdAt: any): string {
  if (!createdAt) return 'Not available';
  let dateObj: Date;
  // Firestore Timestamp
  if (createdAt.seconds && createdAt.nanoseconds) {
    dateObj = new Date(createdAt.seconds * 1000);
  } else if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    dateObj = new Date(createdAt);
  } else if (createdAt instanceof Date) {
    dateObj = createdAt;
  } else {
    return 'Not available';
  }
  if (isNaN(dateObj.getTime())) return 'Not available';
  return dateObj.toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

// Add a country code to name mapping (add more as needed)
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States',
  LK: 'Sri Lanka',
  IN: 'India',
  GB: 'United Kingdom',
  CA: 'Canada',
  AU: 'Australia',
  // ... add more as needed
};
function getCountryDisplay(countryCode: string): string {
  if (!countryCode) return 'Unknown';
  const code = countryCode.toUpperCase();
  if (/^[A-Z]{2}$/.test(code)) {
    const flag = String.fromCodePoint(...[...code].map(c => 0x1f1e6 + c.charCodeAt(0) - 65));
    const name = COUNTRY_NAMES[code] || code;
    return `${flag} ${name}`;
  }
  return countryCode;
}

const DashboardPage: React.FC = () => {
  const [stats, setStats] = useState({
    totalMusicians: 0,
    verifiedMusicians: 0,
    pendingVerifications: 0,
    recentRegistrations: [] as any[],
    countriesRepresented: 0,
    instrumentBreakdown: [] as { name: string; count: number }[],
  });
  
  const [isLoading, setIsLoading] = useState(true);
  // Add state for the time range
  const [recentRange, setRecentRange] = useState<'7' | '14' | '30' | 'all'>('7');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');

  // Fetch stats on mount and when recentRange changes
  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Total musicians
        const totalSnapshot = await getCountFromServer(collection(db, 'users'));
        const totalMusicians = totalSnapshot.data().count;
        
        // Verified musicians
        const verifiedSnapshot = await getCountFromServer(
          query(collection(db, 'users'), where('isVerified', '==', true))
        );
        const verifiedMusicians = verifiedSnapshot.data().count;
        
        // Pending verifications
        const pendingSnapshot = await getCountFromServer(
          query(collection(db, 'users'), where('verificationStatus', '==', 'pending'))
        );
        const pendingVerifications = pendingSnapshot.data().count;
        
        // Recent registrations
        const now = Date.now();
        let minDate: Date | null = null;
        if (recentRange !== 'all') {
          minDate = new Date(now - parseInt(recentRange) * 24 * 60 * 60 * 1000);
        }
        const recentQuery = minDate
          ? query(collection(db, 'users'), where('createdAt', '>=', minDate))
          : query(collection(db, 'users'));
        const recentDocs = await getDocs(recentQuery);
        let recentRegistrations: any[] = recentDocs.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        // Sort by join date using sortOrder
        recentRegistrations = recentRegistrations.sort((a, b) => {
          const getTime = (d: any) => {
            if (!d) return 0;
            if (d.seconds && d.nanoseconds) return d.seconds * 1000;
            if (typeof d === 'string' || typeof d === 'number') return new Date(d).getTime();
            if (d instanceof Date) return d.getTime();
            return 0;
          };
          return sortOrder === 'desc'
            ? getTime(b.createdAt) - getTime(a.createdAt)
            : getTime(a.createdAt) - getTime(b.createdAt);
        });
        
        // Get unique countries count
        const usersQuery = query(collection(db, 'users'));
        const userDocs = await getDocs(usersQuery);
        const countries = new Set();
        const instruments: Record<string, number> = {};
        
        userDocs.forEach(doc => {
          const data = doc.data();
          if (data.country) {
            countries.add(data.country);
          }
          
          if (data.instrumentType) {
            instruments[data.instrumentType] = (instruments[data.instrumentType] || 0) + 1;
          }
        });
        
        // Convert instruments to sorted array
        const instrumentBreakdown = Object.entries(instruments)
          .map(([name, count]) => ({ name, count: count as number }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);
        
        setStats({
          totalMusicians,
          verifiedMusicians,
          pendingVerifications,
          recentRegistrations,
          countriesRepresented: countries.size,
          instrumentBreakdown,
        });
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchStats();
    // eslint-disable-next-line
  }, [recentRange, sortOrder]);

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Dashboard Overview</h1>
      
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-dark-700 rounded-lg p-6 animate-pulse h-32"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className="bg-dark-700 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center mb-3">
                <div className="bg-primary-500/20 p-3 rounded-lg mr-3">
                  <Users className="h-6 w-6 text-primary-400" />
                </div>
                <span className="text-gray-400 text-sm">Total Musicians</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold">{stats.totalMusicians}</div>
                <div className="text-green-500 flex items-center text-sm">
                  <ArrowUp size={14} className="mr-1" />
                  8%
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
              className="bg-dark-700 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center mb-3">
                <div className="bg-green-500/20 p-3 rounded-lg mr-3">
                  <UserCheck className="h-6 w-6 text-green-400" />
                </div>
                <span className="text-gray-400 text-sm">Verified Musicians</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold">{stats.verifiedMusicians}</div>
                <div className="text-green-500 flex items-center text-sm">
                  <ArrowUp size={14} className="mr-1" />
                  12%
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className="bg-dark-700 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center mb-3">
                <div className="bg-yellow-500/20 p-3 rounded-lg mr-3">
                  <Clock className="h-6 w-6 text-yellow-400" />
                </div>
                <span className="text-gray-400 text-sm">Pending Verifications</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold">{stats.pendingVerifications}</div>
                <div className="text-yellow-500 flex items-center text-sm">
                  <ArrowRight size={14} className="mr-1" />
                  Stable
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.3 }}
              className="bg-dark-700 rounded-lg p-6 shadow-md"
            >
              <div className="flex items-center mb-3">
                <div className="bg-blue-500/20 p-3 rounded-lg mr-3">
                  <Globe className="h-6 w-6 text-blue-400" />
                </div>
                <span className="text-gray-400 text-sm">Countries Represented</span>
              </div>
              <div className="flex items-end justify-between">
                <div className="text-3xl font-bold">{stats.countriesRepresented}</div>
                <div className="text-green-500 flex items-center text-sm">
                  <ArrowUp size={14} className="mr-1" />
                  3
                </div>
              </div>
            </motion.div>
          </div>
          
          {/* Charts and Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Musicians */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.4 }}
              className="bg-dark-700 rounded-lg shadow-md overflow-hidden"
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-dark-600">
                <h2 className="font-semibold">Recent Registrations</h2>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">Show:</span>
                  <select
                    className="bg-dark-700 border border-dark-600 rounded px-2 py-1 text-xs text-gray-200"
                    value={recentRange}
                    onChange={e => setRecentRange(e.target.value as any)}
                  >
                    <option value="7">Last 7 days</option>
                    <option value="14">Last 14 days</option>
                    <option value="30">Last 30 days</option>
                    <option value="all">All Time</option>
                  </select>
                  <span className="text-xs text-gray-400 ml-4">Sort By:</span>
                  <select
                    className="bg-dark-700 border border-dark-600 rounded px-2 py-1 text-xs text-gray-200"
                    value={sortOrder}
                    onChange={e => setSortOrder(e.target.value as any)}
                  >
                    <option value="desc">Newest First</option>
                    <option value="asc">Oldest First</option>
                  </select>
                </div>
              </div>
              
              <div className="max-h-96 overflow-y-auto">
                {stats.recentRegistrations.length > 0 ? (
                  <table className="w-full">
                    <thead className="bg-dark-800 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 tracking-wider">Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 tracking-wider">Country</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 tracking-wider">Join Date</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 tracking-wider">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600">
                      {stats.recentRegistrations.map((user: any) => (
                        <tr key={user.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="h-8 w-8 rounded-full bg-dark-600 overflow-hidden flex-shrink-0">
                                {user.profileImagePath ? (
                                  <img 
                                    src={getProfileImageUrl(user.profileImagePath)} 
                                    alt="" 
                                    className="h-8 w-8 object-cover"
                                    onError={(e) => {
                                      (e.currentTarget as HTMLImageElement).src = '/default-avatar.svg';
                                    }}
                                  />
                                ) : (
                                  <div className="h-8 w-8 flex items-center justify-center">
                                    <Users size={14} className="text-gray-400" />
                                  </div>
                                )}
                              </div>
                              <div className="ml-3">
                                <div className="text-sm font-medium">{user.fullName}</div>
                                <div className="text-xs text-gray-400">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{getCountryDisplay(user.country)}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm">{formatJoinDate(user.createdAt)}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                              user.isVerified 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {user.isVerified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="p-6 text-center text-gray-400">No recent registrations</div>
                )}
              </div>
            </motion.div>

            {/* Instrument Breakdown */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.5 }}
              className="bg-dark-700 rounded-lg shadow-md"
            >
              <div className="px-6 py-4 border-b border-dark-600">
                <h2 className="font-semibold">Instrument Breakdown</h2>
              </div>
              
              <div className="p-6">
                {stats.instrumentBreakdown.length > 0 ? (
                  <div className="space-y-4">
                    {stats.instrumentBreakdown.map((item) => (
                      <div key={item.name} className="space-y-2">
                        <div className="flex justify-between">
                          <span className="text-sm capitalize">{item.name}</span>
                          <span className="text-sm text-gray-400">{item.count}</span>
                        </div>
                        <div className="w-full bg-dark-600 rounded-full h-2.5">
                          <div 
                            className="bg-primary-500 h-2.5 rounded-full" 
                            style={{ width: `${(item.count / stats.totalMusicians) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-400">No instrument data available</div>
                )}
              </div>
            </motion.div>
          </div>
          
          {/* Admin Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.6 }}
            className="mt-8 bg-dark-700 rounded-lg p-6 shadow-md"
          >
            <div className="flex items-center mb-4">
              <Info size={18} className="text-primary-400 mr-2" />
              <h2 className="font-semibold">Admin Quick Actions</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <a 
                href="/admin/users" 
                className="bg-dark-600 hover:bg-dark-500 transition-colors p-4 rounded-lg flex items-center"
              >
                <UserCheck size={18} className="text-green-400 mr-3" />
                <span>Verify Musicians</span>
                {stats.pendingVerifications > 0 && (
                  <span className="ml-auto bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {stats.pendingVerifications}
                  </span>
                )}
              </a>
              
              <a 
                href="/admin/database" 
                className="bg-dark-600 hover:bg-dark-500 transition-colors p-4 rounded-lg flex items-center"
              >
                <BarChart size={18} className="text-blue-400 mr-3" />
                <span>Database Management</span>
              </a>
              
              <a 
                href="#" 
                className="bg-dark-600 hover:bg-dark-500 transition-colors p-4 rounded-lg flex items-center"
              >
                <Music size={18} className="text-purple-400 mr-3" />
                <span>Manage Projects</span>
              </a>
            </div>
          </motion.div>
        </>
      )}
    </div>
  );
};

export default DashboardPage;