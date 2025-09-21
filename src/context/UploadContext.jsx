import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

const UploadContext = createContext({
  uploads: [],
  addUploads: () => {},
  clearUploads: () => {},
});

export const UploadProvider = ({ children }) => {
  const [uploads, setUploads] = useState([]);
  const objectUrlsRef = useRef(new Set());

  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      objectUrlsRef.current.clear();
    };
  }, []);

  const addUploads = items => {
    setUploads(prev => {
      const enhanced = items.map(item => {
        if (item.objectUrl) {
          objectUrlsRef.current.add(item.objectUrl);
        }
        return {
          id: item.id,
          title: item.title,
          url: item.url,
          location: item.location ?? 'Local analysis',
          thumbnail: item.thumbnail ?? null,
          timestamps: item.timestamps ?? [],
          createdAt: item.createdAt ?? new Date().toISOString(),
          threatAssessment: item.threatAssessment ?? null,
        };
      });
      return [...enhanced, ...prev];
    });
  };

  const clearUploads = () => {
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current.clear();
    setUploads([]);
  };

  const value = useMemo(
    () => ({
      uploads,
      addUploads,
      clearUploads,
    }),
    [uploads],
  );

  return <UploadContext.Provider value={value}>{children}</UploadContext.Provider>;
};

export const useUploads = () => useContext(UploadContext);
