import React from "react";
import { X, Lock, Unlock, Shield, Trash2 } from "lucide-react";
import { RoomSettings } from "@virtual-movie-room/shared";

interface RoomSettingsModalProps {
  isOpen: boolean;
  settings: RoomSettings;
  onClose: () => void;
  onUpdateSettings: (newSettings: Partial<RoomSettings>) => void;
  onEndRoom: () => void;
}

export const RoomSettingsModal: React.FC<RoomSettingsModalProps> = ({
  isOpen,
  settings,
  onClose,
  onUpdateSettings,
  onEndRoom
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-md bg-cinema-card border border-cinema-border rounded-xl p-5 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-cinema-border pb-3">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-cinema-accent" />
            <h3 className="font-bold text-white text-base">Host Room Settings</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-cinema-surface text-gray-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Guest Control Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-cinema-surface border border-cinema-border">
            <div>
              <h4 className="font-medium text-white text-xs sm:text-sm">Allow Guest Controls</h4>
              <p className="text-[11px] text-gray-400">
                {settings.allowGuestControl
                  ? "Anyone in the room can play, pause, seek, or change media."
                  : "Only the host can play, pause, seek, or change media."}
              </p>
            </div>
            <button
              onClick={() => onUpdateSettings({ allowGuestControl: !settings.allowGuestControl })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                settings.allowGuestControl ? "bg-cinema-accent" : "bg-gray-700"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.allowGuestControl ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          {/* Lock Room Toggle */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-cinema-surface border border-cinema-border">
            <div className="flex items-start gap-2.5">
              {settings.locked ? (
                <Lock className="w-4 h-4 text-cinema-amber shrink-0 mt-0.5" />
              ) : (
                <Unlock className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              )}
              <div>
                <h4 className="font-medium text-white text-xs sm:text-sm">Lock Room</h4>
                <p className="text-[11px] text-gray-400">
                  {settings.locked
                    ? "Room is locked. New guests cannot join."
                    : "Room is unlocked. Anyone with the code can join."}
                </p>
              </div>
            </div>
            <button
              onClick={() => onUpdateSettings({ locked: !settings.locked })}
              className={`w-11 h-6 flex items-center rounded-full p-1 transition ${
                settings.locked ? "bg-cinema-amber" : "bg-gray-700"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition ${
                  settings.locked ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>

        {/* Danger Zone: End Room */}
        <div className="pt-2 border-t border-cinema-border">
          <button
            onClick={() => {
              if (confirm("Are you sure you want to end this room for all participants?")) {
                onEndRoom();
                onClose();
              }
            }}
            className="w-full py-2.5 px-4 rounded-lg bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-400 font-medium text-xs flex items-center justify-center gap-2 transition"
          >
            <Trash2 className="w-4 h-4" />
            <span>End Watch Party for Everyone</span>
          </button>
        </div>
      </div>
    </div>
  );
};
