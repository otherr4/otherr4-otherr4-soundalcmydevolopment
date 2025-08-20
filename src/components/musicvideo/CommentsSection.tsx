import React, { useEffect, useState } from 'react';
import { getComments, addComment, addReply } from '../../services/musicVideoService';
import { useAuth } from '../../contexts/AuthContext';
import { getProfileImageUrlWithFallback } from '../../utils/imageUtils';
import { Link } from 'react-router-dom';
import { ThumbsUp, Heart, Share2, Copy, CornerDownRight } from 'lucide-react';

interface CommentsSectionProps {
  videoId: string;
}

// 1. Extend Comment interface for likes, hearts, replies
interface Comment {
  id: string;
  userId: string;
  comment: string;
  createdAt: any;
  userProfile?: {
    displayName?: string;
    photoURL?: string;
    profileImagePath?: string; // Added for new avatar logic
  };
  likes?: string[]; // userIds who liked
  hearts?: string[]; // userIds who hearted
  replies?: Comment[]; // nested replies
}

// Emoji categories for the picker
const emojiCategories = {
  'Smileys': ['😀', '😃', '😄', '😁', '😆', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒', '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖', '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡', '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰', '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶', '😐', '😑', '😯', '😦', '😧', '😮', '😲', '🥱', '😴', '🤤', '😪', '😵', '🤐', '🥴', '🤢', '🤮', '🤧', '😷', '🤒', '🤕'],
  'Music': ['🎵', '🎶', '🎼', '🎤', '🎧', '🎷', '🎸', '🎹', '🎺', '🎻', '🥁', '🎪', '🎭', '🎨', '🎬', '🎤', '🎧', '🎼', '🎵', '🎶', '🎹', '🎸', '🎷', '🎺', '🎻', '🥁', '🎤', '🎧', '🎼', '🎵', '🎶'],
  'Hearts': ['❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '♥️', '💌', '💋', '💯', '💢', '💥', '💫', '💦', '💨', '🕳️', '💬', '🗨️', '🗯️', '💭', '💤'],
  'Hands': ['👋', '🤚', '🖐️', '✋', '🖖', '👌', '🤌', '🤏', '✌️', '🤞', '🤟', '🤘', '🤙', '👈', '👉', '👆', '🖕', '👇', '☝️', '👍', '👎', '✊', '👊', '🤛', '🤜', '👏', '🙌', '👐', '🤲', '🤝', '🙏', '✍️', '💪', '🦾', '🦿', '🦵', '🦶', '👂', '🦻', '👃', '🧠', '🫀', '🫁', '🦷', '🦴', '👁️', '👅', '👄', '💋', '🩸'],
  'Nature': ['🌱', '🌲', '🌳', '🌴', '🌵', '🌾', '🌿', '☘️', '🍀', '🍁', '🍂', '🍃', '🌺', '🌸', '🌼', '🌻', '🌞', '🌝', '🌛', '🌜', '🌚', '🌕', '🌖', '🌗', '🌘', '🌑', '🌒', '🌓', '🌔', '🌙', '🌎', '🌍', '🌏', '💫', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈', '☀️', '🌤️', '⛅', '🌥️', '☁️', '🌦️', '🌧️', '⛈️', '🌩️', '🌨️', '☃️', '⛄', '❄️', '🌬️', '💨', '💧', '💦', '☔', '☂️', '🌊', '🌫️']
};

// Helper to ensure photoURL is string or undefined (never null or empty)
const safePhotoUrl = (url: string | null | undefined) => (url === null || url === undefined ? undefined : url);

// Helper to recursively attach userProfile to replies
async function attachProfilesToReplies(replies: any[], getUserProfile: any): Promise<any[]> {
  if (!replies) return [];
  return Promise.all(
    replies.map(async (reply) => {
      let userProfile = null;
      try {
        userProfile = await getUserProfile(reply.userId);
      } catch {}
      const repliesWithProfiles = await attachProfilesToReplies(reply.replies || [], getUserProfile);
      return { ...reply, userProfile, replies: repliesWithProfiles };
    })
  );
}

const CommentsSection: React.FC<CommentsSectionProps> = ({ videoId }) => {
  const { user, userProfile, getUserProfile } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [posting, setPosting] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [activeEmojiCategory, setActiveEmojiCategory] = useState('Smileys');
  const [sortBy, setSortBy] = useState<'newest' | 'mostLiked'>('newest');
  const [expandedComments, setExpandedComments] = useState<{[id: string]: boolean}>({});
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyPosting, setReplyPosting] = useState(false);

  const fetchComments = async () => {
    setLoading(true);
    const data = await getComments(videoId);
    const commentsWithProfiles = await Promise.all(
      data.map(async (comment: any) => {
        let userProfile = null;
        try {
          userProfile = await getUserProfile(comment.userId);
        } catch {}
        const repliesWithProfiles = await attachProfilesToReplies(comment.replies || [], getUserProfile);
        return { ...comment, userProfile, replies: repliesWithProfiles };
      })
    );
    setComments(commentsWithProfiles);
    setLoading(false);
  };

  useEffect(() => {
    fetchComments();
  }, [videoId]);

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;
    setPosting(true);
    await addComment(videoId, user.uid, newComment.trim());
    setNewComment('');
    setPosting(false);
    fetchComments();
  };

  const addEmoji = (emoji: string) => {
    setNewComment(prev => prev + emoji);
    setShowEmojiPicker(false);
  };

  const formatTimeAgo = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return `${Math.floor(diffInSeconds / 2592000)}mo ago`;
  };

  const getDisplayName = (comment: Comment) => {
    if (comment.userProfile?.displayName) return comment.userProfile.displayName;
    if (comment.userId === user?.uid) return 'You';
    return comment.userId.slice(0, 8) + '...';
  };

  // Like, heart, share, reply handlers (mocked for now)
  const handleLike = async (commentId: string) => {
    // TODO: Implement like logic in musicVideoService
    setComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      likes: c.likes?.includes(user?.uid || '') ? c.likes?.filter(uid => uid !== user?.uid) : [...(c.likes || []), user?.uid || '']
    } : c));
  };
  const handleHeart = async (commentId: string) => {
    // TODO: Implement heart logic in musicVideoService
    setComments(prev => prev.map(c => c.id === commentId ? {
      ...c,
      hearts: c.hearts?.includes(user?.uid || '') ? c.hearts?.filter(uid => uid !== user?.uid) : [...(c.hearts || []), user?.uid || '']
    } : c));
  };
  const handleShare = (commentId: string) => {
    // Copy comment link to clipboard
    navigator.clipboard.writeText(window.location.href + `#comment-${commentId}`);
    // Optionally show toast
  };
  const handleReply = async (parentId: string) => {
    if (!user || !replyText.trim()) return;
    setReplyPosting(true);
    try {
      // Use the backend function to store the reply
      await addReply(videoId, parentId, user.uid, replyText.trim());
      // Refresh comments to get the updated data with proper profile information
      await fetchComments();
    } catch (error) {
      console.error('Failed to post reply:', error);
      // Fallback to local update if backend fails
      setComments(prev => prev.map(c => c.id === parentId ? {
        ...c,
        replies: [...(c.replies || []), {
          id: Math.random().toString(36).substr(2, 9),
          userId: user.uid,
          comment: replyText,
          createdAt: new Date(),
          userProfile: {
            displayName: userProfile?.displayName || user.displayName || undefined,
            photoURL: userProfile?.photoURL || user.photoURL || undefined,
            profileImagePath: userProfile?.profileImagePath || undefined
          },
          likes: [],
          hearts: [],
          replies: []
        }]
      } : c));
    } finally {
      setReplyText('');
      setReplyingTo(null);
      setReplyPosting(false);
    }
  };

  // Sorting
  const sortedComments = [...comments].sort((a, b) => {
    if (sortBy === 'newest') {
      return (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
    } else {
      return (b.likes?.length || 0) - (a.likes?.length || 0);
    }
  });

  return (
    <div className="mt-6 flex flex-col h-full w-full">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-white">Comments</h3>
        <select
          className="bg-dark-800 text-gray-300 border border-gray-700 rounded px-2 py-1 text-sm"
          value={sortBy}
          onChange={e => setSortBy(e.target.value as 'newest' | 'mostLiked')}
        >
          <option value="newest">Newest</option>
          <option value="mostLiked">Most Liked</option>
        </select>
      </div>
      
      {/* Comment Input */}
      {user && (
        <div className="flex gap-3 mb-6 flex-shrink-0">
          <Link to={user?.uid ? `/musician/${user.uid}` : '#'} tabIndex={user?.uid ? 0 : -1} aria-label="Go to your profile">
            <img
              src={getProfileImageUrlWithFallback(
                (userProfile?.profileImagePath || userProfile?.photoURL || user?.photoURL)
              )}
              alt="Your avatar"
              className="w-8 h-8 rounded-full object-cover flex-shrink-0 hover:brightness-110 transition"
              style={{ cursor: user?.uid ? 'pointer' : 'default' }}
            />
          </Link>
          <div className="flex-1 relative">
            <form onSubmit={handlePost} className="flex flex-col gap-2">
              <div className="relative">
                <input
                  type="text"
                  className="w-full bg-transparent border-b border-gray-600 text-white placeholder-gray-400 py-2 focus:border-white focus:outline-none pr-20"
                  placeholder="Add a comment..."
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  disabled={posting}
                />
                <button 
                  type="button" 
                  className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white p-1"
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                >
                  😊
                </button>
              </div>
              
              {/* Emoji Picker - responsive UX */}
              {showEmojiPicker && (
                <div className="absolute top-full left-0 right-0 bg-dark-800 border border-gray-600 rounded-lg shadow-xl z-10 p-3 max-h-64 overflow-y-auto">
                  <div className="flex gap-1 mb-2 overflow-x-auto pb-2">
                    {Object.keys(emojiCategories).map(category => (
                      <button
                        key={category}
                        className={`px-2 py-1 rounded text-xs whitespace-nowrap flex-shrink-0 ${activeEmojiCategory === category ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                        onClick={() => setActiveEmojiCategory(category)}
                      >
                        {category}
                      </button>
                    ))}
                  </div>
                  {/* Mobile: horizontal scroll, Desktop: grid */}
                  <div className="block sm:hidden overflow-x-auto whitespace-nowrap">
                    {emojiCategories[activeEmojiCategory as keyof typeof emojiCategories]?.map((emoji, index) => (
                      <button
                        key={index}
                        className="inline-block p-2 text-xl hover:bg-gray-700 rounded"
                        onClick={() => addEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                  <div className="hidden sm:grid sm:grid-cols-8 sm:gap-1">
                    {emojiCategories[activeEmojiCategory as keyof typeof emojiCategories]?.map((emoji, index) => (
                      <button
                        key={index}
                        className="p-1 hover:bg-gray-700 rounded text-lg"
                        onClick={() => addEmoji(emoji)}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <button 
                  type="submit" 
                  className={`px-4 py-1 rounded font-medium transition-colors ${newComment.trim() ? 'bg-blue-600 text-white hover:bg-blue-700' : 'bg-gray-700 text-gray-400 cursor-not-allowed'}`}
                  disabled={posting || !newComment.trim()}
                >
                  {posting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Comments List */}
      <div className="flex-1 min-h-[250px] sm:min-h-0">
        {loading ? (
          <div className="text-gray-400">Loading comments...</div>
        ) : sortedComments.length === 0 ? (
          <div className="text-gray-500 text-center py-8">No comments yet. Be the first to comment!</div>
        ) : (
          <div className="space-y-4 overflow-y-auto max-h-[60vh] pr-2">
            {sortedComments.map((comment) => (
              <div key={comment.id} id={`comment-${comment.id}`} className="flex gap-3 group hover:bg-dark-800 p-2 rounded-lg transition-colors">
                <Link to={comment.userId ? `/musician/${String(comment.userId)}` : '#'} tabIndex={0} aria-label={`Go to ${comment.userProfile?.displayName || 'musician'} profile`}>
                  <img
                    src={getProfileImageUrlWithFallback((comment.userProfile?.profileImagePath || comment.userProfile?.photoURL) || '')}
                    alt="Avatar"
                    className="w-8 h-8 rounded-full object-cover flex-shrink-0 hover:brightness-110 transition"
                    style={{ cursor: 'pointer' }}
                  />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-medium text-white text-sm">{getDisplayName(comment)}</span>
                    <span className="text-gray-400 text-xs">{formatTimeAgo(comment.createdAt)}</span>
                  </div>
                  {/* Truncate long comments */}
                  <div className="text-white text-sm leading-relaxed break-words">
                    {comment.comment.length > 180 && !expandedComments[comment.id] ? (
                      <>
                        {comment.comment.slice(0, 180)}... <button className="text-blue-400 text-xs" onClick={() => setExpandedComments(ec => ({...ec, [comment.id]: true}))}>Show more</button>
                      </>
                    ) : comment.comment.length > 180 ? (
                      <>
                        {comment.comment} <button className="text-blue-400 text-xs" onClick={() => setExpandedComments(ec => ({...ec, [comment.id]: false}))}>Show less</button>
                      </>
                    ) : comment.comment}
                  </div>
                  {/* Actions: Like, Heart, Share, Reply */}
                  <div className="flex gap-4 items-center mt-2 text-gray-400 text-sm">
                    <button
                      className={`flex items-center gap-1 hover:text-yellow-400 transition ${comment.likes?.includes(user?.uid) ? 'text-yellow-400' : ''}`}
                      onClick={() => comment.id && handleLike(comment.id)}
                      aria-label="Like"
                      title="Like"
                    >
                      <ThumbsUp className="w-4 h-4" />
                      <span>{comment.likes?.length || 0}</span>
                    </button>
                    <button
                      className={`flex items-center gap-1 hover:text-red-500 transition ${comment.hearts?.includes(user?.uid) ? 'text-red-500' : ''}`}
                      onClick={() => comment.id && handleHeart(comment.id)}
                      aria-label="Heart"
                      title="Heart"
                    >
                      <Heart className="w-4 h-4" />
                      <span>{comment.hearts?.length || 0}</span>
                    </button>
                    <button
                      className="flex items-center gap-1 hover:text-blue-400 transition"
                      onClick={() => {
                        navigator.clipboard.writeText(comment.comment);
                      }}
                      aria-label="Copy comment"
                      title="Copy comment"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      className="flex items-center gap-1 hover:text-green-400 transition"
                      onClick={() => comment.id && setReplyingTo(comment.id)}
                      aria-label="Reply"
                      title="Reply"
                    >
                      <CornerDownRight className="w-4 h-4" />
                      Reply
                    </button>
                    <button
                      className="flex items-center gap-1 hover:text-blue-400 transition"
                      onClick={() => comment.id && handleShare(comment.id)}
                      aria-label="Share"
                      title="Share"
                    >
                      <Share2 className="w-4 h-4" />
                      Share
                    </button>
                  </div>
                  {/* Reply input under the correct comment */}
                  {replyingTo === comment.id && (
                    <form className="flex gap-2 mt-2" onSubmit={e => { e.preventDefault(); comment.id && handleReply(comment.id); }}>
                      <input
                        type="text"
                        className="flex-1 bg-dark-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 border border-dark-600"
                        placeholder="Write a reply..."
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        disabled={replyPosting}
                        maxLength={300}
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                        disabled={replyPosting || !replyText.trim()}
                      >
                        {replyPosting ? 'Replying...' : 'Reply'}
                      </button>
                      <button
                        type="button"
                        className="px-2 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg font-semibold transition-colors"
                        onClick={() => setReplyingTo(null)}
                      >
                        Cancel
                      </button>
                    </form>
                  )}
                  {/* Replies (threaded) */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-2 pl-4 border-l border-gray-700 space-y-2">
                      {comment.replies.map(reply => (
                        <div key={reply.id} className="flex gap-2 items-start ml-10">
                          <Link to={reply.userId ? `/musician/${String(reply.userId)}` : '#'} tabIndex={0} aria-label={`Go to ${reply.userProfile?.displayName || 'musician'} profile`}>
                            <img
                              src={getProfileImageUrlWithFallback((reply.userProfile?.profileImagePath || reply.userProfile?.photoURL) || '')}
                              alt="Avatar"
                              className="w-6 h-6 rounded-full object-cover hover:brightness-110 transition"
                              style={{ cursor: 'pointer' }}
                            />
                          </Link>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-white text-xs">{getDisplayName(reply)}</span>
                              <span className="text-gray-400 text-xs">{formatTimeAgo(reply.createdAt)}</span>
                            </div>
                            <div className="text-white text-xs leading-relaxed break-words">{reply.comment}</div>
                            <div className="flex gap-4 items-center mt-1 text-gray-400 text-xs">
                              <button
                                className={`flex items-center gap-1 hover:text-yellow-400 transition ${reply.likes?.includes(user?.uid) ? 'text-yellow-400' : ''}`}
                                onClick={() => reply.id && handleLike(reply.id)}
                                aria-label="Like"
                                title="Like"
                              >
                                <ThumbsUp className="w-3 h-3" />
                                <span>{reply.likes?.length || 0}</span>
                              </button>
                              <button
                                className={`flex items-center gap-1 hover:text-red-500 transition ${reply.hearts?.includes(user?.uid) ? 'text-red-500' : ''}`}
                                onClick={() => reply.id && handleHeart(reply.id)}
                                aria-label="Heart"
                                title="Heart"
                              >
                                <Heart className="w-3 h-3" />
                                <span>{reply.hearts?.length || 0}</span>
                              </button>
                              <button
                                className="flex items-center gap-1 hover:text-blue-400 transition"
                                onClick={() => {
                                  navigator.clipboard.writeText(reply.comment);
                                }}
                                aria-label="Copy reply"
                                title="Copy reply"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                              <button
                                className="flex items-center gap-1 hover:text-green-400 transition"
                                onClick={() => reply.id && setReplyingTo(reply.id)}
                                aria-label="Reply"
                                title="Reply"
                              >
                                <CornerDownRight className="w-3 h-3" />
                                Reply
                              </button>
                              <button
                                className="flex items-center gap-1 hover:text-blue-400 transition"
                                onClick={() => reply.id && handleShare(reply.id)}
                                aria-label="Share"
                                title="Share"
                              >
                                <Share2 className="w-3 h-3" />
                                Share
                              </button>
                            </div>
                            {/* Reply input under the correct reply */}
                            {replyingTo === reply.id && (
                              <form className="flex gap-2 mt-2" onSubmit={e => { e.preventDefault(); reply.id && handleReply(reply.id); }}>
                                <input
                                  type="text"
                                  className="flex-1 bg-dark-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 border border-dark-600"
                                  placeholder="Write a reply..."
                                  value={replyText}
                                  onChange={e => setReplyText(e.target.value)}
                                  disabled={replyPosting}
                                  maxLength={300}
                                />
                                <button
                                  type="submit"
                                  className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50"
                                  disabled={replyPosting || !replyText.trim()}
                                >
                                  {replyPosting ? 'Replying...' : 'Reply'}
                                </button>
                                <button
                                  type="button"
                                  className="px-2 py-2 bg-dark-700 hover:bg-dark-600 text-gray-300 rounded-lg font-semibold transition-colors"
                                  onClick={() => setReplyingTo(null)}
                                >
                                  Cancel
                                </button>
                              </form>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsSection; 