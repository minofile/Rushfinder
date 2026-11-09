import React from 'react';
import { createRoot } from 'react-dom/client';
import { MotionStudio } from './MotionStudio';
import './styles.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MotionStudio />
  </React.StrictMode>
);
