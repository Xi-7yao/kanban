import { X, CheckCircle, AlertCircle } from "lucide-react";

interface Props {
    message: string;
    type: "success" | "error";
    onClose: () => void;
}

function Toast({ message, type, onClose }: Props) {
    return (
        <div
            className={`flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border min-w-[300px] max-w-[420px] animate-in slide-in-from-right duration-200 ${
                type === "error"
                    ? "bg-red-500/10 border-red-500/30 text-red-400"
                    : "bg-green-500/10 border-green-500/30 text-green-400"
            }`}
        >
            {type === "error" ? <AlertCircle size={18} /> : <CheckCircle size={18} />}
            <p className="flex-1 text-sm">{message}</p>
            <button
                onClick={onClose}
                className="text-gray-500 hover:text-white transition"
            >
                <X size={14} />
            </button>
        </div>
    );
}

export default Toast;
