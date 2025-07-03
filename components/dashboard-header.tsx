"use client"

import { useSession, signOut } from "next-auth/react"
import {
  IconLogout,
  IconUserCircle,
  IconCreditCard,
  IconNotification,
  IconDotsVertical,
} from "@tabler/icons-react"
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
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

import Logo from "@/components/logo"

export default function DashboardHeader() {
  const { data: session, status } = useSession()

  const handleLogout = async () => {
    await signOut({ callbackUrl: "/" })
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10 shadow-lg h-16 sm:h-20">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 lg:px-8">
        <div className="flex justify-between items-center py-3 sm:py-4">
          <Logo />
          <div className="flex items-center space-x-1 sm:space-x-2 md:space-x-4">
            
            {/* User Profile Section */}
            {status === "loading" ? (
              <div className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4 py-2 sm:py-3 rounded-lg bg-white/10 backdrop-blur-sm animate-pulse h-10 sm:h-14 w-32 sm:w-48 md:w-72 "></div>
            ) : session?.user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 sm:space-x-3 px-2 sm:px-4 py-2 sm:py-3 rounded-lg bg-black/10  backdrop-blur-sm border border-white/20 h-10 sm:h-14"
                  >
                    <Avatar className="h-6 w-6 sm:h-8 sm:w-8 md:h-12 md:w-12 rounded-full border border-white/20">
                      <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                      <AvatarFallback className="rounded-full bg-white/20 text-white text-xs">
                        {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden sm:flex flex-col text-xs sm:text-sm min-w-0 flex-1 text-left">
                      <span className="font-medium text-white truncate">
                        {session.user.name || "User"}
                      </span>
                      <span className="text-white/70 text-xs truncate hidden md:block">
                        {session.user.email || "No email"}
                      </span>
                    </div>
                    <IconDotsVertical className="ml-auto h-4 w-4 text-white" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  className="w-56 rounded-lg bg-black/90 backdrop-blur-md border-white/20"
                  side="bottom"
                  align="end"
                  sideOffset={4}
                >
                  <DropdownMenuLabel className="p-0 font-normal">
                    <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                      <Avatar className="h-8 w-8 rounded-lg">
                        <AvatarImage src={session.user.image || ""} alt={session.user.name || "User"} />
                        <AvatarFallback className="rounded-lg bg-white/20 text-white">
                          {session.user.name?.charAt(0) || session.user.email?.charAt(0) || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="grid flex-1 text-left text-sm leading-tight">
                        <span className="truncate font-medium text-white">
                          {session.user.name || "User"}
                        </span>
                        <span className="text-white/70 truncate text-xs">
                          {session.user.email || "No email"}
                        </span>
                      </div>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuGroup>
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      <IconUserCircle className="mr-2 h-4 w-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      <IconCreditCard className="mr-2 h-4 w-4" />
                      Billing
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-white hover:bg-white/10">
                      <IconNotification className="mr-2 h-4 w-4" />
                      Notifications
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator className="bg-white/20" />
                  <DropdownMenuItem 
                    className="text-white hover:bg-white/10"
                    onClick={handleLogout}
                  >
                    <IconLogout className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}

          </div>
        </div>
      </div>
    </header>
  )
} 