import React from "react";
import ReactDOM from "react-dom";
import Header from "../Header";
import { X } from "lucide-react";

type Props = {
  children: React.ReactNode;
  isOpen: boolean;
  onClose: () => void;
  name: string;
};

const Modal = ({ children, isOpen, onClose, name }: Props) => {
  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="fixed inset-0 z-50 flex h-full w-full items-center justify-center overflow-y-auto bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-[var(--theme-surface)] p-4 shadow-lg border border-[var(--theme-border)]">
        <Header
          name={name}
          buttonComponent={
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--theme-text-on-primary)] hover:opacity-80"
              style={{ background: `var(--theme-primary)` }}
              onClick={onClose}
            >
              <X size={18} />
            </button>
          }
          isSmallText
        />
        {children}
      </div>
    </div>,
    document.body,
  );
};

export default Modal;
