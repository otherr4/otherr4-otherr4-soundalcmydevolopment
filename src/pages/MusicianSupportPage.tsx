import React, { useState } from 'react';
import SEO from '../components/common/SEO';
import { sendEmail } from '../config/emailService';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, Mail, MessageCircle, CheckCircle2, Loader2, AlertCircle, UserCheck, LogIn, Lock, MessageSquare, Video, Bell, UploadCloud, CheckCircle, ShieldCheck, Globe, Smartphone, RefreshCw, Settings, Users, Star, FileText, Image, Music, Calendar, Search, Info } from 'lucide-react';
import { Listbox, Transition } from '@headlessui/react';
import { ChevronDown, Check } from 'lucide-react';

const supportSchema = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Musician Support | SoundAlchemy",
  "description": "Get professional support, contact options, and instant solutions for common musician problems on SoundAlchemy.",
  "url": "https://soundalcmy.com/support"
}`;

const commonProblems = [
  {
    label: 'Profile Verification Issues',
    solution: 'Ensure your profile is complete and all required documents are uploaded. If you still face issues, contact support with your details.'
  },
  {
    label: 'Cannot Send Messages',
    solution: 'Messaging is available for verified users. Please complete your profile and await verification. For urgent cases, contact support.'
  },
  {
    label: 'Audio/Video Call Problems',
    solution: 'Check your internet connection and browser permissions. Try refreshing the page. If the issue persists, describe your problem below.'
  },
  {
    label: 'Other',
    solution: ''
  }
];

const platformProblems = [
  { icon: <LogIn size={28} className="text-primary-400" />, title: 'Can’t log in with email/password', solution: 'Use “Continue with Google” for instant access—no password needed!' },
  { icon: <UserCheck size={28} className="text-green-400" />, title: 'Account not verified', solution: 'Complete your profile and upload required documents. Verification is usually quick.' },
  { icon: <Lock size={28} className="text-yellow-400" />, title: 'Forgot password', solution: 'Click “Forgot Password” on the login page to reset instantly.' },
  { icon: <MessageSquare size={28} className="text-blue-400" />, title: 'Cannot send messages', solution: 'Messaging is available for verified users. Complete your profile and await verification.' },
  { icon: <Video size={28} className="text-pink-400" />, title: 'Audio/Video call not working', solution: 'Check your internet and browser permissions. Refresh the page and try again.' },
  { icon: <Bell size={28} className="text-orange-400" />, title: 'Not receiving notifications', solution: 'Enable notifications in your browser and device settings.' },
  { icon: <UploadCloud size={28} className="text-cyan-400" />, title: 'Can’t upload files or images', solution: 'Ensure your file meets size and format requirements. Try a different browser if needed.' },
  { icon: <CheckCircle size={28} className="text-green-400" />, title: 'Profile changes not saving', solution: 'Check your internet connection and try again. If the issue persists, contact support.' },
  { icon: <ShieldCheck size={28} className="text-indigo-400" />, title: 'Privacy concerns', solution: 'Review our privacy policy and adjust your settings in the profile section.' },
  { icon: <Globe size={28} className="text-blue-400" />, title: 'Language not changing', solution: 'Select your preferred language from the menu and refresh the page.' },
  { icon: <Smartphone size={28} className="text-purple-400" />, title: 'Mobile app issues', solution: 'Ensure you have the latest version. Clear cache or reinstall if needed.' },
  { icon: <RefreshCw size={28} className="text-teal-400" />, title: 'Page not loading', solution: 'Refresh your browser or try a different device.' },
  { icon: <Settings size={28} className="text-gray-400" />, title: 'Settings not updating', solution: 'Log out and log back in to refresh your settings.' },
  { icon: <Users size={28} className="text-pink-400" />, title: 'Can’t find other users', solution: 'Use the search bar and check your spelling. Some users may have privacy settings enabled.' },
  { icon: <Star size={28} className="text-yellow-400" />, title: 'Not receiving rewards or badges', solution: 'Ensure you meet all requirements. Rewards are processed automatically.' },
  { icon: <FileText size={28} className="text-blue-400" />, title: 'Document upload failed', solution: 'Check file type and size. Try uploading again or contact support.' },
  { icon: <Image size={28} className="text-pink-400" />, title: 'Profile photo not updating', solution: 'Use a clear image under 2MB. Refresh after uploading.' },
  { icon: <Music size={28} className="text-green-400" />, title: 'Audio files not playing', solution: 'Check your device’s audio settings and supported formats.' },
  { icon: <Calendar size={28} className="text-orange-400" />, title: 'Event not showing', solution: 'Ensure you are logged in and have the correct permissions.' },
  { icon: <Search size={28} className="text-cyan-400" />, title: 'Search not working', solution: 'Try different keywords or check your internet connection.' },
  { icon: <Info size={28} className="text-blue-400" />, title: 'Information missing on profile', solution: 'Edit your profile and fill in all required fields.' },
  { icon: <HelpCircle size={28} className="text-primary-400" />, title: 'Need help with features', solution: 'Visit our Help Center or contact support for guidance.' },
  { icon: <Mail size={28} className="text-red-400" />, title: 'Not receiving emails', solution: 'Check your spam folder and ensure your email is correct.' },
  { icon: <AlertCircle size={28} className="text-red-400" />, title: 'Other issues', solution: 'Describe your problem in the support form below for personalized help.' },
  { icon: <Loader2 size={28} className="text-teal-400" />, title: 'Slow loading times', solution: 'Clear your browser cache and check your internet speed.' },
  { icon: <MessageCircle size={28} className="text-green-400" />, title: 'Group chat not working', solution: 'Ensure all members are verified and try again.' },
  { icon: <CheckCircle2 size={28} className="text-green-400" />, title: 'Verification email not received', solution: 'Resend the verification email or check your spam folder.' },
  { icon: <Mail size={28} className="text-blue-400" />, title: 'Can’t contact support', solution: 'Use the support form below or email sound7alchemy@gmail.com.' },
  { icon: <Lock size={28} className="text-red-400" />, title: 'Account locked', solution: 'Reset your password or contact support for assistance.' },
  { icon: <UserCheck size={28} className="text-green-400" />, title: 'Profile not showing as verified', solution: 'Verification may take up to 24 hours. Contact support if delayed.' },
  { icon: <Settings size={28} className="text-yellow-400" />, title: 'Notification settings not saving', solution: 'Try updating settings again or clear your browser cache.' },
];

const MusicianSupportPage: React.FC = () => {
  const [form, setForm] = useState({
    name: '',
    email: '',
    reason: commonProblems[0].label,
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    let adminSent = false;
    let userSent = false;
    try {
      // Only send raw form data to backend
      const payload = {
        name: form.name,
        email: form.email,
        reason: form.reason,
        message: form.message
      };
      const result = await sendEmail(payload);
      adminSent = !!result;
      userSent = !!result;
      if (adminSent && userSent) {
        setSubmitted(true);
      } else {
        setError('Your message was not sent correctly. Please try again.');
        console.error('Support form: Email send failed', { adminSent, userSent, form });
      }
    } catch (err) {
      setError('Your message was not sent correctly. Please try again.');
      console.error('Support form: Exception during send', err, form);
    } finally {
      setSubmitting(false);
    }
  };

  const selectedProblem = commonProblems.find(p => p.label === form.reason);
  const reasonOptions = commonProblems.map(p => ({ label: p.label }));

  return (
    <>
      <SEO
        title="Musician Support | SoundAlchemy – Professional Help & Contact"
        description="Get professional support, contact options, and instant solutions for common musician problems on SoundAlchemy."
        keywords="soundalcmy, soundalchemy, support, help, contact, musician, problems, solutions, lehan kawshila, music platform"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/support"
        lang="en"
        schema={supportSchema}
      />
      {/* Common User Problems & Easy Solutions Section */}
      <div className="w-full max-w-4xl mx-auto mt-8 mb-12">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0, y: 40 },
            visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.07, delayChildren: 0.2 } },
          }}
          className="bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 rounded-2xl shadow-xl p-6 md:p-10 flex flex-col items-center"
        >
          <h2 className="text-2xl md:text-3xl font-bold text-primary-400 mb-4 text-center flex items-center gap-2">
            <HelpCircle size={28} className="text-primary-400 animate-pulse" />
            Common User Problems & Easy Solutions
          </h2>
          <p className="text-gray-300 text-center mb-6 max-w-2xl">Quickly resolve the most frequent issues users face on SoundAlchemy. Tap a card for a solution!</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 w-full">
            {platformProblems.map((item, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, y: 20 },
                  visible: { opacity: 1, y: 0 },
                }}
                whileHover={{ scale: 1.04, boxShadow: '0 8px 32px 0 rgba(0,0,0,0.25)' }}
                whileTap={{ scale: 0.98 }}
                className="flex flex-col items-start bg-dark-700 border border-dark-600 rounded-xl p-5 shadow transition-shadow min-h-[140px] group cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-400"
                tabIndex={0}
                aria-label={item.title + ': ' + item.solution}
              >
                <div className="mb-2 flex items-center gap-2">
                  <span className="transition-transform group-hover:animate-bounce group-focus:animate-bounce">{item.icon}</span>
                  <span className="font-semibold text-lg text-primary-300">{item.title}</span>
                </div>
                <div className="text-gray-200 text-sm mt-1">{item.solution}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
      {/* End Common User Problems Section */}
      <div className="min-h-screen bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex flex-col items-center py-12 px-2 sm:px-4">
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease: 'easeOut' }} className="w-full max-w-2xl bg-dark-800 rounded-2xl shadow-2xl p-8 md:p-12 flex flex-col items-center">
          <div className="flex flex-col items-center mb-8">
            <HelpCircle size={48} className="text-primary-400 animate-pulse mb-2" />
            <h1 className="text-3xl md:text-4xl font-bold text-primary-400 mb-2 text-center">Musician Support</h1>
            <p className="text-lg text-gray-300 text-center">We’re here to help. Find instant solutions or contact the SoundAlchemy team directly.</p>
          </div>
          <AnimatePresence>
            {submitting ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center justify-center w-full py-12 animate-fadeIn">
                <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-primary-400 border-solid mb-6"></div>
                <h2 className="text-2xl font-bold text-primary-400 mb-2 text-center">Sending your message...</h2>
                <p className="text-lg text-gray-300 text-center mb-4">Please wait while we securely deliver your message to the SoundAlchemy team.</p>
              </motion.div>
            ) : !submitted ? (
              <motion.form
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                onSubmit={handleSubmit}
                className="w-full space-y-6"
                autoComplete="off"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-1 font-medium">Name</label>
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg bg-dark-700 border border-dark-600 px-4 py-2 text-white focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all"
                      placeholder="Your Name"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1 font-medium">Email</label>
                    <input
                      type="email"
                      name="email"
                      value={form.email}
                      onChange={handleChange}
                      required
                      className="w-full rounded-lg bg-dark-700 border border-dark-600 px-4 py-2 text-white focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all"
                      placeholder="you@email.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Reason for Contact</label>
                  <Listbox value={form.reason} onChange={val => { setForm(f => ({ ...f, reason: val })); setError(''); }}>
                    {({ open }) => (
                      <div className="relative">
                        <Listbox.Button className="w-full rounded-xl bg-dark-700 border border-dark-600 px-4 py-3 text-white text-base md:text-base lg:text-lg focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all flex items-center justify-between min-h-[48px]">
                          <span>{form.reason}</span>
                          <ChevronDown className="ml-2 h-5 w-5 text-primary-400" aria-hidden="true" />
                        </Listbox.Button>
                        <Transition
                          show={open}
                          as={React.Fragment}
                          enter="transition ease-out duration-150"
                          enterFrom="opacity-0 scale-95"
                          enterTo="opacity-100 scale-100"
                          leave="transition ease-in duration-100"
                          leaveFrom="opacity-100 scale-100"
                          leaveTo="opacity-0 scale-95"
                        >
                          <Listbox.Options static className="absolute z-50 mt-2 w-full max-h-60 overflow-auto rounded-xl bg-dark-800 border border-dark-600 py-1 shadow-xl focus:outline-none">
                            {reasonOptions.map((option, idx) => (
                              <Listbox.Option
                                key={option.label}
                                value={option.label}
                                className={({ active, selected }) =>
                                  `cursor-pointer select-none relative py-3 px-4 text-base md:text-base lg:text-lg ${active ? 'bg-primary-500/10 text-primary-400' : 'text-white'} ${selected ? 'font-bold' : 'font-normal'}`
                                }
                              >
                                {({ selected }) => (
                                  <div className="flex items-center">
                                    {selected && <Check className="h-5 w-5 text-primary-400 mr-2" />}
                                    <span>{option.label}</span>
                                  </div>
                                )}
                              </Listbox.Option>
                            ))}
                          </Listbox.Options>
                        </Transition>
                      </div>
                    )}
                  </Listbox>
                </div>
                {selectedProblem && selectedProblem.solution && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-dark-700 border-l-4 border-primary-400 rounded-lg p-4 text-gray-200 mb-2 animate-fadeIn">
                    <div className="flex items-center mb-1">
                      <CheckCircle2 size={20} className="text-primary-400 mr-2" />
                      <span className="font-semibold">Solution:</span>
                    </div>
                    <div className="text-sm text-gray-300">{selectedProblem.solution}</div>
                  </motion.div>
                )}
                <div>
                  <label className="block text-gray-300 mb-1 font-medium">Message</label>
                  <textarea
                    name="message"
                    value={form.message}
                    onChange={handleChange}
                    required={form.reason === 'Other'}
                    rows={4}
                    className="w-full rounded-lg bg-dark-700 border border-dark-600 px-4 py-2 text-white focus:ring-2 focus:ring-primary-400 focus:outline-none transition-all resize-none"
                    placeholder="Describe your issue or question..."
                  />
                </div>
                {error && <div className="text-red-400 text-sm font-medium text-center">{error}</div>}
                <motion.button
                  type="submit"
                  className="w-full py-3 rounded-lg bg-gradient-to-r from-primary-500 to-secondary-500 hover:from-primary-400 hover:to-secondary-400 text-white font-bold text-lg shadow-lg shadow-primary-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2"
                  disabled={submitting}
                  whileTap={{ scale: 0.97 }}
                >
                  {submitting ? <Loader2 className="animate-spin" size={22} /> : <Mail size={22} />}
                  {submitting ? 'Sending...' : 'Send Message'}
                </motion.button>
              </motion.form>
            ) : (
              <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="flex flex-col items-center justify-center w-full py-12 animate-fadeIn">
                <CheckCircle2 size={48} className="text-green-400 mb-4 animate-bounce" />
                <h2 className="text-2xl font-bold text-primary-400 mb-2 text-center">Thank you!</h2>
                <p className="text-lg text-gray-300 text-center mb-4">The SoundAlchemy team will review your message and reply as soon as possible.</p>
                <div className="flex flex-col items-center gap-2 mt-4">
                  <a href="mailto:sound7alchemy@gmail.com" className="flex items-center gap-2 text-primary-400 hover:text-secondary-400 transition-colors font-medium"><Mail size={20} /> sound7alchemy@gmail.com</a>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-10 w-full">
            <h3 className="text-xl font-semibold text-secondary-400 mb-3 flex items-center gap-2"><MessageCircle size={22} /> Other Ways to Contact</h3>
            <div className="flex flex-col sm:flex-row gap-4">
              <a href="mailto:sound7alchemy@gmail.com" className="flex-1 flex items-center gap-2 bg-dark-700 hover:bg-primary-500/10 transition-colors rounded-lg px-4 py-3 text-gray-200 font-medium shadow"><Mail size={20} /> sound7alchemy@gmail.com</a>
              {/* Add more contact options here if needed */}
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};

export default MusicianSupportPage; 