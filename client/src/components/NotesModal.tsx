import { useEffect, useState } from 'react';

type NotesModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function NotesModal({ open, onClose }: NotesModalProps) {
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (open) {
      const saved = localStorage.getItem('myNotes') || '';
      setNotes(saved);
    }
  }, [open]);

  const saveNotes = () => {
    localStorage.setItem('myNotes', notes);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal">
        <header className="modal__header">
          <div>
            <p className="eyebrow">Personal workspace</p>
            <h3 style={{ margin: 0 }}>My notes</h3>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close notes">
            ✕
          </button>
        </header>
        <textarea
          className="modal__textarea"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Capture anything related to this release..."
        />
        <div className="modal__actions">
          <button className="btn" onClick={onClose} type="button">
            Cancel
          </button>
          <button className="btn primary" onClick={saveNotes} type="button">
            Save Notes
          </button>
        </div>
      </div>
    </div>
  );
}
