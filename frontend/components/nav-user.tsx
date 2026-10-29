"use client"

import { useState } from "react"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { Switch } from "@/components/ui/switch"
import { 
  ChevronsUpDown, 
  Bell, 
  BellOff, 
  MinusCircle, 
  Info, 
  ArrowUpRight, 
  LogOut,
  Check
} from "lucide-react"
import { cn } from "@/lib/utils"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const [status, setStatus] = useState<"available" | "busy" | "ooo">("available")
  const [muteAll, setMuteAll] = useState(false)
  const [scheduledMute, setScheduledMute] = useState(false)

  const getStatusColor = () => {
    switch(status) {
      case "available": return "bg-green-500"
      case "busy": return "bg-orange-500"
      case "ooo": return "bg-red-500"
    }
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              <div className="relative">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-red-500 text-white font-bold">
                    {user.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-sidebar-background", getStatusColor())} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold">{user.name}</span>
                <span className="truncate text-xs text-muted-foreground">@{user.name.toLowerCase().replace(" ", "_")}</span>
              </div>
              <ChevronsUpDown className="ml-auto size-4 text-muted-foreground" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-64 rounded-xl border-border bg-popover p-1 shadow-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="relative">
                <Avatar className="h-10 w-10 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.name} />
                  <AvatarFallback className="rounded-lg bg-red-500 text-white font-bold text-lg">
                    {user.name.split(" ").map(n => n[0]).join("")}
                  </AvatarFallback>
                </Avatar>
                <div className={cn("absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full border-2 border-popover", getStatusColor())} />
              </div>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-bold text-[15px]">{user.name}</span>
                <span className="truncate text-xs text-indigo-400 font-medium">@{user.name.toLowerCase().replace(" ", "_")}</span>
              </div>
            </div>

            <DropdownMenuSeparator className="bg-border/50" />

            <DropdownMenuGroup className="py-1">
              <DropdownMenuItem 
                onSelect={(e) => { e.preventDefault(); setStatus("available") }}
                className="flex items-center justify-between cursor-pointer rounded-md px-2 py-1.5 focus:bg-sidebar-accent"
              >
                <div className="flex items-center gap-2.5">
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-green-500 text-white">
                    <Bell className="h-3 w-3 fill-current" />
                  </div>
                  <span className="font-bold text-sm">Available</span>
                </div>
                {status === "available" && <Check className="h-4 w-4 text-indigo-500" />}
              </DropdownMenuItem>

              <DropdownMenuItem 
                onSelect={(e) => { e.preventDefault(); setStatus("busy") }}
                className="flex items-center justify-between cursor-pointer rounded-md px-2 py-1.5 focus:bg-sidebar-accent"
              >
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="flex items-center justify-center w-5">
                    <div className="relative">
                      <BellOff className="h-3.5 w-3.5 text-orange-500" />
                      <div className="absolute -bottom-0.5 -right-0.5 h-[9px] w-[9px] rounded-full bg-background flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                      </div>
                    </div>
                  </div>
                  <span className="font-medium">Busy</span>
                </div>
                {status === "busy" && <Check className="h-4 w-4 text-indigo-500" />}
              </DropdownMenuItem>

              <DropdownMenuItem 
                onSelect={(e) => { e.preventDefault(); setStatus("ooo") }}
                className="flex items-center justify-between cursor-pointer rounded-md px-2 py-1.5 focus:bg-sidebar-accent"
              >
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="flex items-center justify-center w-5">
                    <MinusCircle className="h-3.5 w-3.5 text-red-500" />
                  </div>
                  <span className="font-medium">Out of office</span>
                </div>
                {status === "ooo" && <Check className="h-4 w-4 text-indigo-500" />}
              </DropdownMenuItem>
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border/50" />

            <DropdownMenuGroup className="py-1 space-y-1">
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()}
                className="flex items-center justify-between cursor-pointer rounded-md px-2 py-1.5 focus:bg-sidebar-accent"
              >
                <span className="font-bold text-sm">Mute notifications</span>
                <Switch 
                  checked={muteAll} 
                  onCheckedChange={setMuteAll} 
                />
              </DropdownMenuItem>
              
              <DropdownMenuItem 
                onSelect={(e) => e.preventDefault()}
                className="flex items-center justify-between cursor-pointer rounded-md px-2 py-1.5 focus:bg-sidebar-accent"
              >
                <span className="font-bold text-sm">Scheduled mute notifications</span>
                <Switch 
                  checked={scheduledMute} 
                  onCheckedChange={setScheduledMute} 
                />
              </DropdownMenuItem>

              {scheduledMute && (
                <div className="px-2 py-2 flex items-center gap-2 text-xs font-bold text-muted-foreground animate-in fade-in zoom-in-95 duration-200">
                  <div className="bg-muted px-2 py-1.5 rounded-md text-foreground">6:00 PM</div>
                  <span>to</span>
                  <div className="bg-muted px-2 py-1.5 rounded-md text-foreground">9:00 AM</div>
                  <span className="ml-1">GMT+5:30</span>
                </div>
              )}
            </DropdownMenuGroup>

            <DropdownMenuSeparator className="bg-border/50" />

            <DropdownMenuGroup className="py-1">
              <DropdownMenuItem 
                onClick={() => { window.location.href = "/login" }}
                className="flex items-center cursor-pointer rounded-md px-2 py-1.5 focus:bg-sidebar-accent"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span className="font-bold text-sm">Sign out</span>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
