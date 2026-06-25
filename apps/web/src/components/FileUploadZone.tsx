import { useCallback, useState } from 'react';

interface FileUploadZoneProps {
  accept?: string;
  label?: string;
  onFile: (file: File) => void;
}

export default function FileUploadZone({
  accept = '.xlsx,.xls,.pdf,.png,.jpg,.jpeg',
  label = 'Drop file here or click to browse',
  onFile,
}: FileUploadZoneProps) {
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      const file = files?.[0];
      if (file) onFile(file);
    },
    [onFile],
  );

  return (
    <label
      className={`card flex flex-col items-center justify-center gap-2 py-10 cursor-pointer border-2 border-dashed transition-colors ${
        dragging ? 'border-primary bg-primary/5' : 'border-outline/50 hover:border-primary/50'
      }`}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <span className="material-symbols-outlined text-4xl text-primary/60">upload_file</span>
      <p className="text-sm text-on-surface-variant font-body">{label}</p>
      <input
        type="file"
        className="hidden"
        accept={accept}
        onChange={(e) => handleFiles(e.target.files)}
      />
    </label>
  );
}
