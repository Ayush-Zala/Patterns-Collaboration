import { Input } from "@/components/ui/input";
import { Search, Users } from "lucide-react";

interface GroupData {
  id: string;
  name: string;
  memberCount: number;
}

export function TeammateGroupsTab({ groups }: { groups: GroupData[] }) {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-muted/50 border-border text-foreground focus-visible:ring-1 focus-visible:ring-zinc-700 h-9 rounded-md"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-background overflow-hidden min-h-[400px]">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-border">
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Teammate group</th>
              <th className="py-4 px-6 text-xs font-semibold text-muted-foreground">Number of members</th>
            </tr>
          </thead>
          <tbody>
            {groups && groups.length > 0 ? (
              groups.map((group) => (
                <tr key={group.id} className="border-b border-border hover:bg-white/5 transition-colors group">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Users className="size-4 text-muted-foreground" />
                      </div>
                      <div className="text-sm font-medium text-foreground">{group.name}</div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="text-sm text-muted-foreground">
                      {group.memberCount}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={2} className="py-12 text-center text-muted-foreground text-sm">
                  No teammate groups found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
