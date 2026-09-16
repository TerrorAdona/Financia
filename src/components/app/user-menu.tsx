"use client";

import Link from "next/link";
import { ChevronsUpDown, LogOut, Settings, User } from "lucide-react";

import { logoutAction } from "@/app/actions/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { getInitials, type ShellUser } from "@/components/app/shell-user";

export function UserMenu({ user }: { user: ShellUser }) {
  const displayName = user.name ?? user.email ?? "Utilisateur";

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                tooltip={displayName}
              />
            }
          >
            <Avatar className="size-8 rounded-lg">
              {user.image ? (
                <AvatarImage
                  src={user.image}
                  alt=""
                  className="rounded-lg"
                />
              ) : null}
              <AvatarFallback className="rounded-lg">
                {getInitials(user.name, user.email)}
              </AvatarFallback>
            </Avatar>
            <span className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{displayName}</span>
              <span className="truncate text-xs text-muted-foreground">
                {user.email}
              </span>
            </span>
            <ChevronsUpDown className="ml-auto size-4" aria-hidden="true" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-56 rounded-lg"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="size-8 rounded-lg">
                  {user.image ? (
                    <AvatarImage
                      src={user.image}
                      alt=""
                      className="rounded-lg"
                    />
                  ) : null}
                  <AvatarFallback className="rounded-lg">
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{displayName}</span>
                  <span className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <User className="size-4" aria-hidden="true" />
                Mon compte
              </DropdownMenuItem>
              <DropdownMenuItem render={<Link href="/settings" />}>
                <Settings className="size-4" aria-hidden="true" />
                Paramètres
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              closeOnClick={false}
              render={
                <form
                  action={logoutAction}
                  className="flex w-full items-center gap-2"
                />
              }
            >
              <LogOut className="size-4" aria-hidden="true" />
              <button type="submit" className="flex-1 text-left">
                Déconnexion
              </button>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
