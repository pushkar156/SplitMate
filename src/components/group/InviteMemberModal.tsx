import React, { useState } from 'react';
import { Group } from '../../types';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Copy, Check, MessageSquare, Share2 } from 'lucide-react';
import { toast } from 'sonner';

interface InviteMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  group: Group;
}

export const InviteMemberModal: React.FC<InviteMemberModalProps> = ({
  isOpen,
  onClose,
  group,
}) => {
  const [copied, setCopied] = useState(false);

  // Secure token / invite link based on current domain
  const inviteLink = `${window.location.origin}/join/${group.id}`;
  const whatsappMessage = encodeURIComponent(
    `Hey! Join our expense group "${group.name}" on SplitMate to track trip bills and settlements: ${inviteLink}`
  );
  const whatsappUrl = `https://api.whatsapp.com/send?text=${whatsappMessage}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    toast.success('Invitation link copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Invite Friends to Group"
      description={`Share this invite link with friends joining ${group.name}`}
      maxWidth="md"
    >
      <div className="space-y-5">
        {/* Invite link input */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-foreground">Shareable Invite Link</label>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="h-9 flex-1 rounded-lg border border-border bg-card-elevated px-3 text-xs text-foreground font-mono select-all focus:outline-none"
            />
            <Button size="sm" variant="outline" onClick={handleCopy} className="shrink-0">
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1 text-positive" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  <span>Copy</span>
                </>
              )}
            </Button>
          </div>
        </div>

        {/* WhatsApp & Social Share */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-foreground">Quick Share</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-[#25D366]/15 hover:bg-[#25D366]/25 text-[#25D366] text-xs font-semibold border border-[#25D366]/30 transition-colors"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Share via WhatsApp</span>
            </a>

            <button
              onClick={handleCopy}
              className="flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl bg-primary-muted hover:bg-primary-muted/80 text-primary text-xs font-semibold border border-primary/20 transition-colors"
            >
              <Share2 className="h-4 w-4" />
              <span>Copy Direct Link</span>
            </button>
          </div>
        </div>

        {/* Group Code Info */}
        <div className="p-3 bg-card-elevated/50 rounded-xl border border-border text-xs space-y-1">
          <span className="text-foreground-muted">Group Invitation Code:</span>
          <div className="font-mono font-bold text-foreground tracking-wide text-sm">
            {group.id}
          </div>
          <p className="text-[11px] text-foreground-muted">
            Friends can also join by clicking "Join with code" on their dashboard and pasting this code.
          </p>
        </div>

        <div className="flex justify-end pt-2">
          <Button size="sm" variant="outline" onClick={onClose}>
            Done
          </Button>
        </div>
      </div>
    </Modal>
  );
};

