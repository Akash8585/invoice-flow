// src/components/user-bar.tsx
"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { signOut, useSession } from "@/lib/auth/auth-client"

import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function UserBar() {
  const router = useRouter()
  const { data: session, isPending } = useSession()

  if (isPending || !session) return null

  const user = session.user

  const handleSignOut = async () => {
    await signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/")
        },
      },
    })
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-3 w-full rounded-lg px-3 py-2 hover:bg-muted transition-colors">
          <Avatar className="h-8 w-8 flex-shrink-0">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name ?? "Avatar"} />
            ) : (
              <AvatarFallback className="text-xs">
                {(user.name ?? user.email)[0]?.toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1 min-w-0 text-left">
            <div className="text-sm font-medium truncate">
              {user.name || "User"}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {user.email}
            </div>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="space-y-0.5 pb-2">
          <div className="text-sm font-medium">{user.name || "User"}</div>
          <div className="text-xs text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
