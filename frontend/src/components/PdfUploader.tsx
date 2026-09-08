import React from 'react';
import { EmptyState } from './EmptyState';

interface PdfUploaderProps {
  onUpload: (file: File) => void;
  isLoading: boolean;
  error?: string | null;
}

export const PdfUploader: React.FC<PdfUploaderProps> = ({
  onUpload,
  isLoading,
  error,
}) => {
  return (
    <EmptyState
      onFileSelected={onUpload}
      isLoading={isLoading}
      error={error}
    />
  );
};
