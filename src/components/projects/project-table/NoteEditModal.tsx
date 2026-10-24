'use client';

import type { Dispatch, SetStateAction } from 'react';

import { ProjectNoteEditor } from '../ProjectNoteEditor';
import { Project } from '../types';

interface NoteEditModalProps {
  editingNoteId: string | null;
  handleSaveNote: () => Promise<void>;
  noteValue: string;
  projects: Project[];
  setEditingNoteId: Dispatch<SetStateAction<string | null>>;
  setNoteValue: Dispatch<SetStateAction<string>>;
}

export function NoteEditModal({
  editingNoteId,
  handleSaveNote,
  noteValue,
  projects,
  setEditingNoteId,
  setNoteValue,
}: NoteEditModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          setEditingNoteId(null);
          setNoteValue('');
        }
      }}
    >
      <ProjectNoteEditor
        value={noteValue}
        onChange={setNoteValue}
        onSave={handleSaveNote}
        onCancel={() => {
          setEditingNoteId(null);
          setNoteValue('');
        }}
        projectName={projects.find((p) => p.id === editingNoteId)?.name}
      />
    </div>
  );
}
