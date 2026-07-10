import { forwardRef, useState, type DragEvent, type TextareaHTMLAttributes } from "react";
import { TextAreaField } from "./TextAreaField";

interface FileDropTextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hideLabel?: boolean;
  /** Se llama con el contenido de texto del archivo soltado/seleccionado. */
  onFileDrop: (text: string) => void;
  /** Extensión aceptada por el input file y el hint visual (ej. ".md"). */
  acceptExtension?: string;
}

/** Textarea que además acepta arrastrar-y-soltar (o seleccionar) un archivo de texto, volcando su contenido en el campo. */
export const FileDropTextArea = forwardRef<HTMLTextAreaElement, FileDropTextAreaProps>(
  function FileDropTextArea({ onFileDrop, acceptExtension = ".md", ...textAreaProps }, ref) {
    const [isDragging, setIsDragging] = useState(false);

    async function readFile(file: File | null | undefined) {
      if (!file) return;
      onFileDrop(await file.text());
    }

    function handleDrop(e: DragEvent<HTMLDivElement>) {
      e.preventDefault();
      setIsDragging(false);
      void readFile(e.dataTransfer.files[0]);
    }

    return (
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`rounded-lg transition-colors ${
          isDragging ? "outline outline-2 outline-dashed outline-amber-400 outline-offset-2" : ""
        }`}
      >
        <TextAreaField ref={ref} {...textAreaProps} />
        <label className="-mt-2 mb-3 block cursor-pointer text-xs text-slate-500 hover:text-amber-400">
          Arrastra un archivo{acceptExtension ? ` ${acceptExtension}` : ""} aquí, o{" "}
          <span className="underline">selecciona uno</span>
          <input
            type="file"
            accept={acceptExtension}
            className="hidden"
            onChange={(e) => {
              void readFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    );
  },
);
