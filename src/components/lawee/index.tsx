'use client';

import React from 'react';
import { LaweeFloat } from './LaweeFloat';
import { useLawee } from '@/hooks/useLawee';

export function Lawee() {
  const { state, handleClick, handleDialogClose, handleDragStart, handleDrop } = useLawee();

  if (!state.isVisible) return null;

  return (
    <LaweeFloat
      state={state}
      onClick={handleClick}
      onDialogClose={handleDialogClose}
      onDragStart={handleDragStart}
      onDrop={handleDrop}
    />
  );
}

export { LaweeCharacter } from './LaweeCharacter';
export { LaweeDialog } from './LaweeDialog';
export { LaweeFloat } from './LaweeFloat';
