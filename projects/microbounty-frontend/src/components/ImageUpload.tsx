import React, { useState, useRef } from 'react';
import { Upload, X, Loader2, ImageIcon } from 'lucide-react';
import { getSupabase } from '../utils/supabaseClient';
import { useWallet } from '@txnlab/use-wallet-react';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  value?: string;
  label?: string;
  className?: string;
}

export default function ImageUpload({ onUpload, value, label, className }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { activeAddress } = useWallet();

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploading(true);
      const supabase = getSupabase(activeAddress || undefined);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${activeAddress || 'anonymous'}/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('agent-assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('agent-assets')
        .getPublicUrl(filePath);

      onUpload(publicUrl);
    } catch (error: any) {
      console.error('Error uploading image:', error.message);
      alert('Error uploading image. Please check your connection or try a smaller file.');
    } finally {
      setUploading(false);
    }
  };

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    onUpload('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={`space-y-2 ${className}`}>
      {label && <label className="block text-gray-700 dark:text-gray-300 font-bold text-sm mb-2">{label}</label>}
      
      <div 
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer overflow-hidden rounded-xl border-2 border-dashed transition-all h-32 flex flex-col items-center justify-center ${
          value 
            ? 'border-transparent' 
            : 'border-gray-200 dark:border-gray-800 hover:border-[#6D28D9] bg-gray-50 dark:bg-[#1A1D24]'
        }`}
      >
        <input 
          type="file" 
          ref={fileInputRef}
          onChange={handleUpload}
          accept="image/*"
          className="hidden"
        />

        {value ? (
          <>
            <img src={value} alt="Preview" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <p className="text-white text-[10px] font-bold flex items-center gap-1.5">
                <Upload className="w-3.5 h-3.5" /> Change
              </p>
            </div>
            <button 
              onClick={clearImage}
              className="absolute top-1.5 right-1.5 p-1 bg-black/60 text-white rounded-full hover:bg-red-500 transition-colors"
            >
              <X className="w-2.5 h-2.5" />
            </button>
          </>
        ) : uploading ? (
          <div className="flex flex-col items-center gap-1.5">
            <Loader2 className="w-6 h-6 text-[#6D28D9] animate-spin" />
            <p className="text-[10px] text-gray-500 font-medium">Uploading...</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-[#6D28D9]">
            <ImageIcon className="w-6 h-6 opacity-50" />
            <div className="text-center">
              <p className="text-xs font-bold">Upload Image</p>
              <p className="text-[9px]">PNG, JPG (Max 5MB)</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
