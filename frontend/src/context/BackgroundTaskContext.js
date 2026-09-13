import React, { createContext, useContext, useState, useCallback } from 'react'

const _Ctx = createContext(null);

export function BackgroundTaskProvider({children}) {
  const [tasks, setTasks] = useState({});

  const addTask = useCallback((id, msg) => {
    setTasks(prev => ({...prev, [id]: {id, message: msg, done: false, error: false}}));
  }, []);

  const finishTask = useCallback((id) => {
    setTasks(prev => ({...prev, [id]: {...prev[id], done: true, error: false}}));
  }, []);

  const failTask = useCallback((id) => {
    setTasks(prev => ({...prev, [id]: {...prev[id], done: true, error: true}}));
  }, []);

  return (
    <_Ctx.Provider value={{tasks, addTask, finishTask, failTask}}>
      {children}
    </_Ctx.Provider>
  );
}

export function useBackgroundTasks() {
  const ctx = useContext(_Ctx);
  if (!ctx) throw new Error('useBackgroundTasks must be used within BackgroundTaskProvider');
  return ctx;
}
