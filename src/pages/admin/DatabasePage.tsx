import React, { useState, useEffect } from 'react';
import { db } from '../../config/firebase';
import { collection, getDocs, writeBatch, doc, getDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  Database, 
  Download, 
  Upload, 
  RefreshCw, 
  HardDrive, 
  FileJson,
  FileText,
  Loader,
  AlertTriangle,
  Check,
  Info
} from 'lucide-react';

const DatabasePage: React.FC = () => {
  const [collections, setCollections] = useState<string[]>([]);
  const [selectedCollection, setSelectedCollection] = useState<string>('');
  const [collectionData, setCollectionData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [stats, setStats] = useState({
    totalDocuments: 0,
    collections: 0,
    lastBackup: null as Date | null,
  });
  
  useEffect(() => {
    fetchCollections();
  }, []);
  
  const fetchCollections = async () => {
    setIsLoading(true);
    try {
      // In a real app, you'd query Firestore collections
      // For demo purposes, we'll hardcode available collections
      const availableCollections = ['users', 'emailQueue', 'backups', 'projects'];
      setCollections(availableCollections);
      
      // Fetch stats
      let totalDocs = 0;
      for (const collName of availableCollections) {
        const querySnapshot = await getDocs(collection(db, collName));
        totalDocs += querySnapshot.size;
      }
      
      // Mock last backup date
      const lastBackup = new Date();
      lastBackup.setHours(lastBackup.getHours() - 12);
      
      setStats({
        totalDocuments: totalDocs,
        collections: availableCollections.length,
        lastBackup: lastBackup,
      });
      
    } catch (error) {
      console.error('Error fetching collections:', error);
      toast.error('Failed to load database collections');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCollectionData = async (collectionName: string) => {
    if (!collectionName) return;
    
    setIsLoading(true);
    try {
      const querySnapshot = await getDocs(collection(db, collectionName));
      const data = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCollectionData(data);
      setSelectedCollection(collectionName);
    } catch (error) {
      console.error(`Error fetching ${collectionName} data:`, error);
      toast.error(`Failed to load ${collectionName} data`);
    } finally {
      setIsLoading(false);
    }
  };

  const exportCollection = async (format: 'json' | 'csv') => {
    if (!selectedCollection || collectionData.length === 0) {
      toast.error('Please select a collection first');
      return;
    }
    
    setIsExporting(true);
    
    try {
      let dataStr = '';
      
      if (format === 'json') {
        // Convert dates and other non-serializable objects
        const processedData = collectionData.map(item => {
          const processed = { ...item };
          
          // Process dates and other special types
          Object.keys(processed).forEach(key => {
            if (processed[key] && typeof processed[key].toDate === 'function') {
              processed[key] = processed[key].toDate().toISOString();
            }
          });
          
          return processed;
        });
        
        dataStr = JSON.stringify(processedData, null, 2);
      } else if (format === 'csv') {
        // Get headers from first item
        if (collectionData.length > 0) {
          const headers = Object.keys(collectionData[0]).filter(h => h !== 'id');
          const rows = [
            ['id', ...headers].join(','),
            ...collectionData.map(item => {
              return [
                item.id,
                ...headers.map(header => {
                  let value = item[header];
                  
                  // Handle different data types
                  if (value === null || value === undefined) {
                    return '';
                  } else if (typeof value === 'object') {
                    if (typeof value.toDate === 'function') {
                      return value.toDate().toISOString();
                    } else {
                      return JSON.stringify(value).replace(/,/g, ';');
                    }
                  } else {
                    return String(value).replace(/,/g, ';');
                  }
                })
              ].join(',');
            })
          ].join('\n');
          
          dataStr = rows;
        }
      }
      
      // Create a download link
      const blob = new Blob([dataStr], { type: format === 'json' ? 'application/json' : 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedCollection}_export_${new Date().toISOString().slice(0, 10)}.${format}`;
      document.body.appendChild(a);
      a.click();
      
      // Cleanup
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Successfully exported ${selectedCollection} as ${format.toUpperCase()}`);
    } catch (error) {
      console.error(`Error exporting ${selectedCollection}:`, error);
      toast.error(`Failed to export ${selectedCollection}`);
    } finally {
      setIsExporting(false);
    }
  };

  const createBackup = async () => {
    setIsLoading(true);
    
    try {
      // In a real app, you'd use Firebase Admin SDK or a cloud function
      // For demo purposes, we'll mock a backup process
      
      // Create a backup document
      const backupData = {
        timestamp: new Date(),
        collections: collections,
        status: 'completed',
        documentsCount: stats.totalDocuments,
      };
      
      // Mock adding to a backups collection
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update stats
      setStats({
        ...stats,
        lastBackup: new Date(),
      });
      
      toast.success('Database backup created successfully');
    } catch (error) {
      console.error('Error creating backup:', error);
      toast.error('Failed to create database backup');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Database Management</h1>
      
      {/* Database Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-dark-700 rounded-lg p-6 shadow-md"
        >
          <div className="flex items-center mb-3">
            <div className="bg-primary-500/20 p-3 rounded-lg mr-3">
              <Database className="h-6 w-6 text-primary-400" />
            </div>
            <span className="text-gray-400 text-sm">Total Documents</span>
          </div>
          <div className="text-3xl font-bold">
            {isLoading ? (
              <div className="animate-pulse h-8 w-20 bg-dark-600 rounded"></div>
            ) : (
              stats.totalDocuments
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-dark-700 rounded-lg p-6 shadow-md"
        >
          <div className="flex items-center mb-3">
            <div className="bg-blue-500/20 p-3 rounded-lg mr-3">
              <HardDrive className="h-6 w-6 text-blue-400" />
            </div>
            <span className="text-gray-400 text-sm">Collections</span>
          </div>
          <div className="text-3xl font-bold">
            {isLoading ? (
              <div className="animate-pulse h-8 w-16 bg-dark-600 rounded"></div>
            ) : (
              stats.collections
            )}
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-dark-700 rounded-lg p-6 shadow-md"
        >
          <div className="flex items-center mb-3">
            <div className="bg-green-500/20 p-3 rounded-lg mr-3">
              <RefreshCw className="h-6 w-6 text-green-400" />
            </div>
            <span className="text-gray-400 text-sm">Last Backup</span>
          </div>
          <div className="text-xl font-bold">
            {isLoading ? (
              <div className="animate-pulse h-8 w-32 bg-dark-600 rounded"></div>
            ) : stats.lastBackup ? (
              stats.lastBackup.toLocaleString()
            ) : (
              'Never'
            )}
          </div>
        </motion.div>
      </div>
      
      {/* Backup Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.3 }}
        className="mb-8 bg-dark-700 rounded-lg p-6 shadow-md border border-blue-500/30"
      >
        <div className="flex items-start mb-4">
          <Info size={20} className="text-blue-400 mr-3 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold mb-2">Database Backup</h2>
            <p className="text-gray-400 mb-4">
              Regular backups protect your data from loss. We recommend creating a backup at least once a week.
            </p>
            
            <button
              onClick={createBackup}
              disabled={isLoading}
              className="btn-primary inline-flex items-center"
            >
              {isLoading ? (
                <>
                  <Loader size={16} className="mr-2 animate-spin" />
                  Creating Backup...
                </>
              ) : (
                <>
                  <RefreshCw size={16} className="mr-2" />
                  Create Backup Now
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
      
      {/* Collection Explorer */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-dark-700 rounded-lg shadow-md overflow-hidden"
      >
        <div className="p-6 border-b border-dark-600">
          <h2 className="text-lg font-semibold">Collection Explorer</h2>
        </div>
        
        <div className="p-6">
          <div className="mb-6">
            <label className="block text-gray-400 mb-2">Select Collection</label>
            <div className="flex space-x-4">
              <select
                className="form-input flex-grow"
                value={selectedCollection}
                onChange={(e) => fetchCollectionData(e.target.value)}
                disabled={isLoading}
              >
                <option value="">-- Select a collection --</option>
                {collections.map((coll) => (
                  <option key={coll} value={coll}>
                    {coll}
                  </option>
                ))}
              </select>
              
              <button
                onClick={() => fetchCollectionData(selectedCollection)}
                disabled={!selectedCollection || isLoading}
                className="btn-outline"
              >
                <RefreshCw size={16} />
              </button>
            </div>
          </div>
          
          {selectedCollection && (
            <div className="mb-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold capitalize">{selectedCollection}</h3>
                <div className="flex space-x-3">
                  <button
                    onClick={() => exportCollection('json')}
                    disabled={isExporting || collectionData.length === 0}
                    className="btn-outline py-1.5 px-3 inline-flex items-center text-sm"
                  >
                    {isExporting ? (
                      <Loader size={14} className="mr-2 animate-spin" />
                    ) : (
                      <FileJson size={14} className="mr-2" />
                    )}
                    Export JSON
                  </button>
                  <button
                    onClick={() => exportCollection('csv')}
                    disabled={isExporting || collectionData.length === 0}
                    className="btn-outline py-1.5 px-3 inline-flex items-center text-sm"
                  >
                    {isExporting ? (
                      <Loader size={14} className="mr-2 animate-spin" />
                    ) : (
                      <FileText size={14} className="mr-2" />
                    )}
                    Export CSV
                  </button>
                </div>
              </div>
              
              {isLoading ? (
                <div className="flex justify-center py-8">
                  <Loader size={30} className="animate-spin text-primary-500" />
                </div>
              ) : collectionData.length > 0 ? (
                <div className="bg-dark-800 rounded-lg overflow-auto max-h-96">
                  <table className="min-w-full divide-y divide-dark-600">
                    <thead className="bg-dark-900 sticky top-0">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                          ID
                        </th>
                        {Object.keys(collectionData[0])
                          .filter(key => key !== 'id')
                          .slice(0, 4) // Limit columns to prevent overflow
                          .map(key => (
                            <th key={key} className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                              {key}
                            </th>
                          ))}
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dark-600">
                      {collectionData.slice(0, 10).map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            {item.id.substring(0, 8)}...
                          </td>
                          {Object.keys(item)
                            .filter(key => key !== 'id')
                            .slice(0, 4)
                            .map(key => (
                              <td key={key} className="px-6 py-4 whitespace-nowrap text-sm">
                                {typeof item[key] === 'object' ? (
                                  item[key] && typeof item[key].toDate === 'function' ? (
                                    item[key].toDate().toLocaleString()
                                  ) : (
                                    JSON.stringify(item[key]).substring(0, 30)
                                  )
                                ) : (
                                  String(item[key]).substring(0, 30)
                                )}
                              </td>
                            ))}
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                            <button className="text-primary-400 hover:text-primary-300">
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  
                  {collectionData.length > 10 && (
                    <div className="px-6 py-3 bg-dark-800 border-t border-dark-600 text-center text-sm text-gray-400">
                      Showing 10 of {collectionData.length} documents. Export to view all.
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-400">
                  No documents found in this collection
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default DatabasePage;