import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { X, Smartphone, ShieldCheck, Copy, Check } from "lucide-react";

interface PairingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PairingPayload {
  version: number;
  public_key: string;
  auth_token: string;
  port: number;
  qr_svg: string;
}

export function PairingModal({ isOpen, onClose }: PairingModalProps) {
  const [data, setData] = useState<PairingPayload | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && !data) {
      invoke<PairingPayload>("get_pairing_qr")
        .then(setData)
        .catch(console.error);
    }
  }, [isOpen, data]);
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);


  if (!isOpen) return null;

  const handleCopyKey = () => {
    if (data?.public_key) {
      navigator.clipboard.writeText(data.public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div onClick={onClose} className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs select-none">
      <div onClick={(e) => e.stopPropagation()} className="relative w-[420px] rounded-xl bg-[#111214] border border-[#26272b] p-6 shadow-2xl text-xs text-neutral-300">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded hover:bg-neutral-800 text-neutral-400 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
            <Smartphone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neutral-100">Pair Mobile Companion</h3>
            <p className="text-[11px] text-neutral-500 font-mono">Tailscale P2P / E2EE Tunnel</p>
          </div>
        </div>

        <p className="text-neutral-400 text-[11px] leading-relaxed mb-4">
          Scan this QR Code with your Hydra Mobile Companion app to supervise agent state, approve tools, and monitor terminals.
        </p>

        {/* QR Code Container */}
        <div className="flex justify-center mb-4 p-4 rounded-xl bg-[#0c0d0e] border border-[#222]">
          {data ? (
            <div 
              className="w-[200px] h-[200px] [&>svg]:w-full [&>svg]:h-full"
              dangerouslySetInnerHTML={{ __html: data.qr_svg }}
            />
          ) : (
            <div className="w-[200px] h-[200px] flex items-center justify-center text-neutral-600 font-mono text-[11px]">
              Generating Curve25519 Keypair...
            </div>
          )}
        </div>

        {/* E2EE Info & Token */}
        <div className="space-y-2 text-[11px] font-mono">
          <div className="flex items-center justify-between p-2 rounded bg-neutral-950 border border-neutral-800 text-neutral-400">
            <span className="flex items-center gap-1 text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>x25519 Public Key:</span>
            </span>
            <button 
              onClick={handleCopyKey}
              className="flex items-center gap-1 hover:text-white text-neutral-400 transition"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>{data?.public_key.slice(0, 8)}...</span>
            </button>
          </div>
          <div className="flex justify-between px-1 text-[10px] text-neutral-500">
            <span>Daemon Port: {data?.port ?? 8989}</span>
            <span>Zero-Cloud P2P</span>
          </div>
        </div>
      </div>
    </div>
  );
}
