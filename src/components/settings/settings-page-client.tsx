"use client";

import { LogOut, Trash2 } from "lucide-react";
import { useState } from "react";

import { logoutAction } from "@/app/actions/auth";
import { AppearanceSection } from "@/components/settings/appearance-section";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";
import { PasswordForm } from "@/components/settings/password-form";
import { PreferencesForm } from "@/components/settings/preferences-form";
import { ProfileForm } from "@/components/settings/profile-form";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { SettingsDTO } from "@/lib/services/settings";

export function SettingsPageClient({ initial }: { initial: SettingsDTO }) {
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <section className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Paramètres</h1>
        <p className="text-muted-foreground">
          Profil, préférences, apparence, sécurité et compte.
        </p>
      </div>

      <Card id="profil">
        <CardHeader>
          <CardTitle>Profil</CardTitle>
          <CardDescription>
            Prénom, nom, email et avatar affichés dans l&apos;application.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm initial={initial} />
        </CardContent>
      </Card>

      <Card id="preferences">
        <CardHeader>
          <CardTitle>Préférences</CardTitle>
          <CardDescription>
            Devise unique (Ariary), langue et format de date de votre espace.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PreferencesForm initial={initial} />
        </CardContent>
      </Card>

      <Card id="apparence">
        <CardHeader>
          <CardTitle>Apparence</CardTitle>
          <CardDescription>
            Thème clair, sombre ou synchronisé avec votre système.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AppearanceSection />
        </CardContent>
      </Card>

      <Card id="securite">
        <CardHeader>
          <CardTitle>Sécurité</CardTitle>
          <CardDescription>
            Mot de passe et session en cours.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <PasswordForm hasPassword={initial.hasPassword} />
          <div className="flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium">Déconnexion</p>
              <p className="text-sm text-muted-foreground">
                Fermer la session sur cet appareil.
              </p>
            </div>
            <form action={logoutAction}>
              <Button variant="outline" type="submit">
                <LogOut className="size-4" aria-hidden="true" />
                Se déconnecter
              </Button>
            </form>
          </div>
        </CardContent>
      </Card>

      <Card id="compte" className="border-destructive/50">
        <CardHeader>
          <CardTitle className="text-destructive">Compte</CardTitle>
          <CardDescription>
            Suppression définitive du compte et de toutes les données
            associées.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            Irréversible : une confirmation par email et mot de passe est
            exigée.
          </p>
          <Button
            variant="destructive"
            type="button"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            Supprimer mon compte
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountDialog
        currentEmail={initial.email}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </section>
  );
}
