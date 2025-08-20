import React, { useMemo } from 'react';
import { MusicVideo } from '../../services/musicVideoService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, LineChart, Line } from 'recharts';

interface AnalyticsDashboardProps {
  videos: MusicVideo[];
}

function toDateString(date: Date) {
  return date.toLocaleDateString();
}

function getLastNDates(n: number) {
  const arr = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    arr.push(toDateString(d));
  }
  return arr;
}

function downloadCSV(rows: any[], filename: string) {
  const csv = [Object.keys(rows[0]).join(','), ...rows.map(r => Object.values(r).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ videos }) => {
  // Memoize all analytics for speed
  const {
    totalVideos,
    totalViews,
    totalLikes,
    avgViews,
    engagementRate,
    topVideo,
    topVideosByViews,
    topVideosByLikes,
    viewsOverTime,
    likesOverTime,
    recentActivity,
    videoTableRows
  } = useMemo(() => {
    const totalVideos = videos.length;
    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (v.likes?.length || 0), 0);
    const avgViews = totalVideos ? Math.round(totalViews / totalVideos) : 0;
    const engagementRate = totalViews ? ((totalLikes / totalViews) * 100).toFixed(1) : '0.0';
    const topVideo = videos.reduce((top, v) => (v.views || 0) > (top?.views || 0) ? v : top, videos[0]);
    const topVideosByViews = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
    const topVideosByLikes = [...videos].sort((a, b) => (b.likes?.length || 0) - (a.likes?.length || 0)).slice(0, 5);

    // Views/Likes over last 30 days
    const last30 = getLastNDates(30);
    const viewsByDate: { [date: string]: number } = {};
    const likesByDate: { [date: string]: number } = {};
    videos.forEach(v => {
      if (v.createdAt?.toDate) {
        const date = toDateString(v.createdAt.toDate());
        viewsByDate[date] = (viewsByDate[date] || 0) + (v.views || 0);
        likesByDate[date] = (likesByDate[date] || 0) + (v.likes?.length || 0);
      }
    });
    const viewsOverTime = last30.map(date => ({ date, views: viewsByDate[date] || 0 }));
    const likesOverTime = last30.map(date => ({ date, likes: likesByDate[date] || 0 }));

    // Recent activity (last 7/30 days)
    const last7 = getLastNDates(7);
    const recentActivity = {
      videos: videos.filter(v => v.createdAt?.toDate && last7.includes(toDateString(v.createdAt.toDate()))).length,
      views: viewsOverTime.slice(-7).reduce((sum, d) => sum + d.views, 0),
      likes: likesOverTime.slice(-7).reduce((sum, d) => sum + d.likes, 0)
    };

    // Table for CSV export
    const videoTableRows = videos.map(v => ({
      title: v.title,
      views: v.views || 0,
      likes: v.likes?.length || 0,
      privacy: v.privacy,
      date: v.createdAt?.toDate ? toDateString(v.createdAt.toDate()) : ''
    }));

    return {
      totalVideos,
      totalViews,
      totalLikes,
      avgViews,
      engagementRate,
      topVideo,
      topVideosByViews,
      topVideosByLikes,
      viewsOverTime,
      likesOverTime,
      recentActivity,
      videoTableRows
    };
  }, [videos]);

  return (
    <div className="mb-8 p-6 bg-dark-800 rounded-lg shadow flex flex-col gap-6">
      <h2 className="text-2xl font-bold mb-4">Your Video Analytics</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-primary-400">{totalVideos}</span>
          <span className="text-gray-400 text-sm mt-1">Total Videos</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-blue-400">{totalViews}</span>
          <span className="text-gray-400 text-sm mt-1">Total Views</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-pink-400">{totalLikes}</span>
          <span className="text-gray-400 text-sm mt-1">Total Likes</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-green-400">{avgViews}</span>
          <span className="text-gray-400 text-sm mt-1">Avg Views/Video</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-bold text-yellow-400">{engagementRate}%</span>
          <span className="text-gray-400 text-sm mt-1">Engagement Rate</span>
        </div>
      </div>
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="bg-dark-700 rounded-lg p-4 flex-1 min-w-[250px]">
          <h3 className="font-semibold mb-2">Recent 7 Days</h3>
          <div className="text-sm text-gray-300">New Videos: <span className="font-bold">{recentActivity.videos}</span></div>
          <div className="text-sm text-gray-300">Views: <span className="font-bold">{recentActivity.views}</span></div>
          <div className="text-sm text-gray-300">Likes: <span className="font-bold">{recentActivity.likes}</span></div>
        </div>
        <button className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-semibold" onClick={() => downloadCSV(videoTableRows, 'video-analytics.csv')}>Export CSV</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Views Over Time (30d)</h3>
          <div className="w-full h-64 bg-dark-900 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={viewsOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Legend />
                <Bar dataKey="views" fill="#8884d8" name="Views" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Likes Over Time (30d)</h3>
          <div className="w-full h-64 bg-dark-900 rounded-lg p-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={likesOverTime} margin={{ top: 10, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke="#f472b6" name="Likes" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Top Videos by Views</h3>
          <ul className="space-y-2">
            {topVideosByViews.map(v => (
              <li key={v.id} className="flex items-center gap-3 bg-dark-700 rounded p-2">
                <img src={`https://img.youtube.com/vi/${(v.youtubeUrl.match(/[?&]v=([^&#]+)/)?.[1] || v.youtubeUrl.split('/').pop())}/mqdefault.jpg`} alt={v.title} className="w-12 h-8 rounded object-cover border border-dark-600" loading="lazy" />
                <span className="font-semibold text-white truncate max-w-[120px]">{v.title}</span>
                <span className="text-xs text-gray-400">{v.views || 0} views</span>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Top Videos by Likes</h3>
          <ul className="space-y-2">
            {topVideosByLikes.map(v => (
              <li key={v.id} className="flex items-center gap-3 bg-dark-700 rounded p-2">
                <img src={`https://img.youtube.com/vi/${(v.youtubeUrl.match(/[?&]v=([^&#]+)/)?.[1] || v.youtubeUrl.split('/').pop())}/mqdefault.jpg`} alt={v.title} className="w-12 h-8 rounded object-cover border border-dark-600" loading="lazy" />
                <span className="font-semibold text-white truncate max-w-[120px]">{v.title}</span>
                <span className="text-xs text-gray-400">{v.likes?.length || 0} likes</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard; 