import { Loader2 } from "lucide-react";

export function SettingsSkeleton() {
    return (
        <div className="flex items-center justify-center p-24 w-full h-full">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
        </div>
    );
}
