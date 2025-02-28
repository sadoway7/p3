import { createContext, useContext, useState, ReactNode } from 'react';
import { Community } from "../types";

type CommunityContextType = {
  communities: Community[];
  currentCommunity: Community | null;
  loading: boolean;
  error: string | null;
  setCommunities: (communities: Community[]) => void;
  setCurrentCommunity: (community: Community) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
};

const CommunityContext = createContext<CommunityContextType>({
  communities: [],
  currentCommunity: null,
  loading: false,
  error: null,
  setCommunities: () => {},
  setCurrentCommunity: () => {},
  setLoading: () => {},
  setError: () => {},
});

export const CommunityProvider = ({ children }: { children: ReactNode }) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [currentCommunity, setCurrentCommunity] = useState<Community | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <CommunityContext.Provider
      value={{
        communities,
        currentCommunity,
        loading,
        error,
        setCommunities,
        setCurrentCommunity,
        setLoading,
        setError,
      }}
    >
      {children}
    </CommunityContext.Provider>
  );
};

export const useCommunity = () => {
  const context = useContext(CommunityContext);
  console.log('CommunityContext initialized with types:', context);
  return context;
};
