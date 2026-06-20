import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

const MAX = 4;
const KEY = 'gp_compare';

interface CompareCtx {
  ids: number[];
  toggle: (id: number) => void;
  remove: (id: number) => void;
  clear: () => void;
  has: (id: number) => boolean;
  full: boolean;
}

const Ctx = createContext<CompareCtx>(null as any);

export function CompareProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<number[]>(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || '[]');
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(ids));
  }, [ids]);

  const toggle = (id: number) =>
    setIds((prev) =>
      prev.includes(id)
        ? prev.filter((x) => x !== id)
        : prev.length >= MAX
          ? prev
          : [...prev, id],
    );
  const remove = (id: number) => setIds((prev) => prev.filter((x) => x !== id));
  const clear = () => setIds([]);
  const has = (id: number) => ids.includes(id);

  return (
    <Ctx.Provider value={{ ids, toggle, remove, clear, has, full: ids.length >= MAX }}>
      {children}
    </Ctx.Provider>
  );
}

export const useCompare = () => useContext(Ctx);
