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
  // adjust this destructuring to whatever useSession actually returns —
  // often it’s either { data: session, isLoading } or { session, isLoading }.
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
        <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-muted">
          <Avatar className="h-8 w-8">
            {user.image ? (
              <AvatarImage src={user.image} alt={user.name ?? "Avatar"} />
            ) : (
              <AvatarFallback>{(user.name ?? user.email)[0]}</AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium">
            {user.name ?? user.email}
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="space-y-0.5 pb-2">
          <div className="text-sm">{user.name}</div>
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
