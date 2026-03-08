'use client';

import React from 'react';
import { LaweeFloat } from './LaweeFloat';
import { useLawee } from '@/hooks/useLawee';

export function Lawee() {
  const { state, handleClick, handleDialogClose } = useLawee();

  if (!state.isVisible) return null;

  return (
    <LaweeFloat
      state={state}
      onClick={handleClick}
      onDialogClose={handleDialogClose}
    />
  );
}

export { LaweeCharacter } from './LaweeCharacter';
export { LaweeDialog } from './LaweeDialog';
export { LaweeFloat } from './LaweeFloat';
