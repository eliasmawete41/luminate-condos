import { createContext, useContext, useEffect, useState } from 'react';

type Tema = 'light' | 'dark';

interface ContextoTemaProps {
  tema: Tema;
  alternarTema: () => void;
  definirTema: (t: Tema) => void;
}

const ContextoTema = createContext<ContextoTemaProps | undefined>(undefined);

const CHAVE_ARMAZENAMENTO = 'posteguard-tema';

export function ProvedorTema({ children }: { children: React.ReactNode }) {
  const [tema, setTema] = useState<Tema>(() => {
    if (typeof window === 'undefined') return 'light';
    const salvo = localStorage.getItem(CHAVE_ARMAZENAMENTO) as Tema | null;
    return salvo === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    const raiz = document.documentElement;
    raiz.classList.remove('light', 'dark');
    raiz.classList.add(tema);
    localStorage.setItem(CHAVE_ARMAZENAMENTO, tema);
  }, [tema]);

  const alternarTema = () => setTema((t) => (t === 'dark' ? 'light' : 'dark'));
  const definirTema = (t: Tema) => setTema(t);

  return (
    <ContextoTema.Provider value={{ tema, alternarTema, definirTema }}>
      {children}
    </ContextoTema.Provider>
  );
}

export function useTema() {
  const ctx = useContext(ContextoTema);
  if (!ctx) throw new Error('useTema deve ser usado dentro de ProvedorTema');
  return ctx;
}